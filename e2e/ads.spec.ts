import type { APIRequestContext } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { GUIDES, guidePath } from "../content/guides/index";
import { AD_PLACEMENTS, MAX_ADS_PER_PAGE, parseAdsEnv } from "../lib/ads";
import { SITE_PAGES } from "../lib/sitePages";
import { expect, test } from "./helpers";

/**
 * Ads (Growth Step 4: ad-ready code, switched OFF). See docs/ads-plan.md.
 * Tags → servers (playwright.config.ts, scripts/e2e-servers.mjs):
 *   @adsoff    default config (3230) and a real domain without ad settings (3232)
 *   @adson     real domain + ad flags with a FAKE publisher ID (3235): HTML and headers only.
 *              Google's script is never loaded: the one browser test aborts every external request.
 *   @adsnever  temporary host (3231) and kill switch (3233), both WITH ad flags
 */

const FAKE_CLIENT = "ca-pub-0000000000000000";
const SUPABASE_ORIGIN = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin;

const PAGES = [...SITE_PAGES.map((p) => p.path), "/no-such-page", "/guides/no-such-guide"];
const AD_PAGES = new Set(["/guides", ...GUIDES.map((g) => guidePath(g.slug))]);
const firstGuide = guidePath(GUIDES[0].slug);

/** Today's page CSP (before Step 4), byte for byte. Must stay identical whenever ads are off. */
const defaultCsp = (nonce: string) =>
  `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; ` +
  `img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${SUPABASE_ORIGIN}; object-src 'none'; ` +
  `base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;

/** The ads-on CSP for guide pages and the hub: the default plus exactly the documented additions. */
const adsCsp = (nonce: string) =>
  `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' 'unsafe-eval' https: http:; ` +
  `style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' https:; ` +
  `connect-src 'self' ${SUPABASE_ORIGIN} https:; frame-src https:; object-src 'none'; ` +
  `base-uri 'self'; form-action 'self'; frame-ancestors 'none'`;

const nonceOf = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1] ?? "";

/** Markup and domains that only exist when ads are on. */
const AD_MARKUP = /adsbygoogle|googlesyndication|doubleclick|google-adsense-account|data-ad-|pagead|fundingchoices/i;
/** Wording that must not appear while ads are off (pages may not even mention ads). */
const AD_WORDING = /\badvert|\bads\b|adsense|sponsored|ad cookies|personalised ads|personalized ads/i;
/** Claims that are false once ads are on. */
const NO_TRACKING_CLAIMS = /no cookies|no analytics|cookies or analytics|no tracking/i;

