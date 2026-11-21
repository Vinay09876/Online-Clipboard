/**
 * Advertising (Google AdSense): the SINGLE place that decides whether ads may appear.
 * Rules and reasons: docs/ads-plan.md.
 *
 * Inputs (server-side env, all optional; default = ads OFF):
 *   ADS_ENABLED                          "true" turns ads on (only where allowed, see adsActive)
 *   ADSENSE_CLIENT_ID                    publisher ID, "ca-pub-" + 16 digits
 *   ADSENSE_SLOT_GUIDE_AFTER_INTRO       ad unit ID (digits) per placement; a placement
 *   ADSENSE_SLOT_GUIDE_BEFORE_RELATED    without an ID renders nothing
 *   ADSENSE_SLOT_GUIDES_HUB
 *
 * Ads are active ONLY when ADS_ENABLED=true AND the site is indexable (a real https domain,
 * not a temporary host, kill switch off: lib/site.ts) AND ADSENSE_CLIENT_ID is set and valid.
 * Manual ad units only; Auto ads are not used (and must be OFF in the AdSense account).
 *
 * Free of secrets and of "server-only", so proxy.ts can import it. Malformed values are
 * reported as startup errors by lib/config.ts and the build guard
 * (scripts/check-placeholders.ts); here they simply keep ads off.
 */
import { GUIDES } from "../content/guides/index";
import { INDEXABLE } from "./site";

/**
 * Every place an ad may ever appear. Nothing else can render an ad: <AdSlot> only accepts
 * these names. Placements are deliberately limited to the guides (publisher content), never
 * the tool, received clips, legal/trust pages or error pages.
 */
export const AD_PLACEMENTS = {
  /** Guide page, after the "In short" intro, before the article body. */
  "guide-after-intro": { page: "guide", slotEnv: "ADSENSE_SLOT_GUIDE_AFTER_INTRO", minHeight: 280 },
  /** Guide page, after the article and its sources, before "Related guides". */
  "guide-before-related": { page: "guide", slotEnv: "ADSENSE_SLOT_GUIDE_BEFORE_RELATED", minHeight: 280 },
  /** /guides hub, between two category groups. */
  "guides-hub": { page: "hub", slotEnv: "ADSENSE_SLOT_GUIDES_HUB", minHeight: 280 },
} as const;

export type AdPlacement = keyof typeof AD_PLACEMENTS;
export type AdPageKind = (typeof AD_PLACEMENTS)[AdPlacement]["page"];

export const MAX_ADS_PER_PAGE = 2;

// Enforced at load time: adding a third placement to one page type fails every build/start.
for (const kind of new Set(Object.values(AD_PLACEMENTS).map((p) => p.page))) {
  const n = Object.values(AD_PLACEMENTS).filter((p) => p.page === kind).length;
  if (n > MAX_ADS_PER_PAGE) throw new Error(`lib/ads.ts: ${n} ad placements on "${kind}" pages (max ${MAX_ADS_PER_PAGE}).`);
}

const CLIENT_ID_RE = /^ca-pub-\d{16}$/;
const SLOT_ID_RE = /^\d{1,20}$/;

export type AdsSettings = {
  enabled: boolean;
  clientId: string | null;
  slots: Partial<Record<AdPlacement, string>>;
  /** Malformed values (startup errors). */
  errors: string[];
};

/** Parses the ads env vars. Exported for lib/config.ts, the build guard and tests. */
export function parseAdsEnv(env: Record<string, string | undefined>): AdsSettings {
  const errors: string[] = [];

  const rawEnabled = env.ADS_ENABLED?.trim().toLowerCase() ?? "";
  if (rawEnabled !== "" && rawEnabled !== "true" && rawEnabled !== "false") {
    errors.push(`ADS_ENABLED must be "true" or "false" (got "${env.ADS_ENABLED}").`);
  }

  let clientId: string | null = env.ADSENSE_CLIENT_ID?.trim() || null;
  if (clientId && !CLIENT_ID_RE.test(clientId)) {
    errors.push(`ADSENSE_CLIENT_ID must look like ca-pub-1234567890123456 ("ca-pub-" + 16 digits; got "${clientId}").`);
    clientId = null;
  }

  const slots: Partial<Record<AdPlacement, string>> = {};
  for (const [placement, { slotEnv }] of Object.entries(AD_PLACEMENTS) as [AdPlacement, (typeof AD_PLACEMENTS)[AdPlacement]][]) {
    const v = env[slotEnv]?.trim();
    if (!v) continue;
    if (!SLOT_ID_RE.test(v)) errors.push(`${slotEnv} must be the numeric ad unit ID from AdSense (got "${v}").`);
    else slots[placement] = v;
  }

  return { enabled: rawEnabled === "true" && errors.length === 0, clientId, slots, errors };
}

