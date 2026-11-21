import "server-only";

import { MAX_TEXT_LENGTH } from "@/lib/clips";
import {
  ABUSE_CONTACT_EMAIL,
  CLIP_EXPIRY_MINUTES,
  CONTACT_EMAIL,
  MAX_FILE_SIZE_MB,
  RATE_LIMITS,
  RATE_LIMIT_WINDOW_SECONDS,
} from "@/lib/config";
import { adsActive } from "@/lib/ads";
import { DOWNLOAD_URL_TTL_SECONDS } from "@/lib/files";

/**
 * Every number or contact detail that page copy mentions, read from server config in ONE
 * place. Pages pass these (plain values) to content, so text stays true when config changes.
 * See docs/content-guidelines.md, "Numbers come from config".
 */
export type SiteFacts = {
  maxFileMb: number;
  maxTextLength: number;
  expiryMinutes: number;
  /** Failed code lookups allowed per IP per window. */
  lookupFailures: number;
  /** Rate-limit window, in minutes. */
  rateWindowMinutes: number;
  /** How long hashed-IP counters are kept, in hours (same rule as lib/cleanup.ts). */
  rateLimitRetentionHours: number;
  /** Lifetime of a file download link, in seconds. */
  downloadLinkSeconds: number;
  abuseEmail: string | null;
  contactEmail: string | null;
  /** Ads switched on (lib/ads.ts). Changes privacy wording: see trackingClaims in content/claims.ts. */
  adsActive: boolean;
};

export function getSiteFacts(): SiteFacts {
  return {
    maxFileMb: MAX_FILE_SIZE_MB,
    maxTextLength: MAX_TEXT_LENGTH,
    expiryMinutes: CLIP_EXPIRY_MINUTES,
    lookupFailures: RATE_LIMITS.lookupFailures,
    rateWindowMinutes: Math.round(RATE_LIMIT_WINDOW_SECONDS / 60),
    rateLimitRetentionHours: Math.max(1, Math.ceil(RATE_LIMIT_WINDOW_SECONDS / 3600)),
    downloadLinkSeconds: DOWNLOAD_URL_TTL_SECONDS,
    abuseEmail: ABUSE_CONTACT_EMAIL,
    contactEmail: CONTACT_EMAIL,
    adsActive: adsActive(),
  };
}

// Small text helpers, re-exported for pages (defined in content/text.ts).
export { fmt, plural } from "@/content/text";
