import "server-only";

import { capacityFrom, checkCapacity, type CapacityResult } from "@/lib/capacity";
import { getClipByCode, type NewClipInput } from "@/lib/clips";
import { MAX_MONTHLY_DOWNLOAD_BYTES, RATE_LIMITS, RATE_LIMIT_WINDOW_SECONDS } from "@/lib/config";
import { reserveDownload } from "@/lib/egress";
import { fastRpc } from "@/lib/fastRpc";
import {
  LIMITS,
  afterHit,
  consume,
  isBlocked,
  rateLimitKey,
  record,
  rememberBlock,
  rememberedBlock,
  retryAfterFrom,
  type RateResult,
} from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * The checks that run before each API action: rate limits, caps, and finding the clip.
 * Each one first tries ONE call to a combined Postgres function (db/005_fast_paths.sql),
 * and otherwise (005 not applied, or any error) runs the original step-by-step calls.
 * Both paths make the same decisions in the same order; tests cover both.
 */

const W = RATE_LIMIT_WINDOW_SECONDS;

/**
 * Failed-lookup arguments, incl. the site-wide ceiling used by the db/006 (_v2) functions.
 * The global counter is a normal rate_limits row under a fixed hashed key (never an IP).
 */
function failArgs(ip: string) {
  return {
    p_fail_key: rateLimitKey("lookup-fail", ip),
    p_fail_limit: LIMITS["lookup-fail"],
    p_strict_limit: RATE_LIMITS.lookupFailuresStrict,
    p_global_key: rateLimitKey("lookup-fail", "global"),
    p_global_threshold: RATE_LIMITS.globalLookupFailures,
  };
}

/** Tries the db/006 (_v2, with the ceiling) function, then the db/005 one; null = neither available. */
async function v2ThenV1<T>(name: string, v2Args: Record<string, unknown>, v1Args: Record<string, unknown>): Promise<T | null> {
  return (await fastRpc<T>(`${name}_v2`, v2Args)) ?? (await fastRpc<T>(name, v1Args));
}

// ---------------------------------------------------------------- POST /api/clips

export type CreateGate = {
  create: RateResult;
  /** Only for a valid file request whose create check passed. */
  file: RateResult | null;
  /** Only for a valid request whose rate checks passed. */
  capacity: CapacityResult | null;
};

/**
 * Rate limits + global caps for a create. `input` is null when the body was invalid:
 * the attempt still counts against "create" (as before), but nothing else is checked.
 */
export async function createGate(ip: string, input: NewClipInput | null): Promise<CreateGate> {
  const known = rememberedBlock("create", ip); // refused earlier in this window: no DB trip
  if (known) return { create: known, file: null, capacity: null };
  const withFile = !!input?.file;
  const fast = await fastRpc<{
    create_hits: number;
    create_reset: string;
    file_hits: number | null;
    file_reset: string | null;
    live_clips: number | string | null;
    live_bytes: number | string | null;
  }>("clip_create_gate", {
    p_create_key: rateLimitKey("create", ip),
    p_create_limit: LIMITS.create,
    p_file_key: withFile ? rateLimitKey("create-file", ip) : null,
    p_file_limit: LIMITS["create-file"],
    p_window_seconds: W,
    p_with_usage: input !== null,
  });

  if (fast) {
    const create = rememberBlock("create", ip, afterHit("create", fast.create_hits, fast.create_reset), fast.create_reset);
    if (create.kind !== "ok" || !input) return { create, file: null, capacity: null };
    const file =
      withFile && fast.file_hits !== null
        ? rememberBlock("create-file", ip, afterHit("create-file", fast.file_hits, fast.file_reset!), fast.file_reset)
        : null;
    if (file && file.kind !== "ok") return { create, file, capacity: null };
    const capacity =
      fast.live_clips === null ? "error" : capacityFrom(Number(fast.live_clips), Number(fast.live_bytes), input.file?.size ?? 0);
    return { create, file, capacity };
  }

  // Original order: create → (file) → capacity, stopping at the first refusal.
  const create = await consume("create", ip);
  if (create.kind !== "ok" || !input) return { create, file: null, capacity: null };
  let file: RateResult | null = null;
  if (withFile) {
    file = await consume("create-file", ip);
    if (file.kind !== "ok") return { create, file, capacity: null };
  }
  return { create, file, capacity: await checkCapacity(input.file?.size ?? 0) };
}

// ---------------------------------------------------------------- GET /api/clips/[code]

export type LookupResult =
  | { kind: "limited"; retryAfter: number }
  | { kind: "not_found" }
  | {
      kind: "ok";
      clip: { text: string | null; fileName: string | null; fileSize: number | null; createdAt: string; expiresAt: string };
    };

/** Throws on a database error (the route answers 500, as before). */
export async function lookupClip(ip: string, code: string): Promise<LookupResult> {
  const known = rememberedBlock("lookup-fail", ip);
  if (known?.kind === "limited") return known;
  const fast = await v2ThenV1<{
    status: "blocked" | "not_found" | "ok";
    reset_at: string | null;
    out_text: string | null;
    out_file_name: string | null;
    out_file_size: number | string | null;
    out_created_at: string;
    out_expires_at: string;
  }>(
    "clip_lookup",
    { ...failArgs(ip), p_window_seconds: W, p_code: code },
    { p_fail_key: rateLimitKey("lookup-fail", ip), p_fail_limit: LIMITS["lookup-fail"], p_window_seconds: W, p_code: code },
  );

  if (fast) {
    if (fast.status === "blocked") return blockedBy("lookup-fail", ip, fast.reset_at!);
    if (fast.status === "not_found") return { kind: "not_found" };
    return {
      kind: "ok",
      clip: {
        text: fast.out_text,
        fileName: fast.out_file_name,
        fileSize: fast.out_file_size === null ? null : Number(fast.out_file_size),
        createdAt: fast.out_created_at,
        expiresAt: fast.out_expires_at,
      },
    };
  }

  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow (reads stay up)
  if (blocked.kind === "limited") return blocked;
  const clip = await getClipByCode(code);
  if (!clip) {
    await record("lookup-fail", ip);
    return { kind: "not_found" };
  }
  return {
    kind: "ok",
    clip: { text: clip.textContent, fileName: clip.fileName, fileSize: clip.fileSize, createdAt: clip.createdAt, expiresAt: clip.expiresAt },
  };
}

