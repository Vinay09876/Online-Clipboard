import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, testIp, unusedCode } from "./helpers";

/**
 * Security and abuse hardening (Growth Step 7b). Runs on the default server (3230) against the
 * real Supabase project; every row it inserts is removed at the end.
 */

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const TAG = "[abuse-test]";
const inserted: string[] = [];
/** Clips created through the API by these tests (files included); removed with their objects. */
const apiCodes: string[] = [];
test.afterAll(async () => {
  if (inserted.length) await admin.from("clips").delete().in("code", inserted).like("text_content", `${TAG}%`);
  if (apiCodes.length) {
    const { data: rows } = await admin.from("clips").select("file_path").in("code", apiCodes);
    const paths = (rows ?? []).map((r) => r.file_path).filter(Boolean) as string[];
    if (paths.length) await admin.storage.from("clip-files").remove(paths);
    await admin.from("clips").delete().in("code", apiCodes);
  }
  const { data } = await admin.from("clips").select("id").in("code", [...inserted, ...apiCodes]);
  expect(data ?? []).toEqual([]);
});

async function insert(row: Record<string, unknown>) {
  const { error } = await admin.from("clips").insert(row);
  if (error) throw error;
  inserted.push(String(row.code));
}

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
/** Headers that may differ per response for harmless reasons. */
const VOLATILE = new Set(["date", "x-nextjs-cache", "vary", "connection", "keep-alive", "transfer-encoding"]);
const stableHeaders = (h: Record<string, string>) =>
  Object.fromEntries(Object.entries(h).filter(([k]) => !VOLATILE.has(k.toLowerCase())).sort());

test("a nonexistent, an expired and a not-ready code look exactly the same (status, body, headers)", async ({ request }) => {
  const now = Date.now();
  const missing = await unusedCode();
  const expired = await unusedCode();
  const pending = await unusedCode();
  await insert({
    code: expired,
    text_content: `${TAG} expired`,
    created_at: new Date(now - 2 * 3600_000).toISOString(),
    expires_at: new Date(now - 3600_000).toISOString(),
  });
  // A file clip whose upload never finished (ready = false), still within its lifetime.
  await insert({
    code: pending,
    text_content: `${TAG} pending`,
    file_path: crypto.randomUUID(),
    file_name: "x.bin",
    file_size: 10,
    ready: false,
    expires_at: new Date(now + 1800_000).toISOString(),
  });

  const timings: Record<string, number[]> = {};
  const cases = [
    ["nonexistent", missing],
    ["expired", expired],
    ["not ready", pending],
  ] as const;
  for (const path of ["", "/download"]) {
    const seen = new Map<string, string>();
    // Interleaved rounds (a, b, c, a, b, c, …) so warm-up and network drift hit all cases alike;
    // round 0 is a warm-up and not timed.
    for (let round = 0; round < 7; round++) {
      for (const [label, code] of cases) {
        // A fresh client IP per request, so the failed-lookup limit doesn't interfere.
        const t0 = Date.now();
        const res = await request.get(`/api/clips/${code}${path}`, { headers: { "x-forwarded-for": testIp() } });
        if (round > 0) (timings[`${label}${path}`] ??= []).push(Date.now() - t0);
        const fingerprint = JSON.stringify([res.status(), await res.text(), stableHeaders(res.headers())]);
        seen.set(label, fingerprint);
      }
    }
    const distinct = new Set(seen.values());
    expect(distinct.size, `GET /api/clips/[code]${path}: ${[...seen].map(([l, f]) => `${l}=${f}`).join(" | ")}`).toBe(1);
    expect(JSON.parse([...distinct][0])[0]).toBe(404);
  }
  const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  test.info().annotations.push({
    type: "timings (median ms)",
    description: Object.entries(timings).map(([k, v]) => `${k}: ${median(v)}`).join(", "),
  });
});

test("POST /complete on a not-ready clip answers 409 (known, accepted: see docs/security-review.md)", async ({ request }) => {
  // The creator's page needs to tell "upload missing" from "no such clip". A guesser gains
  // nothing over GET: 404s here count against the same failed-lookup limit.
  const pending = await unusedCode();
  await insert({
    code: pending,
    text_content: `${TAG} pending 2`,
    file_path: crypto.randomUUID(),
    file_name: "y.bin",
    file_size: 10,
    ready: false,
    expires_at: new Date(Date.now() + 1800_000).toISOString(),
  });
  const ip = testIp();
  expect((await request.post(`/api/clips/${pending}/complete`, { headers: { "x-forwarded-for": ip } })).status()).toBe(409);
  expect((await request.post(`/api/clips/${await unusedCode()}/complete`, { headers: { "x-forwarded-for": ip } })).status()).toBe(404);
});