/**
 * What must be set before ads can be switched on for real. Used by the build guard on an
 * indexable domain (a missing setting there means a broken launch, so the build fails).
 */
export function missingAdsSettings(s: AdsSettings): string[] {
  if (!s.enabled) return [];
  const missing: string[] = [];
  if (!s.clientId) missing.push("ADSENSE_CLIENT_ID");
  if (Object.keys(s.slots).length === 0) {
    missing.push(`at least one ad unit ID (${Object.values(AD_PLACEMENTS).map((p) => p.slotEnv).join(", ")})`);
  }
  return missing;
}

const SETTINGS = parseAdsEnv({
  ADS_ENABLED: process.env.ADS_ENABLED,
  ADSENSE_CLIENT_ID: process.env.ADSENSE_CLIENT_ID,
  ADSENSE_SLOT_GUIDE_AFTER_INTRO: process.env.ADSENSE_SLOT_GUIDE_AFTER_INTRO,
  ADSENSE_SLOT_GUIDE_BEFORE_RELATED: process.env.ADSENSE_SLOT_GUIDE_BEFORE_RELATED,
  ADSENSE_SLOT_GUIDES_HUB: process.env.ADSENSE_SLOT_GUIDES_HUB,
});

export const ADS_ENV_ERRORS: readonly string[] = SETTINGS.errors;

/** THE decision. Everything ad-related (slots, script, CSP, wording) follows this. */
export function adsActive(): boolean {
  return SETTINGS.enabled && INDEXABLE && SETTINGS.clientId !== null;
}

/**
 * Publisher ID for ownership verification (the google-adsense-account meta tag and
 * /ads.txt). Shown whenever ADSENSE_CLIENT_ID is set on an indexable domain, even with
 * ADS_ENABLED=false, so the site can be verified before ads are switched on. Never on
 * temporary hosts or with the kill switch (verification only makes sense on the real domain).
 */
export function adsenseAccountId(): string | null {
  return INDEXABLE ? SETTINGS.clientId : null;
}

/** Ad unit ID for a placement, or null when ads are off or that placement has no ID. */
export function adSlotId(placement: AdPlacement): string | null {
  return adsActive() ? (SETTINGS.slots[placement] ?? null) : null;
}

/** The AdSense library URL (official form from the AdSense help pages). */
export function adScriptUrl(clientId: string): string {
  return `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`;
}

/**
 * The single ads.txt line. Official format: `google.com, pub-…, DIRECT, f08c47fec0942fa0`
 * (the publisher ID without the "ca-" prefix). Null when there is no publisher ID.
 */
export function adsTxt(): string | null {
  const id = adsenseAccountId();
  return id ? `google.com, ${id.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0` : null;
}

const GUIDE_SLUGS = new Set(GUIDES.map((g) => g.slug));

/** Which kind of ad page a path is ("hub", "guide"), or null for every other page. */
export function adPageKind(pathname: string): AdPageKind | null {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/guides") return "hub";
  const m = /^\/guides\/([^/]+)$/.exec(path);
  if (m) {
    try {
      return GUIDE_SLUGS.has(decodeURIComponent(m[1])) ? "guide" : null;
    } catch {
      return null;
    }
  }
  return null;
}

/** True when this request's page may carry ads right now (proxy.ts: CSP and Referrer-Policy). */
export function isActiveAdPage(pathname: string): boolean {
  return adsActive() && adPageKind(pathname) !== null;
}

/**
 * Page metadata for pages that can show ads. Google's consent message needs a referrer policy
 * that allows cross-origin referrers (strict-origin-when-cross-origin is enough); the site
 * default is no-referrer. Applied only while ads are active, only on ad pages.
 */
export function adPageMetadata(): { referrer?: "strict-origin-when-cross-origin" } {
  return adsActive() ? { referrer: "strict-origin-when-cross-origin" } : {};
}
