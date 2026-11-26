/**
 * Facts shared by the Terms and Privacy pages that are NOT server config.
 * Keep them true: when hosting moves, change HOSTING here and re-read /privacy.
 * Since 2026-11-24 the live site runs on Netlify (Vercel is only a dormant fallback).
 */
export const HOSTING = {
  web: "Netlify",
  data: "Supabase",
} as const;

/** Shown at the top of /terms and /privacy. Update when the text changes meaningfully. */
export const LEGAL_LAST_UPDATED = "2026-11-26";

/**
 * Owner-provided details. Every placeholder (double square brackets starting with ADD) must be
 * replaced before the site is indexable:
 * `npm run build` fails on a real domain while any remain (scripts/check-placeholders.ts).
 */
export const OWNER = {
  /** Who runs the site (person or pseudonym). Shown on About and Privacy. */
  name: "Vinay Ippakayala",
  /** Whose law applies to the Terms. */
  governingLaw: "India",
} as const;
