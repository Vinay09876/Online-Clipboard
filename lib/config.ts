import "server-only";

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

const supabaseUrl = readUrl("NEXT_PUBLIC_SUPABASE_URL");
const supabaseServiceRoleKey = readRequired("SUPABASE_SERVICE_ROLE_KEY");
const clipExpiryMinutes = readPositiveInt("CLIP_EXPIRY_MINUTES", 30, 60 * 24 * 7);
const maxFileSizeMb = readPositiveInt("MAX_FILE_SIZE_MB", 25, 1024);

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