const AD_SCRIPT_TAG = /<script[^>]*src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=([^"&]+)"[^>]*>/g;

async function get(request: APIRequestContext, path: string) {
  const res = await request.get(path);
  return { res, html: await res.text(), csp: res.headers()["content-security-policy"] ?? "" };
}

/** Everything a visitor or crawler could see must be free of ads in this mode. */
async function expectNoAdsAnywhere(request: APIRequestContext) {
  for (const path of PAGES) {
    const { res, html, csp } = await get(request, path);
    expect(html, `${path}: no ad markup`).not.toMatch(AD_MARKUP);
    expect(html, `${path}: no ad wording`).not.toMatch(AD_WORDING);
    expect(csp, `${path}: CSP identical to before Step 4`).toBe(defaultCsp(nonceOf(csp)));
    expect(csp, `${path}: no Google domain in the CSP`).not.toMatch(/google|doubleclick|frame-src| https:(;|$)/);
    expect(res.headers()["referrer-policy"], `${path}: referrer policy unchanged`).toBe("no-referrer");
  }
  const ads = await request.get("/ads.txt");
  expect(ads.status(), "ads.txt is a real 404").toBe(404);
  expect(await ads.text()).not.toMatch(/google|pub-/);
}

// --------------------------------------------------------------------------- ads OFF (default)

test("@adsoff default: no ad slot, script, meta tag, ad wording or Google domain on any page; CSP unchanged; ads.txt 404", async ({ request }) => {
  await expectNoAdsAnywhere(request);
});

test("@adsoff default: pages keep the 'no cookies / no analytics' wording", async ({ request }) => {
  const privacy = (await get(request, "/privacy")).html;
  expect(privacy).toContain("No cookies.");
  expect(privacy).toContain("No analytics, no tracking scripts");
  expect((await get(request, "/about")).html).toContain("No cookies, no analytics, no tracking scripts.");
  expect((await get(request, "/")).html).toContain("No accounts, no cookies, no analytics.");
  expect((await get(request, "/guides/is-an-online-clipboard-safe")).html).toContain("No accounts, cookies or analytics.");
});

test("@adsoff default: a browser visit to the hub and a guide makes no external request and logs no errors", async ({ page, consoleProblems }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.hostname !== "localhost" && u.origin !== SUPABASE_ORIGIN) external.push(r.url());
  });
  for (const path of ["/", "/guides", firstGuide]) {
    await page.goto(path);
    await page.mouse.wheel(0, 20000); // scroll to the bottom, where the second slot would be
    await page.waitForLoadState("networkidle");
    expect(await page.locator("[data-ad-placement], ins.adsbygoogle").count(), path).toBe(0);
  }
  expect(external).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test("@adsoff only the guide layout and the guides hub use <AdSlot>; the tool never does", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(name)) files.push(relative(process.cwd(), p).replaceAll("\\", "/"));
    }
  };
  ["app", "components", "content", "lib"].forEach(walk);

  // Real JSX usage (doc comments that merely mention <AdSlot> don't count).
  const users = files.filter((f) => /<AdSlot\s+placement=/.test(readFileSync(f, "utf8"))).sort();
  expect(users).toEqual(["app/guides/page.tsx", "components/guides/GuideLayout.tsx"]);

  // The clipboard tool, home page, legal/trust pages, error pages and API routes: no ad code at all.
  const forbidden = files.filter(
    (f) =>
      !f.startsWith("components/ads/") &&
      (/^components\/(ClipboardApp|SendPanel|ReceivePanel|CodeInput|FileDropzone|CopyButton|Countdown|ProgressBar|HomeContent)\.tsx$/.test(f) ||
        /^app\/(page|not-found|error|global-error)\.tsx$/.test(f) ||
        /^app\/(terms|privacy|about|contact)\//.test(f) ||
        f.startsWith("app/api/")),
  );
  expect(forbidden.length).toBeGreaterThan(10);
  for (const f of forbidden) {
    expect(readFileSync(f, "utf8"), f).not.toMatch(/AdSlot|AdUnit|adsbygoogle|components\/ads/);
  }

  // Placements are enumerated in code, at most two per page type.
  const perPage = new Map<string, number>();
  for (const p of Object.values(AD_PLACEMENTS)) perPage.set(p.page, (perPage.get(p.page) ?? 0) + 1);
  expect(Object.keys(AD_PLACEMENTS).sort()).toEqual(["guide-after-intro", "guide-before-related", "guides-hub"]);
  for (const [, n] of perPage) expect(n).toBeLessThanOrEqual(MAX_ADS_PER_PAGE);
});

test("@adsoff ad settings are validated: malformed values are errors, nothing is on by default", () => {
  expect(parseAdsEnv({})).toEqual({ enabled: false, clientId: null, slots: {}, errors: [] });
  const bad = parseAdsEnv({ ADS_ENABLED: "yes", ADSENSE_CLIENT_ID: "pub-123", ADSENSE_SLOT_GUIDES_HUB: "abc" });
  expect(bad.enabled).toBe(false);
  expect(bad.errors.join("\n")).toMatch(/ADS_ENABLED must be "true" or "false"/);
  expect(bad.errors.join("\n")).toMatch(/ADSENSE_CLIENT_ID must look like ca-pub-/);
  expect(bad.errors.join("\n")).toMatch(/ADSENSE_SLOT_GUIDES_HUB must be the numeric ad unit ID/);
  expect(parseAdsEnv({ ADSENSE_CLIENT_ID: "ca-pub-000000000000000" }).errors).toHaveLength(1); // 15 digits
  const good = parseAdsEnv({ ADS_ENABLED: "true", ADSENSE_CLIENT_ID: FAKE_CLIENT, ADSENSE_SLOT_GUIDES_HUB: "123" });
  expect(good).toEqual({ enabled: true, clientId: FAKE_CLIENT, slots: { "guides-hub": "123" }, errors: [] });
});