test("clip codes, texts, file names and IPs are never written to the server log", () => {
  for (const f of ["app/api/clips/route.ts", "app/api/clips/[code]/route.ts", "app/api/clips/[code]/complete/route.ts", "app/api/clips/[code]/download/route.ts"]) {
    for (const line of src(f).split("\n").filter((l) => /console\.(log|warn|error|info)/.test(l))) {
      expect(line, f).not.toMatch(/\$\{\s*(code|ip|text|input|file|fileName|name)\b/);
      expect(line, f).not.toMatch(/,\s*(code|ip|text|input|file|fileName)\s*\)/);
    }
  }
  // Database errors are logged with code + message only, never PostgREST "details" (which can echo row data).
  for (const f of ["lib/clips.ts", "lib/files.ts", "lib/cleanup.ts", "lib/gates.ts", "lib/fastRpc.ts", "lib/rateLimit.ts"]) {
    expect(src(f), f).not.toMatch(/error\??\.details|\.hint\b/);
  }
});

test("codes come from the cryptographic random generator and are unique in the database", () => {
  const clips = src("lib/clips.ts");
  expect(clips).toMatch(/import \{[^}]*randomInt[^}]*\} from "node:crypto"/);
  expect(clips).toMatch(/randomInt\(0, 1_000_000\)/);
  expect(clips).not.toMatch(/Math\.random/);
  expect(src("db/001_init.sql")).toMatch(/constraint clips_code_unique\s+unique \(code\)/);
});

