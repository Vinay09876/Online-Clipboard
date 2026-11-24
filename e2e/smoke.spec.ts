import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import { deleteCreatedClips, expect, rememberCode, routeApiWithIp, test, typeCode, unusedCode } from "./helpers";

test.afterAll(deleteCreatedClips);

/** Sends text from the current page (navigates to / first unless already there). */
async function sendText(page: import("@playwright/test").Page, text: string): Promise<string> {
  if (new URL(page.url(), "http://x").pathname !== "/" || page.url() === "about:blank") await page.goto("/");
  await page.getByLabel("Text", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  const code = (await page.getByTestId("clip-code").textContent())!.trim();
  expect(code).toMatch(/^\d{6}$/);
  rememberCode(code);
  return code;
}

test("text: send, then receive by typing the code and via a #link @mobile", async ({ page, context, ip, consoleProblems }) => {
  void consoleProblems;
  const text = `Hello from Playwright\n  indented line <b>not html</b> ${Date.now()}`;

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeDisabled();
  await page.getByLabel("Text", { exact: true }).fill(text);
  await expect(page.getByText(`${text.length} / 100,000`)).toBeVisible();
  const code = await sendText(page, text);

  await expect(page.getByRole("heading", { name: "Your code" })).toBeFocused();
  await expect(page.getByText(/Expires in \d+:\d\d/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy code" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy link" })).toBeVisible();

  // Receive by typing (auto-fetch on the 6th digit).
  await page.getByRole("tab", { name: "Receive" }).click();
  await typeCode(page, code);
  const box = page.getByRole("textbox", { name: "Text" });
  await expect(box).toHaveText(text, { useInnerText: true });
  await expect(page.locator("b")).toHaveCount(0); // rendered as plain text, not HTML

  // Receive via link in a new tab: fragment is fetched, then removed from the address bar.
  const other = await context.newPage();
  await routeApiWithIp(other, ip);
  await other.goto(`/#${code}`);
  await expect(other.getByRole("textbox", { name: "Text" })).toHaveText(text, { useInnerText: true });
  expect(new URL(other.url()).hash).toBe("");
  await other.close();
});

test("file: send with progress bar, receive, download identical bytes", async ({ page, context, ip, browserName, consoleProblems }) => {
  void consoleProblems;
  const bytes = randomBytes(6 * 1024 * 1024);
  const name = "report (1) é.bin";

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({ name, mimeType: "application/octet-stream", buffer: bytes });
  await expect(page.getByText(name)).toBeVisible();
  await expect(page.getByText("6.0 MB")).toBeVisible();

  await page.getByRole("button", { name: "Send clip", exact: true }).click();
  // Progress is shown, the Cancel button is offered, and no code is shown before complete.
  await expect(page.getByRole("progressbar")).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancel upload" })).toBeVisible();
  await expect(page.getByTestId("clip-code")).toHaveCount(0);

  const code = (await page.getByTestId("clip-code").textContent({ timeout: 90_000 }))!.trim();
  rememberCode(code);

  const recv = await context.newPage();
  await routeApiWithIp(recv, ip);
  await recv.goto(`/#${code}`);
  await expect(recv.getByText(name)).toBeVisible();
  await expect(recv.getByText("6.0 MB")).toBeVisible();

  const downloadPromise = recv.waitForEvent("download");
  await recv.getByRole("button", { name: "Download" }).click();
  const download = await downloadPromise;
  // The server sends both filename="report (1) _.bin" (ASCII fallback) and
  // filename*=UTF-8''report%20(1)%20%C3%A9.bin. Chromium and Firefox use the UTF-8 name;
  // Playwright's WebKit build for Windows uses the fallback (real Safari: docs/accessibility.md).
  expect(download.suggestedFilename()).toBe(browserName === "webkit" ? "report (1) _.bin" : name);
  const got = await readFile((await download.path())!);
  expect(got.equals(bytes)).toBe(true);
  await recv.close();
});

