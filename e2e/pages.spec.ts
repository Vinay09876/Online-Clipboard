import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GUIDES, GUIDE_CATEGORIES, guidePath } from "../content/guides/index";
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
    expect(g.related).toHaveLength(3);
    for (const slug of g.related) {
      const r = GUIDES.find((x) => x.slug === slug)!;
      await expect(page.locator("article").getByRole("link", { name: r.title, exact: true })).toHaveAttribute("href", guidePath(slug));
    }
    // Exactly 3 related guides + the "All guides" link in the Related guides list.
    await expect(page.locator("article ul").last().locator("li")).toHaveCount(4);
    // The "Open EasyOnlinePaste" box, unless the guide switches it off (toolLink: false).
    const toolLink = page.locator("article").getByRole("link", { name: "Open EasyOnlinePaste" });
    if (g.toolLink === false) await expect(toolLink).toHaveCount(0);
    else await expect(toolLink).toHaveAttribute("href", "/");

    // Outbound links: official docs only, with rel="noopener noreferrer".
    const external = await page.locator('article a[href^="http"]').evaluateAll((els) =>
      els.map((a) => ({ href: a.getAttribute("href")!, rel: a.getAttribute("rel") ?? "" })),
    );
    for (const e of external) {
      expect(e.rel, e.href).toContain("noopener");
      expect(e.rel, e.href).toContain("noreferrer");
      expect(new URL(e.href).hostname, e.href).toMatch(/(^|\.)((apple|microsoft|google|whatsapp)\.com|telegram\.org)$/);
    }

    const article = (await jsonLdTypes(page)).find((d) => d["@type"] === "Article")!;
    expect(article).toMatchObject({
      headline: g.title,
      datePublished: g.datePublished,
      dateModified: g.dateModified,
      author: { "@type": "Organization", name: "EasyOnlinePaste" },
      publisher: { "@type": "Organization", name: "EasyOnlinePaste" },
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
    // The owner filled every placeholder (Step 6), so the real source passes on a real domain,
    // and still fails there without a contact email.
    expect(run(real).status, "current source on a real domain → pass").toBe(0);
    expect(run({ SITE_URL: "https://example.com" }).status, "current source, no contact email → fail").toBe(1);
  } finally {
    rmSync(withMarker, { recursive: true, force: true });
    rmSync(clean, { recursive: true, force: true });
  }
});

test("guide registry: unique, non-empty primary queries (no two guides for one search intent); 3 valid related each", () => {
  const norm = (q: string) => q.trim().toLowerCase().replace(/\s+/g, " ");
  const seen = new Map<string, string>();
  for (const g of GUIDES) {
    expect(norm(g.primaryQuery ?? ""), `${g.slug}: primaryQuery must not be empty`).not.toBe("");
    const q = norm(g.primaryQuery);
    expect(seen.get(q), `"${q}" is the primary query of both ${seen.get(q)} and ${g.slug}`).toBeUndefined();
    seen.set(q, g.slug);

    expect(g.related, `${g.slug}: exactly 3 related guides`).toHaveLength(3);
    expect(new Set(g.related).size, `${g.slug}: related guides are distinct`).toBe(3);
    for (const r of g.related) {
      expect(r, `${g.slug}: doesn't relate to itself`).not.toBe(g.slug);
      expect(GUIDES.some((x) => x.slug === r), `${g.slug}: related "${r}" exists`).toBe(true);
    }
  }
  expect(new Set(GUIDES.map((g) => g.slug)).size, "slugs are unique").toBe(GUIDES.length);
});

test("unknown guide slugs return a real 404 status (also with odd characters)", async ({ request }) => {
  for (const path of ["/guides/no-such-guide", "/guides/Send-Files-Too-Big-For-Email", "/guides/%3Cscript%3E"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(404);
  }
  expect((await request.get("/guides/send-files-too-big-for-email")).status()).toBe(200);
});

test("every guide has a valid category, and /guides groups them under category headings", async ({ page, consoleProblems }) => {
  void consoleProblems;
  const categoryIds = GUIDE_CATEGORIES.map((c) => c.id as string);
  for (const g of GUIDES) {
    expect(g.category, `${g.slug}: category`).toBeTruthy();
    expect(categoryIds, `${g.slug}: known category`).toContain(g.category);
  }
  await page.goto("/guides");
  for (const cat of GUIDE_CATEGORIES) {
    const members = GUIDES.filter((g) => g.category === cat.id);
    if (members.length === 0) continue;
    const section = page.locator(`section#${cat.id}`);
    await expect(section.getByRole("heading", { level: 2, name: cat.title })).toBeVisible();
    for (const g of members) {
      await expect(section.getByRole("link", { name: g.title, exact: true })).toHaveAttribute("href", guidePath(g.slug));
    }
    await expect(section.locator("h3")).toHaveCount(members.length);
  }
  // Every guide appears exactly once on the hub.
  await expect(page.locator("main section h3")).toHaveCount(GUIDES.length);
});

/** Visible guide body text (before "Official help pages"), with typographic quotes normalised. */
async function guideBodyText(page: import("@playwright/test").Page, slug: string): Promise<string> {
  await page.goto(guidePath(slug));
  return page.evaluate(() => {
    const art = document.querySelector("article > div")!;
    let out = "";
    for (const el of Array.from(art.children)) {
      if (el.tagName === "H2" && /Official help pages|Related guides/.test(el.textContent ?? "")) break;
      out += (el as HTMLElement).innerText + "\n";
    }
    return out;
  });
}
const normText = (s: string) => s.replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim().toLowerCase();

test("no sentence is shared between two guides (except the approved claims wording)", async ({ page }) => {
  const ALLOWED = ["text and files travel over https, but they are not end-to-end encrypted.", "until a clip expires, it sits on our servers"];
  const owners = new Map<string, Set<string>>();
  for (const g of GUIDES) {
    const text = await guideBodyText(page, g.slug);
    for (const sentence of text.split(/(?<=[.!?])\s+/).map(normText).filter((x) => x.split(" ").length >= 6)) {
      if (!owners.has(sentence)) owners.set(sentence, new Set());
      owners.get(sentence)!.add(g.slug);
    }
  }
  const shared = [...owners].filter(([s, v]) => v.size > 1 && !ALLOWED.some((a) => s.startsWith(a)));
  expect(shared.map(([s, v]) => `${s} => ${[...v].join(", ")}`)).toEqual([]);
});

test("every quote in docs/verification-checklist.md appears on its guide page", async ({ page }) => {
  const doc = readFileSync(join(process.cwd(), "docs", "verification-checklist.md"), "utf8");
  let slug: string | null = null;
  const checks: Array<{ slug: string; quote: string }> = [];
  for (const line of doc.split(/\r?\n/)) {
    const h = /^## \d+\..*\(`\/guides\/([^`]+)`\)/.exec(line);
    if (h) slug = h[1];
    else if (/^## /.test(line)) slug = null; // e.g. "Site-wide"
    const q = /^\s*> "(.+)"\s*$/.exec(line);
    if (q && slug) checks.push({ slug, quote: q[1] });
  }
  expect(checks.length).toBeGreaterThan(40);
  const slugs = new Set(checks.map((c) => c.slug));
  expect(slugs.size, "every guide has a section").toBe(GUIDES.length);
  const texts = new Map<string, string>();
  for (const s of slugs) texts.set(s, normText(await guideBodyText(page, s)));
  const missing = checks.filter((c) => !texts.get(c.slug)!.includes(normText(c.quote)));
  expect(missing).toEqual([]);
});
