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

/**
 * Wording that depends on whether ads are active (lib/ads.ts → adsActive(); pages get it from
 * getSiteFacts().adsActive). Ads OFF: the site truly sets no cookies and runs no analytics,
 * and NOTHING may mention ads. Ads ON: Google's ad code can set cookies and measure ads on the
 * guide pages, so "no cookies" / "no analytics" claims must disappear everywhere.
 * e2e/ads.spec.ts scans every page in both modes for the forbidden phrases.
 */
export function trackingClaims(adsActive: boolean) {
  return adsActive
    ? {
        /** Home page, "What we keep about you" (a sentence). */
        home: "No accounts. The guide pages show ads from Google, which may use cookies; the tool itself never shows ads.",
        /** /about, "What it does not do" (list item). */
        about: "No ads in the tool. Ads from Google appear only on the guide pages and may use cookies; see the Privacy policy.",
        /** /about meta description ending. */
        aboutMeta: "no accounts, and no ads in the tool",
        /** /privacy meta description. */
        privacyMeta: "What Online Clipboard stores, for how long, and how the ads on guide pages use cookies.",
        /** "Is an online clipboard safe?" guide, "Little data about you." */
        guide: "No accounts, and no ads inside the tool itself.",
      }
    : {
        home: "No accounts, no cookies, no analytics.",
        about: "No cookies, no analytics, no tracking scripts.",
        aboutMeta: "no accounts, no tracking",
        privacyMeta: "What Online Clipboard stores, for how long, and what it never collects: no accounts, no cookies, no analytics.",
        guide: "No accounts, cookies or analytics.",
      };
}

/**
 * The Advertising section of /privacy and /terms, used ONLY while ads are active. Based on
 * AdSense's required privacy-policy content (support.google.com/adsense/answer/1348695) and
 * Google's consent requirements for the EEA, UK and Switzerland (answer/13554116).
 */
export const ADVERTISING = {
  where:
    "Some pages show ads served by Google AdSense: the guide pages and the guide list. The home page, the clipboard tool, received clips and the legal pages never show ads, and the contents of your clips are never shared with advertisers.",
  cookies:
    "Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet. Google and its partners may also use similar identifiers and your IP address to show ads, limit how often you see them and measure them.",
  explanation: { text: "How Google uses information from sites that use its services", href: "https://policies.google.com/technologies/partner-sites" },
  optOut: { text: "Google's Ads Settings", href: "https://adssettings.google.com" },
  optOutVendors: { text: "www.aboutads.info", href: "https://www.aboutads.info" },
  consent:
    "If you are in the European Economic Area, the UK or Switzerland, a consent message from Google asks for your choice before cookies are used for personalised ads. You can change that choice at any time with the privacy settings link shown on pages with ads.",
} as const;
