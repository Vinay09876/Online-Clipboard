import type { Page } from "@playwright/test";
import { serializeJsonLd } from "../lib/site";
import { SITE_PAGES } from "../lib/sitePages";
import { expect, test } from "./helpers";

/**
 * SEO checks. Each tag runs against its own server (see playwright.config.ts and
 * scripts/e2e-servers.mjs):
 *   @nosite      no SITE_URL
 *   @temp        SITE_URL on a temporary host (*.vercel.app)
 *   @real        SITE_URL=https://online-clipboard.example.com (a subdomain, like production)
 *   @killswitch  SITE_URL=https://example.com + ALLOW_INDEXING=false
 * Every page load also goes through the consoleProblems fixture: no CSP violations,
 * console errors or page errors.
 */

const REAL = "https://online-clipboard.example.com";
const TEMP = "https://online-clipboard-test.vercel.app";

async function metaRobots(page: Page) {
  return page.locator('meta[name="robots"]').getAttribute("content");
}

async function expectNotIndexable(page: Page, request: import("@playwright/test").APIRequestContext) {
  const robots = await request.get("/robots.txt");
  const txt = await robots.text();
  expect(txt).toMatch(/User-Agent: \*\s+Disallow: \/\s*$/m);
  expect(txt).not.toMatch(/Allow: \//);
  expect(txt).not.toMatch(/Sitemap:/i);
  expect(robots.headers()["x-robots-tag"]).toBe("noindex, nofollow");

  const sitemap = await (await request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("<url>");

  for (const path of ["/", "/terms"]) {
    const res = await page.goto(path);
    expect(await metaRobots(page)).toBe("noindex, nofollow");
    expect(res!.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  }
}

// --------------------------------------------------------------------------- not indexable

test("@nosite no SITE_URL: not indexable, and no canonical (no absolute base)", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  await expectNotIndexable(page, request);
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("@temp temporary host: not indexable, canonical still absolute on that host", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  await expectNotIndexable(page, request);
  await page.goto("/");
  expect(await page.locator('link[rel="canonical"]').getAttribute("href")).toMatch(new RegExp(`^${TEMP}/?$`));
});

test("@killswitch ALLOW_INDEXING=false on a real domain: not indexable", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  await expectNotIndexable(page, request);
});

test("@temp every public page is noindex on a temporary host", async ({ page, consoleProblems }) => {
  void consoleProblems;
  for (const p of SITE_PAGES) {
    const res = await page.goto(p.path);
    expect(await metaRobots(page), p.path).toBe("noindex, nofollow");
    expect(res!.headers()["x-robots-tag"], p.path).toBe("noindex, nofollow");
  }
});

test("@real every public page: indexable, absolute canonical, valid JSON-LD, listed in the sitemap", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  const sitemap = await (await request.get("/sitemap.xml")).text();
  for (const p of SITE_PAGES) {
    const expected = new URL(p.path, `${REAL}/`).toString();
    expect(sitemap, `${p.path} in sitemap`).toContain(`<loc>${expected}</loc>`);
    const res = await page.goto(p.path);
    expect(res!.status(), p.path).toBe(200);
    expect(await metaRobots(page), p.path).toBe("index, follow");
    expect(res!.headers()["x-robots-tag"], p.path).toBeUndefined();
    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).toString(), `${p.path} canonical`).toBe(expected);
    expect(await page.locator('meta[property="og:image"]').getAttribute("content"), `${p.path} og:image`).toMatch(new RegExp(`^${REAL}/`));
    const blocks = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)));
    expect(blocks.length, `${p.path} has JSON-LD`).toBeGreaterThan(0);
    // Absolute URLs in BreadcrumbList / Article when SITE_URL is set.
    for (const b of blocks.filter((x) => x["@type"] === "BreadcrumbList")) {
      for (const item of b.itemListElement) expect(item.item, `${p.path} breadcrumb`).toMatch(new RegExp(`^${REAL}/`));
    }
    for (const a of blocks.filter((x) => x["@type"] === "Article")) {
      expect(a.url, `${p.path} Article url`).toBe(expected);
      expect(a.mainEntityOfPage["@id"]).toBe(expected);
    }
  }
});

