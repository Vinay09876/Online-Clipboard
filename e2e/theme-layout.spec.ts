import { expect, test } from "./helpers";

/**
 * Theme switch, header/tool alignment, and the "On this page" links.
 * The consoleProblems fixture also proves the inline theme script runs without a CSP violation.
 */

/**
 * "light" or "dark", from the body background's lightness. Tailwind 4 colours are reported as
 * lab()/oklch() by the browser, so compare lightness instead of exact rgb values.
 */
const bg = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const c = getComputedStyle(document.body).backgroundColor;
    const n = Number(/^(?:lab|oklch|oklab)\(\s*([\d.]+)/.exec(c)?.[1] ?? NaN);
    // lab/oklab/oklch: first value is lightness (0-100 or 0-1). rgb: average of channels → 0-100.
    const lightness = Number.isFinite(n)
      ? n <= 1
        ? n * 100
        : n
      : (c.match(/\d+/g) ?? []).slice(0, 3).map(Number).reduce((a, b) => a + b, 0) / 7.65;
    return lightness > 50 ? "light" : "dark";
  });
const LIGHT_BG = "light";
const DARK_BG = "dark";

test("theme: light by default, even when the device prefers dark", async ({ browser }) => {
  for (const scheme of ["light", "dark"] as const) {
    const ctx = await browser.newContext({ colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto("/");
    expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
    expect(await bg(page), `device prefers ${scheme}`).toBe(LIGHT_BG);
    await expect(page.getByRole("button", { name: "Dark theme" })).toHaveAttribute("aria-pressed", "false");
    await ctx.close();
  }
});

test("theme: one click to dark, one click back to light; dark persists and applies before paint", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Dark theme" });
  await expect(page.locator("header button")).toHaveCount(1); // a single theme button

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await bg(page)).toBe(DARK_BG);
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");

  // After a reload, dark is already on <html> when the DOM is parsed (no flash).
  await page.reload({ waitUntil: "commit" });
  await page.waitForFunction(() => document.readyState !== "loading");
  expect(await page.evaluate(() => document.documentElement.getAttribute("data-theme"))).toBe("dark");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect(await page.locator("html").getAttribute("data-theme")).toBeNull();
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBeNull();
  expect(await bg(page)).toBe(LIGHT_BG);

  // Keyboard operable.
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
});

test("the inline theme script carries the CSP nonce", async ({ request }) => {
  const res = await request.get("/");
  const nonce = /'nonce-([^']+)'/.exec(res.headers()["content-security-policy"] ?? "")?.[1];
  const html = await res.text();
  const tag = /<script nonce="([^"]+)">\(function\(\)\{try\{if\(localStorage\.getItem\("theme"\)==="dark"\)/.exec(html);
  expect(tag, "theme script present").toBeTruthy();
  expect(tag![1]).toBe(nonce);
});

test("header and the tool share the same left and right edges on desktop", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  const logo = (await page.locator("header a").first().boundingBox())!;
  const toggle = (await page.getByRole("button", { name: "Dark theme" }).boundingBox())!;
  const tool = (await page.getByRole("tablist").locator("..").boundingBox())!;
  expect(Math.abs(logo.x - tool.x), "logo lines up with the tool's left edge").toBeLessThanOrEqual(1);
  expect(Math.abs(toggle.x + toggle.width - (tool.x + tool.width)), "theme button lines up with the tool's right edge").toBeLessThanOrEqual(1);
});

test("'On this page' links jump to the sections below the tool @mobile", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "On this page" });
  for (const [name, id] of [
    ["How it works", "how-it-works"],
    ["Privacy and security", "privacy-and-security"],
    ["FAQ", "faq"],
  ] as const) {
    await expect(nav.getByRole("link", { name })).toHaveAttribute("href", `#${id}`);
  }
  await nav.getByRole("link", { name: "FAQ" }).click();
  await expect(page).toHaveURL(/#faq$/);
  await expect(page.locator("#faq h2")).toBeInViewport();
  // The content is still on the page (not hidden behind a click).
  await expect(page.getByRole("heading", { name: "How it works", level: 2 })).toBeAttached();
});

test("nodes the host injects (Netlify's head comment and badge script) cause no hydration error", async ({ page, consoleProblems }) => {
  // Netlify's free plan appends <script async src="/.netlify/scripts/hud…"> after </html>.
  // Browsers move it into <body>, where React would find an element it didn't render (error #418).
  await page.route("**/terms", async (route) => {
    const res = await route.fetch();
    // Exactly what Netlify's edge adds (seen on the live site, 2026-11-22): a newline + comment
    // inside <head> right after <meta charSet>, and the badge script after </html>.
    const html =
      (await res.text()).replace(
        '<meta charSet="utf-8"/>',
        '<meta charSet="utf-8"/>\n<!-- This site is hosted on Netlify. Anyone can build and deploy a site\n     like this one for free. -->',
      ) + '<script async src="/.netlify/scripts/hud?variant=public" data-nf-variant="public"></script>';
    await route.fulfill({ response: res, body: html });
  });
  await page.goto("/terms");
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
  await page.getByRole("button", { name: "Dark theme" }).click(); // hydrated and interactive
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.locator("script[data-nf-variant]").count(), "injected tag removed").toBe(0);
  // The CSP still blocks the injected script before it is removed; that report is expected.
  const problems = consoleProblems.filter((p) => !p.includes("/.netlify/scripts/hud"));
  expect(problems).toEqual([]);
  consoleProblems.length = 0;
});