test("@adsoff build guard: ADS_ENABLED on a real domain needs a client ID and an ad unit; bad values always fail", () => {
  const tsx = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const clean = mkdtempSync(join(tmpdir(), "ads-clean-"));
  writeFileSync(join(clean, "page.tsx"), `export const x = "done";`);
  const run = (env: Record<string, string>) =>
    spawnSync(process.execPath, [tsx, "scripts/check-placeholders.ts", "--dir", clean], {
      env: {
        ...process.env,
        SITE_URL: "",
        ALLOW_INDEXING: "",
        CONTACT_EMAIL: "hello@example.org",
        ABUSE_CONTACT_EMAIL: "",
        ADS_ENABLED: "",
        ADSENSE_CLIENT_ID: "",
        ADSENSE_SLOT_GUIDE_AFTER_INTRO: "",
        ADSENSE_SLOT_GUIDE_BEFORE_RELATED: "",
        ADSENSE_SLOT_GUIDES_HUB: "",
        ...env,
      },
      encoding: "utf8",
    });
  try {
    const real = { SITE_URL: "https://example.com" };
    expect(run(real).status, "real domain, ads off → pass").toBe(0);
    const noClient = run({ ...real, ADS_ENABLED: "true", ADSENSE_SLOT_GUIDES_HUB: "123" });
    expect(noClient.status, "ads on, no client ID → fail").toBe(1);
    expect(noClient.stderr).toContain("ADSENSE_CLIENT_ID");
    const noSlot = run({ ...real, ADS_ENABLED: "true", ADSENSE_CLIENT_ID: FAKE_CLIENT });
    expect(noSlot.status, "ads on, no ad unit → fail").toBe(1);
    expect(noSlot.stderr).toContain("at least one ad unit ID");
    expect(run({ ...real, ADS_ENABLED: "true", ADSENSE_CLIENT_ID: FAKE_CLIENT, ADSENSE_SLOT_GUIDES_HUB: "123" }).status, "complete → pass").toBe(0);
    expect(run({ SITE_URL: "https://foo.vercel.app", ADS_ENABLED: "true" }).status, "temporary host: ads stay off → pass").toBe(0);
    const malformed = run({ SITE_URL: "https://foo.vercel.app", ADSENSE_CLIENT_ID: "pub-123" });
    expect(malformed.status, "malformed client ID fails on any host").toBe(1);
    expect(malformed.stderr).toContain("ca-pub-");
  } finally {
    rmSync(clean, { recursive: true, force: true });
  }
});

// --------------------------------------------------------------------------- ads ON (fake publisher ID)

test("@adson slots only on the guides and the hub, at most 2 per page, each labelled; manual units only", async ({ request }) => {
  for (const path of PAGES) {
    const { html } = await get(request, path);
    const slots = [...html.matchAll(/<aside[^>]*data-ad-placement="([^"]+)"[^>]*>/g)];
    const expected = path === "/guides" ? 1 : AD_PAGES.has(path) ? 2 : 0;
    expect(slots.length, `${path}: number of ad slots`).toBe(expected);
    expect(slots.length).toBeLessThanOrEqual(MAX_ADS_PER_PAGE);
    for (const s of slots) expect(s[0], `${path}: slot labelled`).toContain('aria-label="Advertisements"');
    const units = [...html.matchAll(/<ins[^>]*class="adsbygoogle"[^>]*>/g)].map((m) => m[0]);
    expect(units.length, `${path}: one ad unit per slot`).toBe(expected);
    for (const u of units) {
      expect(u).toContain(`data-ad-client="${FAKE_CLIENT}"`);
      expect(u).toMatch(/data-ad-slot="\d+"/);
    }
    // No Auto ads / page-level ads code anywhere.
    expect(html).not.toMatch(/enable_page_level_ads|google_ad_client|data-ad-host|data-overlays/);
  }
  const guide = (await get(request, firstGuide)).html;
  const pos = (re: RegExp) => guide.search(re);
  // After the intro ("In short" + date), before the body; after the sources, right before "Related guides".
  expect(pos(/data-ad-placement="guide-after-intro"/)).toBeGreaterThan(pos(/In short/));
  expect(pos(/data-ad-placement="guide-after-intro"/)).toBeLessThan(pos(/<h2[^>]*>When this tool is not the right choice/));
  expect(pos(/data-ad-placement="guide-before-related"/)).toBeGreaterThan(pos(/<h2[^>]*>Official help pages/));
  expect(pos(/data-ad-placement="guide-before-related"/)).toBeLessThan(pos(/<h2[^>]*>Related guides/));
  // Hub: between category groups, not after the last one.
  const hub = (await get(request, "/guides")).html;
  const hubSlot = hub.search(/data-ad-placement="guides-hub"/);
  const sections = [...hub.matchAll(/<section[^>]*id="([^"]+)"/g)].map((m) => m.index!);
  expect(sections.some((i) => i < hubSlot) && sections.some((i) => i > hubSlot)).toBe(true);
});

test("@adson the AdSense script: once, with the CSP nonce, only on pages with slots", async ({ request }) => {
  for (const path of PAGES) {
    const { html, csp } = await get(request, path);
    const tags = [...html.matchAll(AD_SCRIPT_TAG)];
    if (!AD_PAGES.has(path)) {
      expect(tags.length, `${path}: no ad script`).toBe(0);
      continue;
    }
    expect(tags.length, `${path}: exactly one ad script tag`).toBe(1);
    expect(tags[0][1]).toBe(FAKE_CLIENT);
    expect(tags[0][0]).toContain(`nonce="${nonceOf(csp)}"`);
    expect(tags[0][0]).toMatch(/\basync\b/);
    expect(tags[0][0]).toContain('crossorigin="anonymous"');
  }
});

