import type { Page } from "@playwright/test";
import { deleteCreatedClips, expect, rememberCode, routeApiWithIp, test, typeCode, unusedCode } from "./helpers";

/**
 * Detailed UI behaviour, beyond the smoke tests: clipboard, cancel/retry, drag & drop,
 * offline handling, keyboard use, resets, the maximum text size, and the 404 page.
 */

test.afterAll(deleteCreatedClips);

async function readCode(page: Page): Promise<string> {
  const code = (await page.getByTestId("clip-code").textContent({ timeout: 90_000 }))!.trim();
  expect(code).toMatch(/^\d{6}$/);
  rememberCode(code);
  return code;
}

test("button labels and layout: visible 'Send'/'Get', names 'Send clip'/'Get clip', Send right-aligned under a centred note @mobile", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  const send = page.getByRole("button", { name: "Send clip", exact: true });
  await expect(send).toHaveText("Send");
  // The Send TAB keeps its own name; the button doesn't collide with it.
  await expect(page.getByRole("tab", { name: "Send", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Send", exact: true })).toHaveCount(0);

  // Expiry note: own line, centred, between the drop zone and the button.
  const note = page.getByText(/^Expires \d+ minutes? after creation\.$/);
  await expect(note).toHaveCSS("text-align", "center");
  const panel = (await page.getByRole("tabpanel").boundingBox())!;
  const drop = (await page.locator("label").filter({ hasText: "Add a file" }).boundingBox())!;
  const n = (await note.boundingBox())!;
  const b = (await send.boundingBox())!;
  expect(n.y, "note below the drop zone").toBeGreaterThan(drop.y + drop.height);
  expect(b.y, "button below the note").toBeGreaterThanOrEqual(n.y + n.height);
  // Right-aligned: the button's right edge sits at the panel's content edge, far from the left.
  expect(b.x, "button is on the right").toBeGreaterThan(panel.x + panel.width / 2 - b.width);
  expect(panel.x + panel.width - (b.x + b.width), "button near the right edge").toBeLessThan(40);

  await page.getByRole("tab", { name: "Receive" }).click();
  const get = page.getByRole("button", { name: "Get clip", exact: true });
  await expect(get).toHaveText("Get");
  await expect(get).toBeDisabled();
});

test("copy code and copy link put the right text on the clipboard", async ({ page, context, browserName, consoleProblems }) => {
  test.skip(browserName !== "chromium", "Reading the clipboard needs grantPermissions, which Playwright supports only in Chromium");
  void consoleProblems;
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill("clipboard check");
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  const code = await readCode(page);

  await page.getByRole("button", { name: "Copy code" }).click();
  await expect(page.getByRole("button", { name: "Copy code" }).getByText("Copied", { exact: true })).toBeVisible(); // visible feedback
  await expect(page.getByRole("status").filter({ hasText: "Copied to clipboard" })).toHaveCount(1); // announced
  await expect(page.getByRole("button", { name: "Copy code" })).toHaveAccessibleName("Copy code"); // name stays
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);

  await page.getByRole("button", { name: "Copy link" }).click();
  const origin = new URL(page.url()).origin;
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(`${origin}/#${code}`);

  // "Copied" goes back to the label after ~2 s.
  await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible({ timeout: 5000 });
});

test("text + file together: receiver sees both and can copy the text", async ({ page, context, ip, browserName, consoleProblems }) => {
  test.skip(browserName !== "chromium", "Reading the clipboard needs grantPermissions, which Playwright supports only in Chromium");
  void consoleProblems;
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill("notes\nwith two lines");
  await page.locator('input[type="file"]').setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("file body") });
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  const code = await readCode(page);

  const recv = await context.newPage();
  await routeApiWithIp(recv, ip);
  await recv.goto(`/#${code}`);
  await expect(recv.getByRole("textbox", { name: "Text" })).toHaveText("notes\nwith two lines", { useInnerText: true });
  await expect(recv.getByText("notes.txt")).toBeVisible();
  await expect(recv.getByText("9 B")).toBeVisible();
  await recv.getByRole("button", { name: "Copy text" }).click();
  // Windows turns "\n" into "\r\n" on the clipboard; compare without that difference.
  expect((await recv.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe("notes\nwith two lines");
  await recv.close();
});

test("cancel an upload, then retry it successfully", async ({ page, context, browserName, consoleProblems }) => {
  test.skip(browserName !== "chromium", "Slowing the upload uses a Chromium DevTools session (CDP), which only Chromium has");
  void consoleProblems;
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "slow.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(3 * 1024 * 1024, 7) });

  // Slow the network so there is time to press Cancel.
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 50, downloadThroughput: -1, uploadThroughput: 100 * 1024 });

  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  await expect(page.getByRole("progressbar")).toBeVisible();
  await page.getByRole("button", { name: "Cancel upload" }).click();
  await expect(page.getByText("Upload canceled.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Couldn't finish sending the file" })).toBeFocused();
  await expect(page.getByTestId("clip-code")).toHaveCount(0); // no code before complete

  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.getByRole("button", { name: "Retry upload" }).click();
  await readCode(page);
});

test("cancel, then 'Start over' returns to the form with the file still selected", async ({ page, context, consoleProblems, browserName }) => {
  test.skip(browserName !== "chromium", "Slowing the upload uses a Chromium DevTools session (CDP), which only Chromium has");
  void consoleProblems;
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name: "again.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(2 * 1024 * 1024, 3) });
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 50, downloadThroughput: -1, uploadThroughput: 100 * 1024 });
  // The UI never shows the code of an unfinished upload, so take it from the API
  // response; otherwise the pending test clip couldn't be cleaned up afterwards.
  const created = page.waitForResponse((r) => r.url().endsWith("/api/clips") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  rememberCode(((await (await created).json()) as { code: string }).code);
  await page.getByRole("button", { name: "Cancel upload" }).click();
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByText("again.bin")).toBeVisible();
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Text", { exact: true })).toBeFocused();
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
});

