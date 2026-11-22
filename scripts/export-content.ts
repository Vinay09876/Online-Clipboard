/**
 * Exports the text of every public page into ONE Markdown file, for proofreading.
 * The file goes to content-export/ (git-ignored), never into tracked files.
 *
 *   npm run export:content                         from http://localhost:3000
 *   npm run export:content -- https://online-clipboard-rose.vercel.app
 *
 * Uses Playwright's Chromium (already installed for the tests) to read the rendered pages:
 * headings, paragraphs, list items, FAQ questions/answers, plus each page's title and
 * meta description.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { SITE_PAGES } from "../lib/sitePages";

const base = (process.argv.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/+$/, "");

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const out: string[] = [`# Online Clipboard: all page text`, ``, `Exported ${new Date().toISOString()} from ${base}`, ``];

  for (const { path } of SITE_PAGES) {
    await page.goto(`${base}${path}`);
    const title = await page.title();
    const description = (await page.locator('meta[name="description"]').getAttribute("content")) ?? "";
    const blocks = await page.evaluate(() => {
      const main = document.querySelector("main") ?? document.body;
      const lines: string[] = [];
      for (const el of main.querySelectorAll("h1, h2, h3, p, li, summary, dt, dd, td, th, figcaption")) {
        // Skip text that only repeats a child block (e.g. <li><p>…</p></li>).
        if (el.querySelector("p, li, h2, h3")) continue;
        const text = (el as HTMLElement).innerText.replace(/\s+/g, " ").trim();
        if (!text) continue;
        const tag = el.tagName;
        lines.push(
          tag === "H1" ? `## ${text}` : tag === "H2" ? `### ${text}` : tag === "H3" ? `#### ${text}` : tag === "LI" ? `- ${text}` : tag === "SUMMARY" ? `**Q: ${text}**` : text,
        );
      }
      return lines;
    });
    out.push(`---`, ``, `**Page:** ${path}  `, `**Title:** ${title}  `, `**Description:** ${description}`, ``, ...blocks.flatMap((b) => [b, ""]));
  }
  await browser.close();

  const dir = join(process.cwd(), "content-export");
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `content-${new Date().toISOString().slice(0, 10)}.md`);
  writeFileSync(file, out.join("\n"), "utf8");
  console.log(`Wrote ${SITE_PAGES.length} pages to ${file}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
