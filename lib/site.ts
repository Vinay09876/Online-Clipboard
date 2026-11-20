/**
 * Site URL and search-engine indexing: the SINGLE source of truth.
 *
 * Inputs (server-side env, both optional):
 *   SITE_URL        public origin of the site, e.g. https://example.com (no path)
 *   ALLOW_INDEXING  "false" = kill switch: never index, whatever SITE_URL is
 *
 * The site is indexable ONLY if SITE_URL is set, valid, https, its host is a real domain
 * (not *.vercel.app, *.netlify.app, localhost, an IP address, …), and ALLOW_INDEXING is not
 * "false". Everything else (robots.txt, sitemap, <meta name="robots">, X-Robots-Tag,
 * canonical URLs) reads from here.
 *
 * Deliberately free of secrets and imports, so proxy.ts can use it too. Values are read
 * when the server starts (per instance), so changing them needs a restart / redeploy.
 */
import { isIP } from "node:net";

/** Hosts that must never be indexed: platform preview/temporary domains and local addresses. */
const TEMPORARY_HOST_SUFFIXES = [".vercel.app", ".netlify.app", ".localhost"];
const TEMPORARY_HOSTS = new Set(["localhost"]);

export type SiteUrlParse = { ok: true; url: URL } | { ok: false; error: string } | { ok: true; url: null };

/** Parses SITE_URL. Exported so lib/config.ts can turn errors into startup errors. */
export function parseSiteUrl(raw: string | undefined): SiteUrlParse {
  const value = raw?.trim();
  if (!value) return { ok: true, url: null };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: `SITE_URL must be a full URL like https://example.com (got "${value}").` };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { ok: false, error: `SITE_URL must start with https:// (got "${value}").` };
  }
  if ((url.pathname !== "/" && url.pathname !== "") || url.search || url.hash || url.username || url.password) {
    return { ok: false, error: `SITE_URL must be just the origin, e.g. https://example.com (got "${value}").` };
  }
  return { ok: true, url };
}

export function isTemporaryHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (TEMPORARY_HOSTS.has(host)) return true;
  if (TEMPORARY_HOST_SUFFIXES.some((s) => host.endsWith(s))) return true;
  if (isIP(host) !== 0) return true; // any IPv4 / IPv6 address, incl. 127.0.0.1 and ::1
  return false;
}

const parsed = parseSiteUrl(process.env.SITE_URL);

/** Origin without trailing slash, e.g. "https://example.com", or null when unset/invalid. */
export const SITE_ORIGIN: string | null = parsed.ok && parsed.url ? parsed.url.origin : null;

/** Why indexing is off (for docs/logs); null when indexable. */
export const INDEXING_OFF_REASON: string | null = (() => {
  if (process.env.ALLOW_INDEXING?.trim().toLowerCase() === "false") return "ALLOW_INDEXING=false";
  if (!parsed.ok) return "SITE_URL is invalid";
  if (!parsed.url) return "SITE_URL is not set";
  if (parsed.url.protocol !== "https:") return "SITE_URL is not https";
  if (isTemporaryHost(parsed.url.hostname)) return `${parsed.url.hostname} is a temporary host`;
  return null;
})();

export const INDEXABLE: boolean = INDEXING_OFF_REASON === null;

/** Absolute URL for a site path ("/terms" → "https://example.com/terms"), or null without SITE_URL. */
export function absoluteUrl(path: string): string | null {
  if (!SITE_ORIGIN) return null;
  return new URL(path, `${SITE_ORIGIN}/`).toString();
}

/**
 * Per-page canonical + og:url (relative; resolved against metadataBase = SITE_URL).
 * Without SITE_URL there is no absolute base, so no canonical is emitted at all.
 */
export function pageUrls(path: string, shareTitle: string = DEFAULT_TITLE) {
  if (!SITE_ORIGIN) return {};
  // Next.js merges metadata shallowly: a page's openGraph/twitter REPLACE the layout's,
  // and the app-level opengraph-image is then no longer applied to that page. So repeat
  // the shared fields and the share image here instead of losing them.
  return {
    alternates: { canonical: path },
    openGraph: { ...BASE_OPEN_GRAPH, url: path, title: shareTitle, images: [SHARE_IMAGE] },
    twitter: {
      card: "summary_large_image" as const,
      title: shareTitle,
      description: SITE_DESCRIPTION,
      images: [SHARE_IMAGE.url],
    },
  };
}

/**
 * Serializes JSON-LD for a <script type="application/ld+json"> tag.
 * "<" is escaped so no value can ever close the script tag (e.g. "</script>").
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export const SITE_NAME = "Online Clipboard";
export const DEFAULT_TITLE = "Online Clipboard: share text and files with a 6-digit code";
export const SITE_DESCRIPTION =
  "Free online clipboard: paste text or drop a file, get a 6-digit code, and open it on any other device. " +
  "No account needed. Clips are deleted automatically.";

/** The generated share image (app/opengraph-image.tsx), 1200×630. */
export const SHARE_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: DEFAULT_TITLE };

/** Open Graph fields shared by every page (see pageUrls for why pages repeat them). */
export const BASE_OPEN_GRAPH = {
  type: "website" as const,
  siteName: SITE_NAME,
  title: DEFAULT_TITLE,
  description: SITE_DESCRIPTION,
  locale: "en_US",
};