test("drag and drop a file, then remove it", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  const zone = page.getByText("Drop it here or click to choose");
  const dataTransfer = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["dropped content"], "dropped.txt", { type: "text/plain" }));
    return dt;
  });
  await zone.dispatchEvent("dragenter", { dataTransfer });
  await zone.dispatchEvent("dragover", { dataTransfer });
  await zone.dispatchEvent("drop", { dataTransfer });
  await expect(page.getByText("dropped.txt")).toBeVisible();
  await expect(page.getByText("15 B")).toBeVisible();

  await page.getByRole("button", { name: "Remove file dropped.txt" }).click();
  await expect(page.getByText("dropped.txt")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toBeFocused();

  // Two files at once are rejected.
  const two = await page.evaluateHandle(() => {
    const dt = new DataTransfer();
    dt.items.add(new File(["a"], "a.txt"));
    dt.items.add(new File(["b"], "b.txt"));
    return dt;
  });
  await page.getByText("Drop it here or click to choose").dispatchEvent("drop", { dataTransfer: two });
  await expect(page.getByRole("alert").filter({ hasText: "one file at a time" })).toBeVisible();
});

test("offline: friendly error, then 'Try again' works once back online", async ({ page, context, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill("offline test");
  await context.setOffline(true);
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  await expect(page.getByText("Can't reach the server. Check your connection and try again.")).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await readCode(page);
});

test("keyboard: tabs with arrow keys; code boxes ignore letters, Backspace and arrows work", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByRole("tab", { name: "Send" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Receive" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Receive" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Send" })).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Receive" })).toHaveAttribute("aria-selected", "true");

  const box = (n: number) => page.getByRole("textbox", { name: `Digit ${n} of 6` });
  await box(1).click();
  await page.keyboard.type("1a2b");
  await expect(box(1)).toHaveValue("1");
  await expect(box(2)).toHaveValue("2");
  await expect(box(3)).toBeFocused();
  await page.keyboard.press("Backspace"); // empty box: clears the previous one and moves back
  await expect(box(2)).toHaveValue("");
  await expect(box(2)).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(box(1)).toBeFocused();
  await expect(page.getByRole("button", { name: "Get clip", exact: true })).toBeDisabled();
});

test("'Send another' and 'Get another clip' reset and move focus", async ({ page, context, ip, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill("reset test");
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  const code = await readCode(page);

  const recv = await context.newPage();
  await routeApiWithIp(recv, ip);
  await recv.goto(`/#${code}`);
  await recv.getByRole("button", { name: "Get another clip" }).click();
  await expect(recv.getByRole("textbox", { name: "Digit 1 of 6" })).toBeFocused();
  await expect(recv.getByRole("textbox", { name: "Digit 1 of 6" })).toHaveValue("");
  // Typing it again works (and the Get button is an alternative to auto-fetch).
  await typeCode(recv, code);
  await expect(recv.getByRole("textbox", { name: "Text" })).toHaveText("reset test");
  await recv.close();

  await page.getByRole("button", { name: "Send another" }).click();
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Text", { exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeDisabled();
});

test("maximum text: 100,000 characters, counter turns red, extra input is cut off, round-trips", async ({ page, context, ip, consoleProblems }) => {
  void consoleProblems;
  const big = "x".repeat(99_990) + "END-MARKER";
  await page.goto("/");
  const ta = page.getByLabel("Text", { exact: true });
  await ta.fill(big + "OVERFLOW");
  await expect(page.getByText("100,000 / 100,000")).toBeVisible();
  expect((await ta.inputValue()).length).toBe(100_000);
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  const code = await readCode(page);

  const recv = await context.newPage();
  await routeApiWithIp(recv, ip);
  await recv.goto(`/#${code}`);
  const box = recv.getByRole("textbox", { name: "Text" });
  await expect(box).toHaveText(/END-MARKER$/); // wait until the clip is shown
  const text = await box.textContent();
  expect(text?.length).toBe(100_000);
  expect(text?.endsWith("END-MARKER")).toBe(true);
  await recv.close();
});

test("unknown page shows a 404 with the site footer", async ({ page, consoleProblems }) => {
  void consoleProblems;
  const res = await page.goto("/this-page-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await page.getByRole("link", { name: "Go to Online Clipboard" }).click();
  await expect(page.getByRole("tab", { name: "Send" })).toBeVisible();
  await page.goBack();
  await expect(page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Privacy" })).toBeVisible();
});

test("whitespace-only text can't be sent; the 'Get' button fetches like auto-fetch @mobile", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill("   \n  ");
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeDisabled();

  await page.getByRole("tab", { name: "Receive" }).click();
  const code = await unusedCode();
  // Fill the first five boxes, then use the button path for the last step.
  await typeCode(page, code);
  await expect(page.getByRole("alert").filter({ hasText: "Clip not found" })).toBeVisible();
});

test("text typed before the page finished loading is kept and can be sent (slow phones)", async ({ page, consoleProblems }) => {
  void consoleProblems;
  // Hold back the page's JavaScript for 1.5 s, so we type while React hasn't hydrated yet.
  await page.route("**/_next/static/chunks/**", async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await page.locator("textarea").first().fill("typed early");
  // Once React is ready, the early text counts: the button is enabled without another keystroke.
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeEnabled({ timeout: 15_000 });
  await expect(page.getByText("11 / 100,000")).toBeVisible();
});
