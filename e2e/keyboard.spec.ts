import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
import { deleteCreatedClips, expect, rememberCode, test } from "./helpers";

/**
 * Keyboard-only walkthrough of the whole tool (Growth Step 6): no mouse clicks at all.
 * Checks the Tab order, that every focused control shows a visible focus indicator, that
 * focus moves to the right place after each action, and that results and errors are
 * announced through live regions.
 */

test.afterAll(deleteCreatedClips);

/** Describes the focused element: "role:name". */
async function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "body";
    const role =
      el.getAttribute("role") ??
      ({ A: "link", BUTTON: "button", TEXTAREA: "textbox", H2: "heading" } as Record<string, string>)[el.tagName] ??
      (el.tagName === "INPUT" ? `input-${(el as HTMLInputElement).type}` : el.tagName.toLowerCase());
    const label =
      el.getAttribute("aria-label") || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.textContent || "";
    return `${role}:${label.replace(/\s+/g, " ").trim().slice(0, 40)}`;
  });
}

/** The focused control (or, for the visually hidden file input, its label) shows an outline or ring. */
async function hasVisibleFocus(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    let el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    if (el instanceof HTMLInputElement && el.type === "file") el = el.closest("label");
    const s = getComputedStyle(el!);
    const outline = s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0;
    return outline || s.boxShadow !== "none";
  });
}

/** Presses Tab until `target` (a prefix of focused()) is reached; asserts visible focus on every stop. */
async function tabTo(page: Page, target: string, max = 40): Promise<string[]> {
  const stops: string[] = [];
  for (let i = 0; i < max; i++) {
    await page.keyboard.press("Tab");
    const f = await focused(page);
    if (f === "body") continue; // focus entering the document from the browser UI
    stops.push(f);
    expect(await hasVisibleFocus(page), `visible focus on ${f}`).toBe(true);
    if (f.startsWith(target)) return stops;
  }
  throw new Error(`never reached ${target}; stops: ${stops.join(" → ")}`);
}

test("keyboard only: tab order, send text, copy, switch tabs, receive", async ({ page, context, browserName, consoleProblems }) => {
  void consoleProblems;
  if (browserName === "chromium") await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  // 1. Order from the top of the page: skip link first, then header, then the tool.
  const stops = await tabTo(page, "textbox:Text");
  const links = ["link:Skip to content", "link:EasyOnlinePaste", "link:Guides", "link:About", "link:Contact"];
  // Safari (WebKit) skips links when tabbing unless the user turns on "Press Tab to highlight
  // each item" (or uses Option+Tab): platform behaviour, not ours.
  expect(stops).toEqual([...(browserName === "webkit" ? [] : links), "button:Dark theme", "tab:Send", "textbox:Text"]);

  // 2. Send text with the keyboard.
  await page.keyboard.type("Typed with the keyboard only");
  await tabTo(page, "input-file");
  await tabTo(page, "button:Send clip");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your code" })).toBeFocused(); // focus moves to the result
  const code = (await page.getByTestId("clip-code").textContent())!.trim();
  rememberCode(code);

  // 3. Copy code with the keyboard; the result is announced in a status region.
  await tabTo(page, "button:Copy code");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status").filter({ hasText: /Copied to clipboard|Copy failed/ })).toBeAttached();
  if (browserName === "chromium") expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);

  // 4. Switch to Receive with the arrow keys (tabs pattern), then type the code.
  await page.goto("/");
  await tabTo(page, "tab:Send");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Receive" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Receive" })).toHaveAttribute("aria-selected", "true");
  await tabTo(page, "input-text:Digit 1 of 6");
  await page.keyboard.type(code);
  await expect(page.getByRole("textbox", { name: "Text" })).toHaveText("Typed with the keyboard only", { useInnerText: true });
  expect(await focused(page)).toMatch(/^heading:/); // focus moved to the result heading
});

test("keyboard only: choose a file, send it, receive and download it", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await tabTo(page, "input-file");
  const chooser = page.waitForEvent("filechooser");
  await page.keyboard.press("Enter"); // Space works too; Enter is what most people try
  await (await chooser).setFiles({ name: "keyboard.txt", mimeType: "text/plain", buffer: Buffer.from("file via keyboard") });
  await expect(page.getByText("keyboard.txt")).toBeVisible();

  // The "Remove file" button is reachable and labelled with the file name.
  await tabTo(page, "button:Remove file keyboard.txt");
  await tabTo(page, "button:Send clip");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Your code" })).toBeFocused({ timeout: 60_000 });
  const code = (await page.getByTestId("clip-code").textContent())!.trim();
  rememberCode(code);

  await page.goto(`/#${code}`);
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  await page.getByRole("button", { name: "Download" }).focus();
  expect(await hasVisibleFocus(page)).toBe(true);
  const download = page.waitForEvent("download");
  await page.keyboard.press("Enter");
  const file = await download;
  expect(file.suggestedFilename()).toBe("keyboard.txt");
  expect((await readFile((await file.path())!)).toString()).toBe("file via keyboard");
});

test("keyboard only: a wrong code is announced as an alert and focus returns to the first box", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await tabTo(page, "tab:Send");
  await page.keyboard.press("ArrowRight");
  await tabTo(page, "input-text:Digit 1 of 6");
  await page.keyboard.type("000001".replace(/./g, () => String(Math.floor(Math.random() * 10))));
  const alert = page.getByRole("alert").filter({ hasText: /Clip not found|Too many/ });
  await expect(alert).toBeVisible();
  // The alert lives inside a polite live region, so screen readers announce it.
  expect(await alert.evaluate((el) => !!el.closest('[aria-live="polite"]'))).toBe(true);
  // A real code could exist by chance; only check the focus rule for "not found".
  if (/Clip not found/.test((await alert.textContent()) ?? "")) {
    await expect(page.getByRole("textbox", { name: "Digit 1 of 6" })).toBeFocused();
  }
});
