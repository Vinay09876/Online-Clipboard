/**
 * Which request header holds the REAL visitor IP depends on the hosting platform. Rate limits
 * (lib/rateLimit.ts) are only as trustworthy as this choice, so it is explicit:
 *
 *   HOSTING_PROVIDER=vercel   x-real-ip (fallback: first x-forwarded-for entry).
 *                             Vercel's edge OVERWRITES both with the real client address.
 *   HOSTING_PROVIDER=netlify  x-nf-client-connection-ip ONLY. Netlify support names it as the
 *                             one supported client-IP header; Netlify sets it itself.
 *                             X-Forwarded-For / X-Real-IP are IGNORED here: Netlify does not
 *                             document that it overwrites them, so a client could fake them.
 *   HOSTING_PROVIDER=local    first x-forwarded-for entry (fallback: x-real-ip), exactly as
 *                             sent. SPOOFABLE: for `next dev` / `next start` / tests only, or
 *                             behind your own proxy that overwrites X-Forwarded-For.
 *
 * Default when unset: "vercel" if VERCEL=1 (set by Vercel), "netlify" if NETLIFY=true,
 * otherwise "local". Set it explicitly in production (docs/deploy-netlify.md).
 * No "server-only" and no config import, so tests can use it directly.
 */
import { isIP } from "node:net";

export const HOSTING_PROVIDERS = ["vercel", "netlify", "local"] as const;
export type HostingProvider = (typeof HOSTING_PROVIDERS)[number];

export type ProviderParse = { ok: true; provider: HostingProvider; explicit: boolean } | { ok: false; error: string };

/** Reads HOSTING_PROVIDER (with platform auto-detection as the fallback). */
export function parseHostingProvider(env: Record<string, string | undefined>): ProviderParse {
  const raw = env.HOSTING_PROVIDER?.trim().toLowerCase();
  if (raw) {
    if ((HOSTING_PROVIDERS as readonly string[]).includes(raw)) return { ok: true, provider: raw as HostingProvider, explicit: true };
    return { ok: false, error: `HOSTING_PROVIDER must be one of ${HOSTING_PROVIDERS.join(", ")} (got "${env.HOSTING_PROVIDER}").` };
  }
  if (env.VERCEL === "1") return { ok: true, provider: "vercel", explicit: false };
  if (env.NETLIFY === "true") return { ok: true, provider: "netlify", explicit: false };
  return { ok: true, provider: "local", explicit: false };
}

/** The raw client-IP header value for this provider (null when absent). */
export function rawClientIp(headers: Headers, provider: HostingProvider): string | null {
  const xff = headers.get("x-forwarded-for")?.split(",")[0] ?? null;
  const xri = headers.get("x-real-ip");
  switch (provider) {
    case "vercel":
      return xri ?? xff;
    case "netlify":
      return headers.get("x-nf-client-connection-ip");
    case "local":
      return xff ?? xri;
  }
}

/** Normalised client IP for rate limiting, or "unknown" when the trusted header is missing/invalid. */
export function clientIpFrom(headers: Headers, provider: HostingProvider): string {
  return normalizeIp(rawClientIp(headers, provider)) ?? "unknown";
}

/**
 * Canonical form used for the key:
 *  - strips ports/brackets, lowercases, unwraps IPv4-mapped IPv6
 *  - IPv6 is reduced to its /64 prefix, because one user typically controls a whole /64
 *    and could otherwise rotate addresses to dodge the limit
 */
export function normalizeIp(raw: string | null | undefined): string | null {
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