test("download links live 60 seconds; the service key never reaches the browser", async ({ request }) => {
  expect(src("lib/files.ts")).toMatch(/DOWNLOAD_URL_TTL_SECONDS = 60\b/);
  const html = await (await request.get("/")).text();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  expect(html.includes(key)).toBe(false);
  expect(html).not.toMatch(/service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
});

test("GET /api/health/cleanup: ok normally, 503 'behind' when an expired clip is left over", async ({ request }) => {
  const ip = { headers: { "x-forwarded-for": testIp() } };
  const before = await request.get("/api/health/cleanup", ip);
  // The shared database could genuinely be behind; only assert the shape here.
  expect([200, 503]).toContain(before.status());
  const leftover = await unusedCode();
  await insert({
    code: leftover,
    text_content: `${TAG} stalled`,
    created_at: new Date(Date.now() - 3 * 3600_000).toISOString(),
    expires_at: new Date(Date.now() - 2 * 3600_000).toISOString(),
  });
  const behind = await request.get("/api/health/cleanup", ip);
  expect(behind.status()).toBe(503);
  expect(await behind.json()).toEqual({ cleanup: "behind" });
  expect(behind.headers()["cache-control"]).toBe("no-store");
  await admin.from("clips").delete().eq("code", leftover);
  if (before.status() === 200) {
    const ok = await request.get("/api/health/cleanup", ip);
    expect(ok.status()).toBe(200);
    expect(await ok.json()).toEqual({ cleanup: "ok" });
  }
});

test("a client that is already refused gets the same 429 without another database round trip", async ({ request }) => {
  const ip = testIp();
  const h = { headers: { "x-forwarded-for": ip, "Content-Type": "application/json" }, data: "{}" };
  // Invalid bodies still count against the create limit (20 per window), but create no clips.
  for (let i = 1; i <= 20; i++) expect((await request.post("/api/clips", h)).status(), `request ${i}`).toBe(400);
  const first = await request.post("/api/clips", h);
  expect(first.status()).toBe(429);
  // The key is HMAC(salt, ip), so read the counters by bucket prefix and value.
  const countRows = async () =>
    ((await admin.from("rate_limits").select("key, count").like("key", "create:%").gte("count", 21)).data ?? []).length;
  const before = await countRows();
  for (let i = 0; i < 5; i++) {
    const again = await request.post("/api/clips", h);
    expect(again.status()).toBe(429);
    expect(await again.json()).toEqual({ error: "Too many requests. Please try again later." });
    expect(Number(again.headers()["retry-after"])).toBeGreaterThan(0);
  }
  // Remembered refusals don't touch the database: no counter went past 21 because of them.
  const rows = (await admin.from("rate_limits").select("count").like("key", "create:%").gte("count", 22)).data ?? [];
  expect(rows, "the refused client's counter stayed at 21").toEqual([]);
  expect(await countRows()).toBe(before);
});

test("IPv6 is grouped by /56: changing the /64 inside it does not give a fresh limit", async ({ request }) => {
  // A random /56 for this run: 2001:db8:<random>:<xx>00::/56. 10 failures spread over 10 different /64s…
  const g3 = Math.floor(Math.random() * 0xffff).toString(16);
  const g4hi = (Math.floor(Math.random() * 0xff) << 8).toString(16);
  const inside = (n: number) => `2001:db8:${g3}:${(parseInt(g4hi, 16) | n).toString(16)}::${n + 1}`;
  for (let i = 0; i < 10; i++) {
    const r = await request.get(`/api/clips/${await unusedCode()}`, { headers: { "x-forwarded-for": inside(i) } });
    expect(r.status(), `failure ${i + 1} from ${inside(i)}`).toBe(404);
  }
  // …so an 11th /64 in the same /56 is already blocked.
  const blocked = await request.get(`/api/clips/${await unusedCode()}`, { headers: { "x-forwarded-for": inside(42) } });
  expect(blocked.status()).toBe(429);
});

test("@config global failed-lookup ceiling: once site-wide failures pass it, each client gets the strict allowance (needs db/006)", async ({ request }) => {
  // Server 3234: RATE_LIMIT_LOOKUP_FAILURES=4, ceiling 3 site-wide → 2 per client.
  const { error } = await admin.rpc("lookup_fail_allowance", {
    p_global_key: "probe:006", p_global_threshold: 1, p_fail_limit: 1, p_strict_limit: 1, p_window_seconds: 600,
  });
  test.skip(!!error, "db/006_lookup_ceiling.sql is not applied yet: the ceiling isn't active (expected until you apply it)");
  // Make sure the site-wide counter has reached 3 in this window (other tests may have done it already).
  for (let i = 0; i < 3; i++) await request.get(`/api/clips/${await unusedCode()}`, { headers: { "x-forwarded-for": testIp() } });
  const ip = testIp();
  const h = { headers: { "x-forwarded-for": ip } };
  expect((await request.get(`/api/clips/${await unusedCode()}`, h)).status()).toBe(404);
  expect((await request.get(`/api/clips/${await unusedCode()}`, h)).status()).toBe(404);
  // Normally 4 would be allowed; under the ceiling the 3rd attempt is refused.
  expect((await request.get(`/api/clips/${await unusedCode()}`, h)).status()).toBe(429);
});

test("risky file types: which names get the warning", async () => {
  const { riskyExtension } = await import("../lib/fileRisk");
  for (const [name, ext] of [
    ["setup.exe", "exe"],
    ["invoice.pdf.exe", "exe"],
    ["Install.MSI", "msi"],
    ["fix.ps1", "ps1"],
    ["run.bat ", "bat"],
    ["app.apk", "apk"],
  ] as const) {
    expect(riskyExtension(name), name).toBe(ext);
  }
  for (const name of ["photo.jpg", "notes.txt", "archive.zip", "report.pdf", "exe", "setup.exe.txt", "", null]) {
    expect(riskyExtension(name), String(name)).toBeNull();
  }
});

async function fileClip(request: import("@playwright/test").APIRequestContext, name: string): Promise<string> {
  const ip = { "x-forwarded-for": testIp() };
  const body = Buffer.from("not really a program");
  const c = await (await request.post("/api/clips", { headers: ip, data: { file: { name, size: body.length } } })).json();
  apiCodes.push(c.code);
  await fetch(c.upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body });
  expect((await request.post(`/api/clips/${c.code}/complete`, { headers: ip })).status()).toBe(200);
  return c.code;
}

test("receiver sees an honest warning before downloading a program or script, and can still download it", async ({ page, request, consoleProblems }) => {
  void consoleProblems;
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  const exe = await fileClip(request, "setup.exe");
  const jpg = await fileClip(request, "photo.jpg");

  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") await page.addInitScript(() => localStorage.setItem("theme", "dark"));
    await page.goto(`/#${exe}`);
    const warning = page.getByTestId("risky-file-warning");
    await expect(warning).toHaveText(/This is a program or script file \(\.exe\)\. Opening it can change or harm your device\. Only open it if you know and trust the person who sent it\./);
    const button = page.getByRole("button", { name: "Download" });
    await expect(button).toBeEnabled(); // a warning, not a block
    expect(await button.getAttribute("aria-describedby")).toBe(await warning.getAttribute("id"));
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`), theme).toEqual([]);
  }
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download" }).click();
  expect((await download).suggestedFilename()).toBe("setup.exe");

  await page.goto(`/#${jpg}`);
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  await expect(page.getByTestId("risky-file-warning")).toHaveCount(0);
});
