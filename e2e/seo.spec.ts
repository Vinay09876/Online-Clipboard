import type { Page } from "@playwright/test";
import { serializeJsonLd } from "../lib/site";
import { SITE_PAGES } from "../lib/sitePages";
import { expect, test } from "./helpers";

/**
 * SEO checks. Each tag runs against its own server (see playwright.config.ts and
 * scripts/e2e-servers.mjs):
 *   @nosite      no SITE_URL
 *   @temp        SITE_URL on a temporary host (*.vercel.app)
 *   @real        SITE_URL=https://example.com
 *   @killswitch  SITE_URL=https://example.com + ALLOW_INDEXING=false
 * Every page load also goes through the consoleProblems fixture: no CSP violations,
 * console errors or page errors.
 */

const REAL = "https://example.com";
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

test("@real JSON-LD WebApplication: valid JSON, expected fields, carries the CSP nonce", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  const res = await request.get("/");
  const html = await res.text();
  const nonce = /'nonce-([^']+)'/.exec(res.headers()["content-security-policy"] ?? "")?.[1];
  const tag = /<script type="application\/ld\+json"([^>]*)>([\s\S]*?)<\/script>/.exec(html);
  expect(tag, "JSON-LD script present").toBeTruthy();
  expect(/nonce="([^"]+)"/.exec(tag![1])?.[1]).toBe(nonce);

  const data = JSON.parse(tag![2]);
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
  // Count real tags (the string also appears inside Next.js's own inline page data).
  // Two blocks since Step 2: WebApplication + FAQPage (the FAQ is checked in home-content.spec.ts).
  const types = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1])["@type"],
  );
  expect(types).toEqual(["WebApplication", "FAQPage"]);

  // Also visible to the browser as valid JSON.
  await page.goto("/");
  const inPage = await page.locator('script[type="application/ld+json"]').first().textContent();
  expect(JSON.parse(inPage!)["@type"]).toBe("WebApplication");
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