// ---------------------------------------------------------------- POST /complete, GET /download

export type FileClipRow = { id: string; file_path: string; ready: boolean };

export type CompleteGate =
  | { kind: "limited"; retryAfter: number }
  | { kind: "not_found" }
  | { kind: "ok"; row: FileClipRow };

/** Failed-lookup block → "complete" limit → the live file clip (ready or pending). Throws on a lookup error. */
export async function completeGate(ip: string, code: string): Promise<CompleteGate> {
  const known = rememberedBlock("lookup-fail", ip) ?? rememberedBlock("complete", ip);
  if (known?.kind === "limited") return known;
  const op = { p_op_key: rateLimitKey("complete", ip), p_op_limit: LIMITS.complete, p_window_seconds: W, p_code: code };
  const fast = await v2ThenV1<{
    status: "blocked" | "limited" | "not_found" | "ok";
    reset_at: string | null;
    out_id: string | null;
    out_file_path: string | null;
    out_ready: boolean | null;
  }>(
    "clip_complete_gate",
    { ...failArgs(ip), ...op },
    { p_fail_key: rateLimitKey("lookup-fail", ip), p_fail_limit: LIMITS["lookup-fail"], ...op },
  );

  if (fast) {
    if (fast.status === "blocked") return blockedBy("lookup-fail", ip, fast.reset_at!);
    if (fast.status === "limited") return blockedBy("complete", ip, fast.reset_at!);
    if (fast.status === "not_found") return { kind: "not_found" };
    return { kind: "ok", row: { id: fast.out_id!, file_path: fast.out_file_path!, ready: fast.out_ready! } };
  }

  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow
  if (blocked.kind === "limited") return blocked;
  const limit = await consume("complete", ip); // DB error -> allow
  if (limit.kind === "limited") return limit;

  const { data: row, error } = await supabaseAdmin
    .from("clips")
    .select("id, file_path, ready")
    .eq("code", code)
    .not("file_path", "is", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<FileClipRow>();
  if (error) throw new Error(`Complete lookup failed: ${error.code} ${error.message}`);
  if (!row) {
    await record("lookup-fail", ip);
    return { kind: "not_found" };
  }
  return { kind: "ok", row };
}

export type DownloadGate =
  | { kind: "limited"; retryAfter: number }
  | { kind: "not_found" }
  | { kind: "paused" }
  | { kind: "ok"; filePath: string; fileName: string | null };

/**
 * Failed-lookup block → "download" limit → the live, ready file clip → reserve its size
 * in this month's download budget. Throws on a lookup error.
 */
export async function downloadGate(ip: string, code: string): Promise<DownloadGate> {
  const known = rememberedBlock("lookup-fail", ip) ?? rememberedBlock("download", ip);
  if (known?.kind === "limited") return known;
  const op = {
    p_op_key: rateLimitKey("download", ip),
    p_op_limit: LIMITS.download,
    p_window_seconds: W,
    p_code: code,
    p_month_limit_bytes: MAX_MONTHLY_DOWNLOAD_BYTES,
  };
  const fast = await v2ThenV1<{
    status: "blocked" | "limited" | "not_found" | "paused" | "ok";
    reset_at: string | null;
    out_file_path: string | null;
    out_file_name: string | null;
  }>(
    "clip_download_gate",
    { ...failArgs(ip), ...op },
    { p_fail_key: rateLimitKey("lookup-fail", ip), p_fail_limit: LIMITS["lookup-fail"], ...op },
  );

  if (fast) {
    if (fast.status === "blocked") return blockedBy("lookup-fail", ip, fast.reset_at!);
    if (fast.status === "limited") return blockedBy("download", ip, fast.reset_at!);
    if (fast.status === "not_found") return { kind: "not_found" };
    if (fast.status === "paused") return { kind: "paused" };
    return { kind: "ok", filePath: fast.out_file_path!, fileName: fast.out_file_name };
  }

  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow
  if (blocked.kind === "limited") return blocked;
  const limit = await consume("download", ip); // DB error -> allow
  if (limit.kind === "limited") return limit;

  const { data: row, error } = await supabaseAdmin
    .from("clips")
    .select("file_path, file_name, file_size")
    .eq("code", code)
    .eq("ready", true)
    .not("file_path", "is", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ file_path: string; file_name: string | null; file_size: number | null }>();
  if (error) throw new Error(`Download lookup failed: ${error.code} ${error.message}`);
  if (!row) {
    await record("lookup-fail", ip);
    return { kind: "not_found" };
  }
  if ((await reserveDownload(Number(row.file_size ?? 0))) === "paused") return { kind: "paused" };
  return { kind: "ok", filePath: row.file_path, fileName: row.file_name };
}

/** A refusal from the database, remembered so repeats skip the database (lib/rateLimit.ts). */
function blockedBy(bucket: "lookup-fail" | "complete" | "download", ip: string, resetAt: string): { kind: "limited"; retryAfter: number } {
  rememberBlock(bucket, ip, { kind: "limited", retryAfter: retryAfterFrom(resetAt) }, resetAt);
  return { kind: "limited", retryAfter: retryAfterFrom(resetAt) };
}
