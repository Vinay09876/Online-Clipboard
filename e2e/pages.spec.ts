import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GUIDES, guidePath } from "../content/guides/index";
import { SITE_PAGES } from "../lib/sitePages";
import { expect, test } from "./helpers";

/**
 * Trust pages and guides (Growth Step 3a). Runs on the default server (3230, no SITE_URL);
 * indexable/noindex variants are covered in seo.spec.ts. @config runs on server 3234
 * (CONTACT_EMAIL set).
 */

const NEW_PAGES = ["/terms", "/privacy", "/about", "/contact", "/guides", ...GUIDES.map((g) => guidePath(g.slug))];

async function jsonLdTypes(page: import("@playwright/test").Page) {
  return page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
    els.map((e) => JSON.parse(e.textContent!) as Record<string, unknown>),
  );
}

test("every new page loads: one h1, ordered headings, breadcrumbs, valid JSON-LD", async ({ page, consoleProblems }) => {
  void consoleProblems;
  for (const path of NEW_PAGES) {
    const res = await page.goto(path);
    expect(res!.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);

    const levels = await page.locator("h1, h2, h3, h4, h5, h6").evaluateAll((els) =>
      els.filter((e) => (e as HTMLElement).offsetParent !== null).map((e) => Number(e.tagName[1])),
    );
    expect(levels[0], `${path}: starts with h1`).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i], `${path}: no jump from h${levels[i - 1]} to h${levels[i]}`).toBeLessThanOrEqual(levels[i - 1] + 1);
    }

    await expect(page.getByRole("navigation", { name: "Breadcrumb" }), path).toBeVisible();
    const ld = await jsonLdTypes(page); // JSON.parse throws on invalid JSON
    const crumbs = ld.find((d) => d["@type"] === "BreadcrumbList") as { itemListElement: Array<{ position: number; name: string }> };
    expect(crumbs, `${path}: BreadcrumbList`).toBeTruthy();
    expect(crumbs.itemListElement[0]).toMatchObject({ position: 1, name: "Home" });
  }
});

test("guides follow the template: summary, date, steps, honesty section, sources, related, tool link", async ({ page, consoleProblems }) => {
  void consoleProblems;
  for (const g of GUIDES) {
    await page.goto(guidePath(g.slug));
    await expect(page.locator("h1")).toHaveText(g.title);
    await expect(page.getByText("In short")).toBeVisible();
    await expect(page.getByText(g.summary)).toBeVisible();
    await expect(page.locator(`time[datetime="${g.dateModified}"]`)).toBeVisible();
    await expect(page.getByRole("heading", { name: "When this tool is not the right choice" })).toBeVisible();
    await expect(page.locator("article ol").first()).toBeVisible(); // numbered steps

    // Related guides: every listed one, plus the hub.
    const relatedHeading = page.getByRole("heading", { name: "Related guides" });
    await expect(relatedHeading).toBeVisible();
    for (const slug of g.related) {
      const r = GUIDES.find((x) => x.slug === slug)!;
      await expect(page.locator("article").getByRole("link", { name: r.title })).toHaveAttribute("href", guidePath(slug));
    }
    await expect(page.locator("article").getByRole("link", { name: "Open Online Clipboard" })).toHaveAttribute("href", "/");

    // Outbound links: official docs only, with rel="noopener noreferrer".
    const external = await page.locator('article a[href^="http"]').evaluateAll((els) =>
      els.map((a) => ({ href: a.getAttribute("href")!, rel: a.getAttribute("rel") ?? "" })),
    );
    for (const e of external) {
      expect(e.rel, e.href).toContain("noopener");
      expect(e.rel, e.href).toContain("noreferrer");
      expect(new URL(e.href).hostname, e.href).toMatch(/(^|\.)(apple|microsoft|google|whatsapp)\.com$/);
    }

    const article = (await jsonLdTypes(page)).find((d) => d["@type"] === "Article")!;
    expect(article).toMatchObject({
      headline: g.title,
      datePublished: g.datePublished,
      dateModified: g.dateModified,
      author: { "@type": "Organization", name: "Online Clipboard" },
      publisher: { "@type": "Organization", name: "Online Clipboard" },
    });
  }
});

