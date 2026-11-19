import "server-only";

import { createHash, createHmac } from "node:crypto";
import { isIP } from "node:net";
import {
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

const LIMITS: Record<Bucket, number> = {
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

/**
 * The caller's IP.
 *
 * On Vercel: `x-real-ip` (fallback: first `x-forwarded-for` entry). Vercel's edge
 * OVERWRITES both headers with the real client address, so clients cannot spoof them.
 *
 * Anywhere else (next dev, next start, other hosts): the same headers are read, but
 * Next.js passes whatever the client sent straight through, so a client can set
 * `X-Forwarded-For: <anything>` and get a fresh limit per request. That is acceptable
 * locally (tests rely on it) but NOT in production outside Vercel without a proxy that
 * overwrites these headers.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for")?.split(",")[0];
  const xri = headers.get("x-real-ip");
  const raw = process.env.VERCEL === "1" ? (xri ?? xff) : (xff ?? xri);
  return normalizeIp(raw) ?? "unknown";
}

/**
 * Canonical form used for the key:
 *  - strips ports/brackets, lowercases, unwraps IPv4-mapped IPv6
 *  - IPv6 is reduced to its /64 prefix, because one user typically controls a whole /64
 *    and could otherwise rotate addresses to dodge the limit
 */
function normalizeIp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let ip = raw.trim();
  const bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(ip);
  if (bracketed) ip = bracketed[1];
  else if (/^\d{1,3}(\.\d{1,3}){3}:\d+$/.test(ip)) ip = ip.replace(/:\d+$/, "");
  ip = ip.toLowerCase().split("%")[0]; // drop IPv6 zone id
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(ip);
  if (mapped) ip = mapped[1];

  const version = isIP(ip);
  if (version === 4) return ip;
  if (version === 6) return ipv6Prefix64(ip);
  return null;
}

function ipv6Prefix64(ip: string): string {
  let groups: string[];
  if (ip.includes("::")) {
    const [head, tail] = ip.split("::");
    const h = head ? head.split(":") : [];
    const t = tail ? tail.split(":") : [];
    groups = [...h, ...Array<string>(Math.max(0, 8 - h.length - t.length)).fill("0"), ...t];
  } else {
    groups = ip.split(":");
  }
  return groups.slice(0, 4).map((g) => parseInt(g || "0", 16).toString(16)).join(":") + "::/64";
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

/** Counts this request, then checks it: limited once the count goes OVER the limit. */
export async function consume(bucket: Bucket, ip: string): Promise<RateResult> {
  const row = await call("rate_limit_hit", bucket, ip);
  if (!row) return { kind: "error" };
  return row.hits > LIMITS[bucket] ? { kind: "limited", retryAfter: secondsUntil(row.reset_at) } : { kind: "ok" };
}

/** Checks without counting: limited once the count has REACHED the limit. */
export async function isBlocked(bucket: Bucket, ip: string): Promise<RateResult> {
  const row = await call("rate_limit_peek", bucket, ip);
  if (!row) return { kind: "error" };
  return row.hits >= LIMITS[bucket] ? { kind: "limited", retryAfter: secondsUntil(row.reset_at) } : { kind: "ok" };
}

/** Counts an event (e.g. a failed lookup) without checking. Errors are logged only. */
export async function record(bucket: Bucket, ip: string): Promise<void> {
  await call("rate_limit_hit", bucket, ip);
}