test("@temp @nosite @killswitch API responses are never indexable", async ({ request }) => {
  const api = await request.get("/api/clips/abc");
  expect(api.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

// --------------------------------------------------------------------------- real domain

test("@real robots.txt allows the site, blocks /api/, and lists the sitemap", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const txt = await res.text();
  expect(txt).toContain("User-Agent: *");
  expect(txt).toMatch(/^Allow: \/$/m);
  expect(txt).toMatch(/^Disallow: \/api\/$/m);
  expect(txt).toContain(`Sitemap: ${REAL}/sitemap.xml`);
  expect(txt).not.toMatch(/^Disallow: \/$/m);
  expect(res.headers()["x-robots-tag"]).toBeUndefined();
});

test("@real sitemap is valid XML with absolute URLs for every public page", async ({ page, request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("xml");
  const xml = await res.text();

  // Parse with the browser's XML parser: any syntax error shows up as <parsererror>.
  await page.goto("about:blank");
  const parsed = await page.evaluate((src) => {
    const doc = new DOMParser().parseFromString(src, "application/xml");
    return {
      error: doc.getElementsByTagName("parsererror").length > 0,
      root: doc.documentElement.nodeName,
      ns: doc.documentElement.namespaceURI,
      locs: [...doc.getElementsByTagName("loc")].map((l) => l.textContent ?? ""),
    };
  }, xml);
  expect(parsed.error).toBe(false);
  expect(parsed.root).toBe("urlset");
  expect(parsed.ns).toBe("http://www.sitemaps.org/schemas/sitemap/0.9");
  const expected = SITE_PAGES.map((p) => new URL(p.path, `${REAL}/`).toString());
  expect(parsed.locs.sort()).toEqual(expected.sort());
  for (const loc of parsed.locs) expect(loc.startsWith(`${REAL}/`)).toBe(true);
});

test("@real canonical, Open Graph and Twitter URLs are absolute; pages are indexable", async ({ page, consoleProblems }) => {
  void consoleProblems;
  for (const { path, title } of [
    { path: "/", title: "Online Clipboard: share text and files with a 6-digit code" },
    { path: "/terms", title: "Terms of use | Online Clipboard" },
  ]) {
    const res = await page.goto(path);
    expect(res!.headers()["x-robots-tag"], `${path}: no X-Robots-Tag`).toBeUndefined();
    expect(await metaRobots(page)).toBe("index, follow");
    await expect(page).toHaveTitle(title);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
    expect(new URL(canonical!).toString()).toBe(new URL(path, `${REAL}/`).toString());

    const og = async (p: string) => page.locator(`meta[property="og:${p}"]`).getAttribute("content");
    expect(new URL((await og("url"))!).toString()).toBe(new URL(path, `${REAL}/`).toString());
    expect(await og("title")).toBe(title);
    expect(await og("site_name")).toBe("Online Clipboard");
    expect(await og("type")).toBe("website");
    expect(await og("image")).toMatch(new RegExp(`^${REAL}/opengraph-image`));
    expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
    expect(await page.locator('meta[name="twitter:image"]').getAttribute("content")).toMatch(new RegExp(`^${REAL}/`));
  }
});

/** Real <script type="application/ld+json"> tags of an HTML response (attributes + parsed JSON). */
function jsonLdTags(html: string) {
  // Matches real tags only (the string also appears inside Next.js's own inline page data, escaped).
  return [...html.matchAll(/<script type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({
    attrs: m[1],
    data: JSON.parse(m[2]) as Record<string, unknown>,
  }));
}

test("@real JSON-LD WebApplication: valid JSON, expected fields, carries the CSP nonce", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  const res = await request.get("/");
  const html = await res.text();
  const nonce = /'nonce-([^']+)'/.exec(res.headers()["content-security-policy"] ?? "")?.[1];
  const tags = jsonLdTags(html);
  expect(tags.length, "JSON-LD scripts present").toBeGreaterThan(0);
  for (const t of tags) expect(/nonce="([^"]+)"/.exec(t.attrs)?.[1], `${t.data["@type"]} nonce`).toBe(nonce);

  const data = tags.find((t) => t.data["@type"] === "WebApplication")!.data;
  expect(data).toMatchObject({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Online Clipboard",
    url: `${REAL}/`,
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  });
  expect(typeof data.description).toBe("string");
  // Three blocks: WebSite (site name) + WebApplication + FAQPage (the FAQ is checked in home-content.spec.ts).
  expect(tags.map((t) => t.data["@type"])).toEqual(["WebSite", "WebApplication", "FAQPage"]);

  // Also visible to the browser as valid JSON.
  await page.goto("/");
  const inPage = await page.locator('script[type="application/ld+json"]').evaluateAll((els) => els.map((e) => JSON.parse(e.textContent!)["@type"]));
  expect(inPage).toEqual(["WebSite", "WebApplication", "FAQPage"]);
});

test("@real JSON-LD WebSite (site name): exactly one on the home page, exact values, none on other pages", async ({ request }) => {
  const home = jsonLdTags(await (await request.get("/")).text());
  const sites = home.filter((t) => t.data["@type"] === "WebSite");
  expect(sites).toHaveLength(1);
  // Exact object: no extra or missing keys. url = SITE_URL + "/" (production: https://online-clipboard.vinaycode.com/).
  expect(sites[0].data).toEqual({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Online Clipboard",
    alternateName: ["VinayCode Clipboard"],
    url: `${REAL}/`,
  });
  // No WebSite node nested anywhere else in the home page's JSON-LD either.
  expect(JSON.stringify(home.map((t) => t.data)).match(/"@type":"WebSite"/g)).toHaveLength(1);

  for (const path of [...SITE_PAGES.map((p) => p.path).filter((p) => p !== "/"), "/no-such-page"]) {
    const html = await (await request.get(path)).text();
    expect(JSON.stringify(jsonLdTags(html).map((t) => t.data)), `${path}: no WebSite node`).not.toContain('"WebSite"');
  }
});