test("guides hub lists every guide; unknown guide is a 404", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/guides");
  for (const g of GUIDES) {
    await expect(page.getByRole("link", { name: g.title })).toHaveAttribute("href", guidePath(g.slug));
    await expect(page.getByText(g.description)).toBeVisible();
  }
  const res = await page.goto("/guides/no-such-guide");
  expect(res!.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("every internal link on every public page resolves (no 404s)", async ({ page, request }) => {
  const paths = SITE_PAGES.map((p) => p.path);
  const links = new Set<string>();
  for (const path of paths) {
    await page.goto(path);
    for (const href of await page.locator('a[href^="/"]').evaluateAll((els) => els.map((a) => a.getAttribute("href")!))) {
      links.add(href.split("#")[0] || "/");
    }
  }
  expect(links.size).toBeGreaterThan(5);
  for (const href of links) {
    const r = await request.get(href);
    expect(r.status(), href).toBe(200);
  }
  // Header and footer navigation.
  await page.goto("/");
  for (const name of ["Guides", "About", "Contact"]) {
    await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name })).toBeVisible();
  }
  for (const name of ["Home", "Guides", "About", "Contact", "Terms", "Privacy"]) {
    await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name, exact: true })).toBeVisible();
  }
});

test("terms and privacy are separate and cross-linked; no ads or ad cookies mentioned", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/terms");
  await expect(page.locator("article").getByRole("link", { name: "Privacy policy" })).toHaveAttribute("href", "/privacy");
  await page.goto("/privacy");
  await expect(page.locator("article").getByRole("link", { name: "Terms of use" })).toHaveAttribute("href", "/terms");
  const privacy = (await page.locator("article").textContent())!;
  expect(privacy).toContain("No cookies.");
  expect(privacy).toContain("No analytics");
  expect(privacy).toMatch(/hashed/);
  expect(privacy).toContain("about 1 hour");
  expect(privacy).not.toMatch(/\badvertis|\bads\b|AdSense/i);
});

test("@config contact page shows the configured email", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/contact");
  await expect(page.locator("article").getByRole("link", { name: "hello@example.org" })).toHaveAttribute(
    "href",
    "mailto:hello@example.org",
  );
});

test("placeholder guard: blocks a real domain with leftovers, passes when clean or on a temporary host", () => {
  const tsx = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const run = (env: Record<string, string>, dir?: string) =>
    spawnSync(process.execPath, [tsx, "scripts/check-placeholders.ts", ...(dir ? ["--dir", dir] : [])], {
      env: { ...process.env, SITE_URL: "", ALLOW_INDEXING: "", CONTACT_EMAIL: "", ABUSE_CONTACT_EMAIL: "", ...env },
      encoding: "utf8",
    });
  const marker = "[[" + "ADD: test placeholder]]";
  const withMarker = mkdtempSync(join(tmpdir(), "ph-dirty-"));
  const clean = mkdtempSync(join(tmpdir(), "ph-clean-"));
  writeFileSync(join(withMarker, "page.tsx"), `export const x = "${marker}";`);
  writeFileSync(join(clean, "page.tsx"), `export const x = "done";`);
  try {
    const real = { SITE_URL: "https://example.com", CONTACT_EMAIL: "hello@example.org" };
    expect(run(real, withMarker).status, "real domain + placeholder → fail").toBe(1);
    expect(run(real, clean).status, "real domain + clean → pass").toBe(0);
    expect(run({ SITE_URL: "https://example.com" }, clean).status, "real domain + no contact email → fail").toBe(1);
    expect(run({ SITE_URL: "https://foo.vercel.app" }, withMarker).status, "temporary host → pass").toBe(0);
    expect(run({ ...real, ALLOW_INDEXING: "false" }, withMarker).status, "kill switch → pass").toBe(0);
    // The real source still has owner placeholders, so a real domain must be blocked today.
    expect(run(real).status, "current source on a real domain → fail").toBe(1);
  } finally {
    rmSync(withMarker, { recursive: true, force: true });
    rmSync(clean, { recursive: true, force: true });
  }
});