test("client-side file checks: empty file and too-large file are rejected", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  const input = page.locator('input[type="file"]');
  await input.setInputFiles({ name: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) });
  await expect(page.getByRole("alert").filter({ hasText: '"empty.txt" is empty' })).toBeVisible();
  await input.setInputFiles({ name: "huge.bin", mimeType: "application/octet-stream", buffer: Buffer.alloc(25 * 1024 * 1024 + 1) });
  await expect(page.getByRole("alert").filter({ hasText: "The limit is 25 MB" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send clip", exact: true })).toBeDisabled();
});

test("wrong code shows 'not found', clears the boxes and refocuses", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByRole("tab", { name: "Receive" }).click();
  await typeCode(page, await unusedCode());
  await expect(page.getByRole("alert").filter({ hasText: "Clip not found" })).toHaveText("Clip not found or expired.");
  await expect(page.getByRole("textbox", { name: "Digit 1 of 6" })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Digit 1 of 6" })).toHaveValue("");
});

test("pasting a full code fills all six boxes and fetches", async ({ page, browserName, consoleProblems }) => {
  void consoleProblems;
  // The test fakes a paste with a synthetic ClipboardEvent; Firefox ignores the data in
  // synthetic events. Real pasting in Firefox is on the manual list (docs/accessibility.md).
  test.skip(browserName === "firefox", "synthetic paste events carry no data in Firefox");
  const code = await unusedCode();
  await page.goto("/");
  await page.getByRole("tab", { name: "Receive" }).click();
  const first = page.getByRole("textbox", { name: "Digit 1 of 6" });
  await first.focus();
  await page.evaluate((c) => {
    const dt = new DataTransfer();
    dt.setData("text/plain", ` ${c.slice(0, 3)}-${c.slice(3)} `);
    document.activeElement!.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  }, code);
  await expect(page.getByRole("alert").filter({ hasText: "Clip not found" })).toHaveText("Clip not found or expired.");
});

test("429: after 10 failed lookups the form is locked with a live countdown", async ({ page, request, ip, consoleProblems }) => {
  void consoleProblems;
  // Rate-limit windows are aligned to the clock (every 600 s by default). If the failures below
  // straddled a boundary, the counter would reset half-way: start with at least 45 s left.
  const left = 600 - ((Date.now() / 1000) % 600);
  if (left < 45) await page.waitForTimeout((left + 2) * 1000);
  for (let i = 0; i < 10; i++) {
    const r = await request.get(`/api/clips/${await unusedCode()}`, { headers: { "x-forwarded-for": ip } });
    expect(r.status()).toBe(404);
  }
  await page.goto("/");
  await page.getByRole("tab", { name: "Receive" }).click();
  await typeCode(page, await unusedCode());

  const notice = page.getByRole("status").filter({ hasText: "Too many attempts" });
  await expect(notice).toBeVisible();
  const first = await notice.getByRole("timer").textContent();
  expect(first).toMatch(/^\d+:\d\d$/);
  await expect(page.getByRole("textbox", { name: "Digit 1 of 6" })).toBeDisabled();
  await expect(notice.getByRole("timer")).not.toHaveText(first!, { timeout: 3000 }); // it counts down
});

test("expired: sender and receiver both switch to the expired state", async ({ page, context, ip, consoleProblems }) => {
  void consoleProblems;
  await page.clock.install();
  const code = await sendText(page, "this will expire");
  await expect(page.getByText(/Expires in/)).toBeVisible();

  const recv = await context.newPage();
  await recv.clock.install();
  await routeApiWithIp(recv, ip);
  await recv.goto(`/#${code}`);
  await expect(recv.getByRole("textbox", { name: "Text" })).toHaveText("this will expire");

  await page.clock.fastForward("31:00");
  await recv.clock.fastForward("31:00");

  await expect(page.getByRole("heading", { name: "Your clip has expired" })).toBeVisible();
  await expect(recv.getByRole("heading", { name: "This clip has expired" })).toBeVisible();
  await expect(recv.getByText("this will expire")).toHaveCount(0);
  await expect(recv.getByRole("heading", { name: "This clip has expired" })).toBeFocused();
  await recv.close();
});

test("CSP: strict header with a per-request nonce, and every script carries it", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/"); // the page itself must load without violations (checked by the fixture)
  // Header and HTML from one plain request, so the nonce and the markup belong together.
  const doc = await request.get("/");
  const csp = doc.headers()["content-security-policy"] ?? "";
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  expect(nonce, "CSP header has a nonce").toBeTruthy();

  const isProd = !csp.includes("'unsafe-eval'");
  for (const directive of [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) {
    expect(csp).toContain(directive);
  }
  expect(csp).toMatch(new RegExp(`connect-src 'self' ${new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin}`));
  expect(csp).not.toContain("'unsafe-inline' 'strict-dynamic'"); // no inline-script escape hatch
  if (isProd) expect(csp, "production CSP has no dev relaxations").not.toMatch(/unsafe-eval|ws:/);

  // Every <script> in the HTML the server sent carries this request's nonce. (In dev, the
  // dev tools add more scripts at runtime; 'strict-dynamic' allows those, and any real
  // violation would be caught by the consoleProblems fixture.)
  const html = await doc.text();
  const tags = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => /nonce="([^"]+)"/.exec(m[0])?.[1]);
  expect(tags.length).toBeGreaterThan(0);
  expect(tags.every((n) => n === nonce)).toBe(true);

  // A fresh nonce per request.
  const again = await request.get("/");
  expect(/'nonce-([^']+)'/.exec(again.headers()["content-security-policy"] ?? "")?.[1]).not.toBe(nonce);

  // /terms has it too, and API responses get the locked-down JSON policy.
  const terms = await request.get("/terms");
  expect(terms.headers()["content-security-policy"]).toContain("'nonce-");
  const api = await request.get("/api/clips/abc");
  expect(api.headers()["content-security-policy"]).toBe("default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
});

test("terms page and footer link", async ({ page, consoleProblems }) => {
  void consoleProblems;
  await page.goto("/");
  await page.getByRole("navigation", { name: "Site" }).getByRole("link", { name: "Terms", exact: true }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole("heading", { name: "Terms of use", level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Privacy policy" })).toBeVisible();
  await page.getByRole("navigation", { name: "Breadcrumb" }).getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Send" })).toBeVisible();
});

test("download paused (monthly budget used up) shows a friendly message", async ({ page, consoleProblems }) => {
  void consoleProblems;
  // UI-only test: the API is mocked. scripts/test-egress.ts tests the real server side.
  const expiresAt = new Date(Date.now() + 20 * 60_000).toISOString();
  await page.route("**/api/clips/424242", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ text: null, fileName: "big.zip", fileSize: 1048576, createdAt: new Date().toISOString(), expiresAt }) }),
  );
  await page.route("**/api/clips/424242/download", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Downloads are paused until next month.", reason: "downloads_paused" }) }),
  );
  await page.goto("/#424242");
  await page.getByRole("button", { name: "Download" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Downloads are paused until next month" })).toContainText("Text clips still work");
});
