import "server-only";

import { createHash, createHmac } from "node:crypto";
import { clientIpFrom } from "@/lib/clientIp";
import {
  HOSTING_PROVIDER,
  IP_HASH_SALT,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_SECONDS,
  SUPABASE_SERVICE_ROLE_KEY,
} from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Fixed-window rate limiting stored in Postgres (public.rate_limits), so it works
 * across serverless instances. Counters are keyed by "<bucket>:<HMAC(client IP)>";
 * raw IPs never leave this file.
 */

export type Bucket = "lookup-fail" | "create" | "create-file" | "complete" | "download" | "health";

export const LIMITS: Record<Bucket, number> = {
  "lookup-fail": RATE_LIMITS.lookupFailures,
  create: RATE_LIMITS.creates,
  "create-file": RATE_LIMITS.fileCreates,
  complete: RATE_LIMITS.fileOps,
  download: RATE_LIMITS.fileOps,
  health: RATE_LIMITS.health,
};

export type RateResult =
  | { kind: "ok" }
  | { kind: "limited"; retryAfter: number }
  /** The database call failed. The caller decides: allow reads, deny creates. */
  | { kind: "error" };

// ---------------------------------------------------------------------------
// Client identity
// ---------------------------------------------------------------------------

/**
 * Salt for hashing IPs. If IP_HASH_SALT is not set, derive a stable secret salt from
 * the service role key: limits keep working across instances and IPs are still never
 * stored in a reversible form. A warning is logged once per server instance.
 */
const SALT: string =
  IP_HASH_SALT ??
  (() => {
    console.warn(
      "[rateLimit] IP_HASH_SALT is not set; deriving a salt from SUPABASE_SERVICE_ROLE_KEY. " +
        "Set IP_HASH_SALT (32+ random characters) so rotating the service key doesn't reset rate limits.",
    );
    return createHash("sha256").update(`ip-hash-salt:${SUPABASE_SERVICE_ROLE_KEY}`).digest("hex");
  })();

/** Logged once per instance when the trusted client-IP header is missing. */
let warnedUnknownIp = false;

/**
 * The caller's IP, read from the header that HOSTING_PROVIDER trusts (lib/clientIp.ts:
 * x-real-ip on Vercel, x-nf-client-connection-ip on Netlify, X-Forwarded-For locally).
 * API routes call this; they don't know which platform they run on.
 */
export function getClientIp(headers: Headers): string {
  const ip = clientIpFrom(headers, HOSTING_PROVIDER);
  if (ip === "unknown" && !warnedUnknownIp && HOSTING_PROVIDER !== "local") {
    warnedUnknownIp = true;
    // Every visitor would share one "unknown" bucket: limits would hit everyone at once.
    console.error(
      `[rateLimit] no client IP in the trusted header for HOSTING_PROVIDER=${HOSTING_PROVIDER}. ` +
        "Check HOSTING_PROVIDER (docs/deploy-netlify.md).",
    );
  }
  return ip;
}

/** Exported for tests: the exact key stored in rate_limits for a bucket + IP. */
export function rateLimitKey(bucket: Bucket, ip: string): string {
  const digest = createHmac("sha256", SALT).update(ip).digest("hex").slice(0, 32);
  return `${bucket}:${digest}`;
}

// ---------------------------------------------------------------------------
// Counters
// ---------------------------------------------------------------------------

type Row = { hits: number; reset_at: string };

async function call(fn: "rate_limit_hit" | "rate_limit_peek", bucket: Bucket, ip: string): Promise<Row | null> {
  const { data, error } = await supabaseAdmin
    .rpc(fn, { p_key: rateLimitKey(bucket, ip), p_window_seconds: RATE_LIMIT_WINDOW_SECONDS })
    .single<Row>();
  if (error || !data) {
    console.error(`[rateLimit] ${fn}(${bucket}) failed:`, error?.code, error?.message);
    return null;
  }
  return data;
}

function secondsUntil(iso: string): number {
  return Math.max(1, Math.ceil((new Date(iso).getTime() - Date.now()) / 1000));
}

// ---------------------------------------------------------------------------
// Remembered blocks (Growth Step 7b)
// ---------------------------------------------------------------------------

/**
 * Once the database has refused a client for a bucket until a reset time, that stays true
 * until the reset (counts only go up within a window). Each server instance remembers it, so a
 * client hammering a refused endpoint gets the same 429 + Retry-After WITHOUT another database
 * round trip (~0.7 s of billed function time on Netlify each). Keys are the HMAC keys, never
 * raw IPs. Bounded in size; entries expire at their reset time.
 */
const remembered = new Map<string, number>(); // rate-limit key -> reset time (ms)
const MAX_REMEMBERED = 5000;

/** A remembered refusal for this bucket + client, or null. */
export function rememberedBlock(bucket: Bucket, ip: string): RateResult | null {
  const key = rateLimitKey(bucket, ip);
  const resetAt = remembered.get(key);
  if (resetAt === undefined) return null;
  if (resetAt <= Date.now()) {
    remembered.delete(key);
    return null;
  }
  return { kind: "limited", retryAfter: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) };
}

/** Remembers a refusal returned by the database (no-op for anything else). */
export function rememberBlock(bucket: Bucket, ip: string, result: RateResult, resetAtIso: string | null): RateResult {
  if (result.kind === "limited" && resetAtIso) {
    if (remembered.size >= MAX_REMEMBERED) {
      const now = Date.now();
      for (const [k, t] of remembered) if (t <= now) remembered.delete(k);
      if (remembered.size >= MAX_REMEMBERED) remembered.delete(remembered.keys().next().value!);
    }
    remembered.set(rateLimitKey(bucket, ip), new Date(resetAtIso).getTime());
  }
  return result;
}

/** Decision after counting (consume): limited once the count goes OVER the limit. */
export function afterHit(bucket: Bucket, hits: number, resetAt: string): RateResult {
  return hits > LIMITS[bucket] ? { kind: "limited", retryAfter: secondsUntil(resetAt) } : { kind: "ok" };
}

/** Retry-After seconds for a reset time returned by the database. */
export function retryAfterFrom(resetAt: string): number {
  return secondsUntil(resetAt);
}

/** Counts this request, then checks it: limited once the count goes OVER the limit. */
export async function consume(bucket: Bucket, ip: string): Promise<RateResult> {
  const known = rememberedBlock(bucket, ip);
  if (known) return known;
  const row = await call("rate_limit_hit", bucket, ip);
  if (!row) return { kind: "error" };
  return rememberBlock(bucket, ip, afterHit(bucket, row.hits, row.reset_at), row.reset_at);
}

/** Checks without counting: limited once the count has REACHED the limit. */
export async function isBlocked(bucket: Bucket, ip: string): Promise<RateResult> {
  const known = rememberedBlock(bucket, ip);
  if (known) return known;
  const row = await call("rate_limit_peek", bucket, ip);
  if (!row) return { kind: "error" };
  const result: RateResult =
    row.hits >= LIMITS[bucket] ? { kind: "limited", retryAfter: secondsUntil(row.reset_at) } : { kind: "ok" };
  return rememberBlock(bucket, ip, result, row.reset_at);
}

/** Counts an event (e.g. a failed lookup) without checking. Errors are logged only. */
export async function record(bucket: Bucket, ip: string): Promise<void> {
  await call("rate_limit_hit", bucket, ip);
}
