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
/**
 * IP-address check without node:net. proxy.ts imports this file, and on Netlify the proxy runs
 * as an Edge Function (Deno), so it sticks to plain JavaScript. Hostnames come from `new URL()`,
 * which already normalises IPv4 forms (127.1 → 127.0.0.1) and strips IPv6 brackets.
 */
function isIpAddress(host: string): boolean {
  if (host.includes(":")) return true; // IPv6: a DNS hostname can never contain ":"
  const parts = host.split(".");
  return parts.length === 4 && parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

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
  if (isIpAddress(host)) return true; // any IPv4 / IPv6 address, incl. 127.0.0.1 and ::1
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

// ---------------------------------------------------------------------------------------------
// Canonical host (Growth Step 7). INERT until SITE_URL is a real https domain.
// ---------------------------------------------------------------------------------------------

/**
 * The one host search engines should see, e.g. "online-clipboard.vinaycode.com", once SITE_URL is a real https
 * domain (not a temporary host). Null otherwise: then no redirects happen and every host
 * behaves as before. Independent of the ALLOW_INDEXING kill switch (redirects stay useful
 * while indexing is switched off; the kill switch still makes every page noindex).
 */
export const CANONICAL_HOST: string | null =
  parsed.ok && parsed.url && parsed.url.protocol === "https:" && !isTemporaryHost(parsed.url.hostname)
    ? parsed.url.host.toLowerCase()
    : null;

const HOSTNAME_RE = /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export type LegacyHostsParse = { ok: true; hosts: string[] } | { ok: false; error: string };

/**
 * LEGACY_HOSTS: comma-separated hostnames (no https://, no path), e.g.
 * "vinaycode.com,www.vinaycode.com,online-clipboard-tool.netlify.app,online-clipboard-rose.vercel.app".
 * Page requests on these
 * hosts are redirected to the canonical host. Exported so lib/config.ts can report errors.
 */
export function parseLegacyHosts(raw: string | undefined, canonical: string | null = CANONICAL_HOST): LegacyHostsParse {
  const hosts = (raw ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const h of hosts) {
    if (!HOSTNAME_RE.test(h)) {
      return { ok: false, error: `LEGACY_HOSTS must be host names separated by commas, without https:// or a path (got "${h}").` };
    }
    if (canonical && (h === canonical || h === wwwTwin(canonical))) {
      return { ok: false, error: `LEGACY_HOSTS must not contain the site's own host ${h} (it is SITE_URL or its www twin).` };
    }
  }
  return { ok: true, hosts };
}

const legacyParse = parseLegacyHosts(process.env.LEGACY_HOSTS);
export const LEGACY_HOSTS: ReadonlySet<string> = new Set(legacyParse.ok ? legacyParse.hosts : []);

/**
 * "example.com" ↔ "www.example.com". For a subdomain canonical (online-clipboard.vinaycode.com) the
 * twin is "www.online-clipboard…", which nobody uses; the bare domain and its www go in LEGACY_HOSTS.
 */
function wwwTwin(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : `www.${host}`;
}

/** Local access (next start, tests): never redirected or hidden, whatever SITE_URL says. */
const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export type HostDecision =
  | { kind: "inert" } // SITE_URL is not a real domain yet: behave exactly as before
  | { kind: "local" } // localhost: as before
  | { kind: "canonical" } // the real site
  | { kind: "redirect"; status: 301 | 308; location: string }
  | { kind: "noindex" }; // any other host (previews, deployment URLs, odd hosts)

/**
 * What to do with a PAGE request (proxy.ts never sees /api/*, so the API is never redirected:
 * the clean-up job and uptime checks can't follow redirects).
 *   www twin      → 301 (GET/HEAD) or 308 (other methods) to the canonical host, same path + query
 *   legacy host   → 301 to the canonical host for GET/HEAD; other methods are served, noindex
 *   other hosts   → served, noindex
 */
export function decideHost(
  hostHeader: string | null,
  method: string,
  pathAndQuery: string,
  canonical: string | null = CANONICAL_HOST,
  legacy: ReadonlySet<string> = LEGACY_HOSTS,
): HostDecision {
  if (!canonical) return { kind: "inert" };
  const host = (hostHeader ?? "").trim().toLowerCase().replace(/:\d+$/, "");
  if (LOOPBACK.has(host)) return { kind: "local" };
  if (host === canonical) return { kind: "canonical" };
  // ads.txt must be readable on the ROOT domain (e.g. vinaycode.com/ads.txt) when the site lives on
  // a subdomain: ad crawlers look there first, and following a redirect to another host isn't
  // guaranteed. Served as-is on every host (its content doesn't depend on the host; 404 until
  // AdSense is configured).
  if (pathAndQuery === "/ads.txt" || pathAndQuery.startsWith("/ads.txt?")) return { kind: "noindex" };
  const readOnly = method === "GET" || method === "HEAD";
  const location = `https://${canonical}${pathAndQuery}`;
  if (host === wwwTwin(canonical)) return { kind: "redirect", status: readOnly ? 301 : 308, location };
  if (legacy.has(host) && readOnly) return { kind: "redirect", status: 301, location };
  return { kind: "noindex" };
}

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

export const SITE_NAME = "EasyOnlinePaste";
export const DEFAULT_TITLE = `${SITE_NAME} – Online Clipboard with a 6-Digit Code`;
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