test("@nosite no SITE_URL: the home page has no WebSite node (it needs an absolute URL)", async ({ request }) => {
  const types = jsonLdTags(await (await request.get("/")).text()).map((t) => t.data["@type"]);
  expect(types).toEqual(["WebApplication", "FAQPage"]);
});

test("@real JSON-LD serializer escapes '<' so nothing can close the script tag", () => {
  const out = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
  expect(out).not.toContain("<");
  expect(JSON.parse(out).name).toBe("</script><script>alert(1)</script>");
});

test("@real semantic HTML: one h1, landmarks, skip link, no heading-level jumps", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.locator("h1")).toHaveCount(1);
  await expect(page.locator("h1")).toHaveText(/Online Clipboard\s*Share text and files with a 6-digit code/);
  await expect(page.getByRole("banner")).toHaveCount(1);
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("contentinfo")).toHaveCount(1);
  await expect(page.getByRole("navigation", { name: "Site" })).toHaveCount(1);

  // Skip link: first Tab stop, and it moves focus to <main>.
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.locator("main#main")).toBeFocused();

  for (const path of ["/", "/terms", "/does-not-exist"]) {
    await page.goto(path);
    const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => Number(e.tagName[1])),
    );
    expect(levels[0], `${path}: starts with h1`).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i], `${path}: no jump from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  }
});

test("@real icons, manifest and share image are served locally", async ({ request }) => {
  for (const [path, type] of [
    ["/favicon.ico", "image/x-icon"],
    ["/icon.svg", "image/svg+xml"],
    ["/apple-icon.png", "image/png"],
    ["/icon-192.png", "image/png"],
    ["/icon-512.png", "image/png"],
    ["/icon-maskable-512.png", "image/png"],
    ["/opengraph-image", "image/png"],
  ] as const) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    expect(r.headers()["content-type"], path).toContain(type);
  }
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "Online Clipboard", start_url: "/", display: "standalone" });
  for (const icon of manifest.icons) {
    expect(icon.src).toMatch(/^\/[^/]/); // local path, never an external URL
    expect((await request.get(icon.src)).status()).toBe(200);
  }
});

// --------------------------------------------------------------------------- canonical host (Step 7)
// Server 3232: SITE_URL=https://online-clipboard.example.com (canonical, like online-clipboard.vinaycode.com),
// LEGACY_HOSTS=example.com,www.example.com,old-clipboard.vercel.app,old-clipboard.netlify.app.
// Requests carry a different Host header to act as www / an old address / a preview host.

const asHost = (host: string) => ({ headers: { Host: host }, maxRedirects: 0 });

test("@real www and legacy hosts redirect pages to SITE_URL with 301, keeping path and query", async ({ request }) => {
  for (const host of ["example.com", "www.example.com", "old-clipboard.vercel.app", "old-clipboard.netlify.app"]) {
    for (const path of ["/", "/guides?ref=x&y=1", `/guides/what-is-an-online-clipboard`, "/robots.txt"]) {
      const res = await request.get(path, asHost(host));
      expect(res.status(), `${host}${path}`).toBe(301);
      expect(res.headers()["location"], `${host}${path}`).toBe(`${REAL}${path}`);
    }
    const head = await request.head("/terms", asHost(host));
    expect(head.status(), `${host} HEAD`).toBe(301);
  }
  // Non-GET on the canonical host's own www twin keeps the method (308); on a legacy host
  // (incl. the bare domain and its www) it is served (noindex), not redirected.
  expect((await request.post("/", asHost("www.online-clipboard.example.com"))).status()).toBe(308);
  const apexPost = await request.post("/", asHost("example.com"));
  expect(apexPost.status()).not.toBe(301);
  expect(apexPost.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const legacyPost = await request.post("/", asHost("old-clipboard.vercel.app"));
  expect(legacyPost.status()).not.toBe(301);
  expect(legacyPost.headers()["x-robots-tag"]).toBe("noindex, nofollow");
});

test("@real the API is never redirected on any host (clean-up job and health checks can't follow redirects)", async ({ request }) => {
  for (const host of ["example.com", "www.example.com", "old-clipboard.vercel.app", "preview-abc123.vercel.app", "online-clipboard.example.com"]) {
    const health = await request.get("/api/health", asHost(host));
    expect([200, 429, 503], `${host} /api/health`).toContain(health.status());
    const cron = await request.post("/api/cron/cleanup", asHost(host));
    expect(cron.status(), `${host} /api/cron/cleanup without the secret`).toBe(401);
    const clip = await request.get("/api/clips/abc", asHost(host));
    expect(clip.status(), `${host} /api/clips/abc`).toBe(400);
  }
});

test("@real other hosts are served but noindex; the canonical host is indexable and gets HSTS", async ({ request }) => {
  for (const host of ["preview-abc123.vercel.app", "deploy-preview-7--x.netlify.app", "odd.example.org"]) {
    const res = await request.get("/guides", asHost(host));
    expect(res.status(), host).toBe(200);
    expect(res.headers()["x-robots-tag"], host).toBe("noindex, nofollow");
    // The canonical link still names the real site.
    expect(await res.text(), host).toContain(`<link rel="canonical" href="${REAL}/guides"/>`);
  }
  const canonical = await request.get("/guides", asHost("online-clipboard.example.com"));
  expect(canonical.status()).toBe(200);
  expect(canonical.headers()["x-robots-tag"]).toBeUndefined();
  expect(canonical.headers()["strict-transport-security"]).toBe("max-age=63072000");
  // localhost (tests, `next start`) is left alone: no redirect, no noindex, no HSTS.
  const local = await request.get("/guides", { maxRedirects: 0 });
  expect(local.status()).toBe(200);
  expect(local.headers()["x-robots-tag"]).toBeUndefined();
  expect(local.headers()["strict-transport-security"]).toBeUndefined();
});

test("@real every URL in JSON-LD on every page is absolute under SITE_URL", async ({ request }) => {
  const URL_KEYS = new Set(["url", "@id", "item", "image", "logo", "sameAs"]);
  for (const p of SITE_PAGES) {
    const html = await (await request.get(p.path)).text();
    const blocks = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
    const urls: string[] = [];
    const walk = (v: unknown, key = "") => {
      if (typeof v === "string" && URL_KEYS.has(key)) urls.push(v);
      else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
    };
    blocks.forEach((b) => walk(b));
    expect(urls.length, p.path).toBeGreaterThan(0);
    for (const u of urls) expect(u, `${p.path}: ${u}`).toMatch(new RegExp(`^${REAL}/`));
  }
});

test("@temp @nosite @killswitch canonical-host handling is inert unless SITE_URL is a real domain", async ({ request }, testInfo) => {
  // Same hosts as above, but on servers without a real SITE_URL: nothing is redirected and
  // nothing changes compared with before Step 7 (the kill switch server has a real SITE_URL,
  // so www still redirects there; its pages stay noindex through ALLOW_INDEXING=false).
  const killswitch = testInfo.project.name === "seo-kill-switch";
  for (const host of ["www.example.com", "old-clipboard.vercel.app", "preview-abc123.vercel.app"]) {
    const res = await request.get("/guides", asHost(host));
    if (killswitch && host === "www.example.com") {
      expect(res.status()).toBe(301);
      continue;
    }
    expect(res.status(), host).toBe(200);
    expect(res.headers()["strict-transport-security"], host).toBeUndefined();
  }
});

test("@temp a domain connected before the flip stays hidden: vinaycode.com answers noindex while SITE_URL is the temporary host", async ({ request }) => {
  // Launch day: vinaycode.com is added to Netlify while SITE_URL is still the *.netlify.app
  // address. Until SITE_URL is changed, nothing on the new domain may be indexable.
  const asDomain = { headers: { Host: "vinaycode.com" }, maxRedirects: 0 };
  for (const path of ["/", "/guides", "/guides/what-is-an-online-clipboard"]) {
    const res = await request.get(path, asDomain);
    expect(res.status(), path).toBe(200); // served, not redirected
    expect(res.headers()["x-robots-tag"], path).toBe("noindex, nofollow");
    const html = await res.text();
    expect(html, path).toContain('<meta name="robots" content="noindex, nofollow"/>');
    expect(html, `${path}: canonical still names the temporary host`).toContain(`<link rel="canonical" href="${TEMP}`);
  }
  const robots = await (await request.get("/robots.txt", asDomain)).text();
  expect(robots).toMatch(/Disallow: \/\s*$/m);
  expect(robots).not.toMatch(/Sitemap:/i);
  expect(await (await request.get("/sitemap.xml", asDomain)).text()).not.toContain("<url>");
});

test("@real /ads.txt is served on the bare domain itself (ad crawlers read it there), never redirected", async ({ request }) => {
  for (const host of ["example.com", "online-clipboard.example.com"]) {
    const res = await request.get("/ads.txt", asHost(host));
    expect(res.status(), host).toBe(404); // no ADSENSE_CLIENT_ID on this server: a real 404, not a 301
  }
});
