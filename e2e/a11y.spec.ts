import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { GUIDES, guidePath } from "../content/guides/index";
import { deleteCreatedClips, expect, rememberCode, test, typeCode, unusedCode } from "./helpers";

/**
 * Accessibility (Growth Step 6): axe-core checks for WCAG 2.0/2.1/2.2 A + AA and axe's best
 * practices, on every public page and every state of the tool, in light and dark theme, at
 * desktop and phone width. Runs on the default server (3230).
 */

test.afterAll(deleteCreatedClips);

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const MODES = [
  { theme: "light", width: 1280, height: 800 },
  { theme: "dark", width: 1280, height: 800 },
  { theme: "light", width: 390, height: 844 },
  { theme: "dark", width: 390, height: 844 },
] as const;

async function setup(page: Page, m: (typeof MODES)[number]) {
  await page.setViewportSize({ width: m.width, height: m.height });
  if (m.theme === "dark") await page.addInitScript(() => localStorage.setItem("theme", "dark"));
}

/** Runs axe on the current page; fails with a readable list of violations. */
async function expectNoViolations(page: Page, label: string) {
  if (label.includes("dark")) await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const readable = violations.map(
    (v) => `${v.id} (${v.impact}): ${v.help}\n      ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join("\n      ")}`,
  );
  expect(readable, label).toEqual([]);
}

const PAGES = ["/guides", guidePath(GUIDES[0].slug), "/about", "/contact", "/terms", "/privacy", "/no-such-page"];

for (const m of MODES) {
  const tag = `${m.theme}, ${m.width}px`;

  test(`axe: content pages (${tag})`, async ({ page, consoleProblems }) => {
    void consoleProblems;
    await setup(page, m);
    for (const path of PAGES) {
      await page.goto(path);
      await expectNoViolations(page, `${path} (${tag})`);
    }
  });

  test(`axe: tool, send states (${tag})`, async ({ page, consoleProblems }) => {
    void consoleProblems;
    await setup(page, m);
    await page.goto("/");
    await expectNoViolations(page, `home, empty (${tag})`);

    await page.getByLabel("Text", { exact: true }).fill("Accessibility check");
    await expectNoViolations(page, `send, text typed (${tag})`);

    const input = page.locator('input[type="file"]');
    await input.setInputFiles({ name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) });
    await expect(page.getByRole("alert").filter({ hasText: "is empty" })).toBeVisible();
    await expectNoViolations(page, `send, file error (${tag})`);

    await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByText("notes.txt")).toBeVisible();
    await expectNoViolations(page, `send, file chosen (${tag})`);

    await page.getByRole("button", { name: "Send clip", exact: true }).click();
    const code = (await page.getByTestId("clip-code").textContent({ timeout: 60_000 }))!.trim();
    rememberCode(code);
    await expectNoViolations(page, `send, result with code (${tag})`);
  });

  test(`axe: tool, receive states (${tag})`, async ({ page, consoleProblems }) => {
    void consoleProblems;
    await setup(page, m);
    // A clip to receive (text + file), created through the UI.
    await page.goto("/");
    await page.getByLabel("Text", { exact: true }).fill("Received text");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really a jpeg") });
    await page.getByRole("button", { name: "Send clip", exact: true }).click();
    const code = (await page.getByTestId("clip-code").textContent({ timeout: 60_000 }))!.trim();
    rememberCode(code);

    await page.goto("/");
    await page.getByRole("tab", { name: "Receive" }).click();
    await expectNoViolations(page, `receive, empty (${tag})`);

    await typeCode(page, await unusedCode());
    await expect(page.getByRole("alert").filter({ hasText: "Clip not found" })).toBeVisible();
    await expectNoViolations(page, `receive, not found (${tag})`);

    await typeCode(page, code);
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
    await expectNoViolations(page, `receive, text + file result (${tag})`);
  });
}
