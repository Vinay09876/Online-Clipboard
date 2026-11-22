import { LEGAL_LAST_UPDATED } from "../content/legal";
import { GUIDES, guidePath } from "../content/guides/index";
import { SITE_PAGES } from "../lib/sitePages";
import { expect, test } from "./helpers";

/**
 * Automated content checks (Growth Step 6): things a proofreader would catch. Runs on the
 * default server (3230). Every claim in docs/verification-checklist.md being on its page is
 * already checked in pages.spec.ts.
 */

const PAGES = SITE_PAGES.map((p) => p.path);

/** Owner placeholders that are allowed until launch (docs/launch-checklist.md). */
const KNOWN_PLACEHOLDERS = [
  "[[" + "ADD: your name or pseudonym, as it should appear publicly]]",
  "[[" + "ADD: the country (and state, if relevant) whose law applies, e.g. India]]",
  "[[" + "ADD: one or two sentences, in your own words, about why you built this and who it is for]]",
];

async function textOf(page: import("@playwright/test").Page, path: string) {
  await page.goto(path);
  return {
    // innerText: what a reader sees.
    visible: await page.locator("body").innerText(),
    // Raw text nodes (not collapsed by the browser), to catch double spaces in the source.
    nodes: await page.evaluate(() => {
      const out: string[] = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.parentElement?.closest("script,style,template") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
      });
      while (walker.nextNode()) out.push(walker.currentNode.textContent ?? "");
      return out;
    }),
    title: await page.title(),
    description: (await page.locator('meta[name="description"]').getAttribute("content")) ?? "",
  };
}

test("no TODOs, lorem ipsum or unknown placeholders on any page", async ({ page }) => {
  for (const path of PAGES) {
    const { visible, title, description } = await textOf(page, path);
    const all = `${title}\n${description}\n${visible}`;
    expect(all, path).not.toMatch(/\b(TODO|FIXME|TBD|XXX)\b|lorem ipsum|\[object Object\]/i);
    // Leaked JavaScript values: case-sensitive whole words ("financial" contains "nan").
    expect(all, path).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
    const placeholders = all.match(/\[\[ADD:[^\]]*\]\]/g) ?? [];
    for (const p of placeholders) expect(KNOWN_PLACEHOLDERS, `${path}: unexpected placeholder`).toContain(p);
  }
});

test("no double spaces or doubled words", async ({ page }) => {
  const problems: string[] = [];
  for (const path of PAGES) {
    const { visible, nodes, title, description } = await textOf(page, path);
    for (const n of nodes) {
      const m = /\S {2,}\S/.exec(n);
      if (m) problems.push(`${path}: double space in "${n.trim().slice(0, 60)}"`);
    }
    for (const t of [visible, title, description]) {
      // Same line only: a breadcrumb "Guides" followed by the heading "Guides" is not a typo.
      for (const m of t.matchAll(/\b([A-Za-z]+)[ \t]+\1\b/gi)) {
        problems.push(`${path}: doubled word "${m[0]}"`);
      }
    }
  }
  expect(problems).toEqual([]);
});

test("the product name is written one way: Online Clipboard", async ({ page }) => {
  for (const path of PAGES) {
    const { visible, title, description } = await textOf(page, path);
    const all = `${title}\n${description}\n${visible}`;
    expect(all, path).not.toMatch(/OnlineClipboard|Online-Clipboard|online Clipboard|ONLINE CLIPBOARD/);
    expect(title, `${path}: title names the site`).toMatch(/Online Clipboard/);
  }
});

test("dates are valid: guides published ≤ modified ≤ today, legal date not in the future", async ({ page }) => {
  const today = new Date().toISOString().slice(0, 10);
  for (const g of GUIDES) {
    for (const d of [g.datePublished, g.dateModified]) {
      expect(d, g.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10), `${g.slug}: real calendar date`).toBe(d);
    }
    expect(g.datePublished <= g.dateModified, `${g.slug}: published ≤ modified`).toBe(true);
    expect(g.dateModified <= today, `${g.slug}: not in the future`).toBe(true);
  }
  // The legal pages print LEGAL_LAST_UPDATED as written; it must be a real, non-future date.
  const legal = new Date(LEGAL_LAST_UPDATED);
  expect(Number.isNaN(legal.getTime()), `LEGAL_LAST_UPDATED "${LEGAL_LAST_UPDATED}" parses`).toBe(false);
  expect(legal.getTime() <= Date.now()).toBe(true);
  await page.goto("/privacy");
  await expect(page.getByText(`Last updated ${LEGAL_LAST_UPDATED}`)).toBeVisible();
});

test("every guide is in the sitemap list and linked from the hub", async ({ page }) => {
  await page.goto("/guides");
  const hubLinks = await page.locator("main a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  for (const g of GUIDES) {
    expect(PAGES, `${g.slug} in lib/sitePages.ts (the sitemap source)`).toContain(guidePath(g.slug));
    expect(hubLinks, `${g.slug} on /guides`).toContain(guidePath(g.slug));
  }
});
