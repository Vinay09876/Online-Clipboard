/**
 * Claims about how the service handles data, worded ONCE and reused by every page
 * (home, /privacy, /terms, /about, guides) so they can never drift apart.
 * Change wording here; check docs/content-guidelines.md first.
 */
import { plural } from "./text";

/**
 * How often the scheduled clean-up job runs, in minutes. NOT read from code: it is the
 * pg_cron schedule in docs/cleanup-scheduling.md (`*\/10 * * * *`). If that schedule changes,
 * change this number. Every "deleted within about N minutes" claim depends on that job
 * actually running in production.
 */
export const CLEANUP_INTERVAL_MINUTES = 10;

export const CLAIMS = {
  /** Encryption: what is and isn't protected. */
  encryption:
    "Text and files travel over HTTPS, but they are not end-to-end encrypted. Until a clip expires, it sits on our servers and our hosting providers' servers, so the people running the service could technically access it.",

  /** Rate-limit data kept about the visitor. Never claim the hash is "non-reversible". */
  ipHash: (hours: number) =>
    `a hashed form of your IP address, scrambled with a secret value so the stored data is not your readable IP, together with a request counter. It is kept for about ${plural(hours, "hour", "hours")}`,

  /** What happens at expiry. The code stops at once; deletion depends on the scheduled job. */
  deletion: `the text and file are removed by an automatic clean-up job, usually within about ${CLEANUP_INTERVAL_MINUTES} minutes after expiry`,

  /** Browser support, deliberately modest until real-device testing is confirmed. */
  browsers:
    "It is built to work in current versions of common browsers on phones and computers, with nothing to install.",
} as const;