test("@adson CSP: documented additions on ad pages only; every other page keeps the default", async ({ request }) => {
  for (const path of PAGES) {
    const { csp, res } = await get(request, path);
    const ad = AD_PAGES.has(path);
    expect(csp, path).toBe(ad ? adsCsp(nonceOf(csp)) : defaultCsp(nonceOf(csp)));
    expect(res.headers()["referrer-policy"], path).toBe(ad ? "strict-origin-when-cross-origin" : "no-referrer");
  }
  // The <meta name="referrer"> matches the header on ad pages (a meta tag would otherwise override it).
  expect((await get(request, firstGuide)).html).toContain('<meta name="referrer" content="strict-origin-when-cross-origin"/>');
  expect((await get(request, "/")).html).toContain('<meta name="referrer" content="no-referrer"/>');
});

test("@adson ads.txt has the official line; the verification meta tag is on every page; robots and sitemap unaffected", async ({ request }) => {
  const ads = await request.get("/ads.txt");
  expect(ads.status()).toBe(200);
  expect(ads.headers()["content-type"]).toMatch(/^text\/plain/);
  expect(await ads.text()).toBe("google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0\n");
  for (const path of PAGES) {
    const { html } = await get(request, path);
    const metas = html.match(/<meta name="google-adsense-account" content="([^"]+)"\/>/g) ?? [];
    expect(metas, path).toEqual([`<meta name="google-adsense-account" content="${FAKE_CLIENT}"/>`]);
  }
  const robots = await (await request.get("/robots.txt")).text();
  expect(robots).not.toMatch(/ads\.txt/);
  expect(robots).toMatch(/Allow: \//);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain("ads.txt");
});

test("@adson wording switches: no 'no cookies / no analytics' anywhere; privacy and terms explain advertising", async ({ request }) => {
  for (const path of PAGES) {
    expect((await get(request, path)).html, path).not.toMatch(NO_TRACKING_CLAIMS);
  }
  for (const path of ["/privacy", "/terms"]) {
    const { html } = await get(request, path);
    expect(html, path).toMatch(/<h2[^>]*>Advertising<\/h2>/);
    expect(html).toContain("Third-party vendors, including Google, use cookies to serve ads");
    expect(html).toContain('href="https://policies.google.com/technologies/partner-sites"');
    expect(html).toContain('href="https://adssettings.google.com"');
    expect(html).toMatch(/European Economic Area, the UK or Switzerland/);
  }
  expect((await get(request, "/")).html).toContain("the tool itself never shows ads");
});

test("@adson layout: each slot keeps clear of links and buttons (external requests aborted, nothing loads from Google)", async ({ page, consoleProblems }) => {
  const aborted: string[] = [];
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.hostname === "localhost") return route.continue();
    aborted.push(u.hostname);
    return route.abort();
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const path of [firstGuide, "/guides"]) {
    await page.goto(path);
    const gaps = await page.evaluate(() =>
      [...document.querySelectorAll("[data-ad-placement]")].map((slot) => {
        const r = slot.getBoundingClientRect();
        let min = Infinity;
        for (const el of document.querySelectorAll("main a, main button, nav a")) {
          const b = el.getBoundingClientRect();
          const vertical = b.bottom <= r.top ? r.top - b.bottom : b.top >= r.bottom ? b.top - r.bottom : 0;
          min = Math.min(min, vertical);
        }
        return { height: r.height, min };
      }),
    );
    expect(gaps.length, path).toBeGreaterThan(0);
    for (const g of gaps) {
      expect(g.height, `${path}: reserved height`).toBeGreaterThanOrEqual(280);
      expect(g.min, `${path}: distance to the nearest link or button`).toBeGreaterThanOrEqual(32);
    }
  }
  expect(aborted.length, "the page asked for Google's script, which was blocked").toBeGreaterThan(0);
  expect(aborted.every((h) => h === "pagead2.googlesyndication.com")).toBe(true);
  // No hydration error, CSP violation or page error from the slots themselves.
  expect(consoleProblems.filter((p) => !p.includes("ERR_FAILED"))).toEqual([]);
});

// --------------------------------------------------------------------------- never (temporary host, kill switch)

test("@adsnever ad flags set, but a temporary host / kill switch: still no ads at all", async ({ request }) => {
  await expectNoAdsAnywhere(request);
  const privacy = (await get(request, "/privacy")).html;
  expect(privacy).toContain("No cookies.");
});
