import "server-only";

import { parseSiteUrl } from "@/lib/site";

/**
 * Central place to read and validate environment variables.
 * Validation runs once, when this module is first imported. If anything is
 * wrong, every problem is reported together in one error.
 *
 * This module is server-only because it reads SUPABASE_SERVICE_ROLE_KEY.
 * If the UI later needs a value from here (e.g. max file size), pass it down
 * from a Server Component as a prop instead of importing this file.
 */

const errors: string[] = [];

function readRequired(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    errors.push(`${name} is missing or empty.`);
    return "";
  }
  return value;
}

function readUrl(name: string): string {
  const value = readRequired(name);
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      errors.push(`${name} must be an http(s) URL (got "${value}").`);
    } else if (url.pathname !== "/" || url.search) {
      errors.push(
        `${name} must be just the project URL, e.g. https://xxxx.supabase.co (remove "${url.pathname}${url.search}").`,
      );
    }
  } catch {
    errors.push(`${name} must be a valid URL (got "${value}").`);
  }
  return value.replace(/\/+$/, "");
}

function readPositiveInt(name: string, fallback: number, max: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > max) {
    errors.push(`${name} must be a whole number between 1 and ${max} (got "${raw}").`);
    return fallback;
  }
  return n;
}

/**
 * Optional secret: returns null when unset, so the rest of the app still works.
 * When set, it must be long enough to be unguessable.
 */
function readOptionalSecret(name: string, minLength: number): string | null {
  const value = process.env[name]?.trim();
  if (!value) return null;
  if (value.length < minLength) {
    errors.push(`${name} must be at least ${minLength} characters long.`);
    return null;
  }
  return value;
}

const supabaseUrl = readUrl("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = readRequired("SUPABASE_SERVICE_ROLE_KEY");
const clipExpiryMinutes = readPositiveInt("CLIP_EXPIRY_MINUTES", 30, 60 * 24 * 7);
const maxFileSizeMb = readPositiveInt("MAX_FILE_SIZE_MB", 25, 1024);
const cronSecret = readOptionalSecret("CRON_SECRET", 32);
const ipHashSalt = readOptionalSecret("IP_HASH_SALT", 32);

// Rate limits: max requests per client IP per window.
const rateLimitWindowSeconds = readPositiveInt("RATE_LIMIT_WINDOW_SECONDS", 600, 24 * 3600);
const rateLimitLookupFailures = readPositiveInt("RATE_LIMIT_LOOKUP_FAILURES", 10, 100_000);
const rateLimitCreates = readPositiveInt("RATE_LIMIT_CREATES", 20, 100_000);
const rateLimitFileCreates = readPositiveInt("RATE_LIMIT_FILE_CREATES", 5, 100_000);
const rateLimitFileOps = readPositiveInt("RATE_LIMIT_FILE_OPS", 30, 100_000);
const rateLimitHealth = readPositiveInt("RATE_LIMIT_HEALTH", 30, 100_000);

// Global caps (whole service).
const maxLiveClips = readPositiveInt("MAX_LIVE_CLIPS", 200, 10_000_000);
const maxTotalStorageMb = readPositiveInt("MAX_TOTAL_STORAGE_MB", 800, 1_000_000);
// Egress guard: file download bytes per calendar month (UTC). Supabase free = 5 GB egress.
const maxMonthlyDownloadMb = readPositiveInt("MAX_MONTHLY_DOWNLOAD_MB", 4000, 10_000_000);

/** Optional email setting; validated if set. */
function readOptionalEmail(name: string): string | null {
  const v = process.env[name]?.trim();
  if (!v) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
    errors.push(`${name} must be an email address (got "${v}").`);
    return null;
  }
  return v;
}

// Public contacts, shown on /contact, /terms and /privacy.
const abuseContactEmail = readOptionalEmail("ABUSE_CONTACT_EMAIL");
const contactEmail = readOptionalEmail("CONTACT_EMAIL");

// Site URL + indexing (logic lives in lib/site.ts; here we only turn mistakes into startup errors).
const siteUrlCheck = parseSiteUrl(process.env.SITE_URL);
if (!siteUrlCheck.ok) errors.push(siteUrlCheck.error);
const allowIndexing = process.env.ALLOW_INDEXING?.trim().toLowerCase();
if (allowIndexing && allowIndexing !== "true" && allowIndexing !== "false") {
  errors.push(`ALLOW_INDEXING must be "true" or "false" (got "${process.env.ALLOW_INDEXING}").`);
}

if (errors.length > 0) {
  throw new Error(
    "Invalid environment configuration:\n" +
      errors.map((e) => `  - ${e}`).join("\n") +
      "\nCheck .env.local (locally) or Project Settings → Environment Variables (Vercel). See .env.example.",
  );
}

export const SUPABASE_URL: string = supabaseUrl;
export const SUPABASE_SERVICE_ROLE_KEY: string = supabaseServiceRoleKey;
export const CLIP_EXPIRY_MINUTES: number = clipExpiryMinutes;
export const MAX_FILE_SIZE_MB: number = maxFileSizeMb;
export const MAX_FILE_SIZE_BYTES: number = maxFileSizeMb * 1024 * 1024;
/** null when not configured: /api/cron/cleanup then rejects every request. */
export const CRON_SECRET: string | null = cronSecret;
/** null when not configured: lib/rateLimit.ts then derives a salt from the service key (and warns). */
export const IP_HASH_SALT: string | null = ipHashSalt;

export const RATE_LIMIT_WINDOW_SECONDS: number = rateLimitWindowSeconds;
export const RATE_LIMITS = {
  /** Failed lookups (404) on GET /api/clips/[code], /download, /complete. */
  lookupFailures: rateLimitLookupFailures,
  /** POST /api/clips, any kind. */
  creates: rateLimitCreates,
  /** POST /api/clips with a file (in addition to `creates`). */
  fileCreates: rateLimitFileCreates,
  /** POST /complete and GET /download (each has its own counter). */
  fileOps: rateLimitFileOps,
  /** GET /api/health. */
  health: rateLimitHealth,
} as const;

export const MAX_LIVE_CLIPS: number = maxLiveClips;
export const MAX_TOTAL_STORAGE_MB: number = maxTotalStorageMb;
export const MAX_TOTAL_STORAGE_BYTES: number = maxTotalStorageMb * 1024 * 1024;

export const MAX_MONTHLY_DOWNLOAD_MB: number = maxMonthlyDownloadMb;
export const MAX_MONTHLY_DOWNLOAD_BYTES: number = maxMonthlyDownloadMb * 1024 * 1024;
/** null when not configured: /terms then shows a clearly marked placeholder. */
export const ABUSE_CONTACT_EMAIL: string | null = abuseContactEmail;
/** General contact (/contact). Falls back to ABUSE_CONTACT_EMAIL; null if neither is set. */
export const CONTACT_EMAIL: string | null = contactEmail ?? abuseContactEmail;
