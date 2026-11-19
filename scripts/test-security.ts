/**
 * Step 6 security tests against the REAL database + bucket.
 *
 *   npm run test:security               builds the app (~1 min), then runs everything
 *   npm run test:security -- --no-build reuse the last build
 *
 * Starts its own production servers (`next start`) on ports 3210-3214, each with
 * different env overrides (short window, tiny caps, bad key, unreachable Supabase).
 * Your own `npm run dev` is not touched. Client IPs are simulated with X-Forwarded-For,
 * which only works off Vercel. Every clip, file and rate_limits row the script
 * creates is deleted at the end, even on failure.
 */
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { STORAGE_BUCKET, generateCode } from "@/lib/clips";
import { rateLimitKey, type Bucket } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const NEXT_BIN = "node_modules/next/dist/bin/next";
const MB = 1024 * 1024;
const BUCKETS: Bucket[] = ["lookup-fail", "create", "create-file", "complete", "download", "health"];
const KEY_FORMAT = /^(lookup-fail|create|create-file|complete|download|health):[0-9a-f]{32}$/;
/** Anything that looks like a raw internal error in a response body. */
const LEAK = /supabase|postgres|pgrst|jwt|api key|apikey|stack|fetch failed|econnrefused|typeerror|\bat .+:\d+:\d+/i;

const createdCodes = new Set<string>();
const usedIps = new Set<string>();
const servers: Array<{ stop: () => void }> = [];
let failures = 0;

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function check(ok: boolean, label: string, detail?: unknown) {
  const d = !ok && detail !== undefined ? `  -> ${JSON.stringify(detail).slice(0, 300)}` : "";
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${d}`);
  if (!ok) failures++;
}

/** A fresh client IP from 198.18.0.0/15 (reserved for testing). */
function newIp(): string {
  const b = randomBytes(3);
  const ip = `198.${18 + (b[0] & 1)}.${b[1]}.${1 + (b[2] % 254)}`;
  usedIps.add(ip);
  return ip;
}

type Res = { status: number; headers: Headers; text: string; json: Record<string, unknown> };

async function call(
  base: string,
  method: "GET" | "POST",
  path: string,
  opts: { ip?: string; json?: unknown; body?: BodyInit; headers?: Record<string, string> } = {},
): Promise<Res> {
  const headers: Record<string, string> = { "X-Forwarded-For": opts.ip ?? newIp(), ...opts.headers };
  let body = opts.body;
  if (opts.json !== undefined) {
    headers["Content-Type"] ??= "application/json";
    body = JSON.stringify(opts.json);
  }
  const init: RequestInit & { duplex?: "half" } = { method, headers, body };
  if (body instanceof ReadableStream) init.duplex = "half";
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, init);
  } catch (err) {
    // After a 413 the server stops reading and closes that connection; Node's fetch may
    // reuse it for the next request and get ECONNRESET. Browsers retry this silently; so do we.
    const reset = (err as { cause?: { code?: string } }).cause?.code === "ECONNRESET";
    if (!reset || body instanceof ReadableStream) throw err;
    res = await fetch(`${base}${path}`, init);
  }
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    /* not JSON */
  }
  if (typeof json.code === "string") createdCodes.add(json.code);
  return { status: res.status, headers: res.headers, text, json };
}

/** Make sure at least `needSec` seconds remain in the current fixed window. */
async function ensureWindowRoom(windowSec: number, needSec: number) {
  const left = windowSec - ((Date.now() / 1000) % windowSec);
  if (left < needSec + 3) {
    console.log(`  (waiting ${Math.ceil(left + 1)} s for a fresh rate-limit window)`);
    await sleep((left + 1.5) * 1000);
  }
}

async function freeCode(): Promise<string> {
  for (;;) {
    const code = generateCode();
    const { data } = await supabaseAdmin.from("clips").select("id").eq("code", code);
    if (data && data.length === 0) return code;
  }
}

async function usage(): Promise<{ liveClips: number; liveBytes: number }> {
  const { data, error } = await supabaseAdmin.rpc("clip_usage").single<{ live_clips: number; live_bytes: number }>();
  if (error || !data) throw new Error(`clip_usage failed: ${error?.message}`);
  return { liveClips: Number(data.live_clips), liveBytes: Number(data.live_bytes) };
}

async function startServer(port: number, env: Record<string, string>): Promise<string> {
  const child: ChildProcess = spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const logs: string[] = [];
  child.stdout?.on("data", (d) => logs.push(String(d)));
  child.stderr?.on("data", (d) => logs.push(String(d)));
  const stop = () => {
    if (child.exitCode !== null) return;
    if (process.platform === "win32" && child.pid) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"]);
    else child.kill();
  };
  servers.push({ stop });

  const base = `http://localhost:${port}`;
  for (let i = 0; i < 80; i++) {
    if (child.exitCode !== null) throw new Error(`server on ${port} exited:\n${logs.join("").slice(-1500)}`);
    try {
      if ((await fetch(`${base}/api/clips/abc`)).status === 400) return base;
    } catch {
      /* not up yet */
    }
    await sleep(500);
  }
  throw new Error(`server on ${port} did not start:\n${logs.join("").slice(-1500)}`);
}

function stopAll() {
  for (const s of servers.splice(0)) s.stop();
}

/** Limits pinned to the spec defaults, so .env.local overrides can't skew the tests. */
const DEFAULT_LIMITS = {
  RATE_LIMIT_LOOKUP_FAILURES: "10",
  RATE_LIMIT_CREATES: "20",
  RATE_LIMIT_FILE_CREATES: "5",
  RATE_LIMIT_FILE_OPS: "30",
  RATE_LIMIT_HEALTH: "30",
  MAX_LIVE_CLIPS: "1000000",
  MAX_TOTAL_STORAGE_MB: "1000000",
};

// ---------------------------------------------------------------------------
// Scenario A: normal limits, 45-second window
// ---------------------------------------------------------------------------

const WINDOW = 45;

async function scenarioA() {
  console.log(`\n=== Server A: default limits, ${WINDOW}-second window ===`);
  const base = await startServer(3210, { ...DEFAULT_LIMITS, RATE_LIMIT_WINDOW_SECONDS: String(WINDOW) });

  // ---- 1) failed lookups ------------------------------------------------
  console.log("\n1) Failed lookups: 10 allowed, 11th -> 429; successes don't count");
  const real = await call(base, "POST", "/api/clips", { json: { text: "security test clip" } });
  check(real.status === 201, "set-up: created a real clip", real.status);
  const attacker = newIp();

  await ensureWindowRoom(WINDOW, 20);
  let okFetches = 0;
  for (let i = 0; i < 3; i++) if ((await call(base, "GET", `/api/clips/${real.json.code}`, { ip: attacker })).status === 200) okFetches++;
  check(okFetches === 3, "3 successful fetches of a real code -> 200");

  const fails: number[] = [];
  for (let i = 0; i < 10; i++) fails.push((await call(base, "GET", `/api/clips/${await freeCode()}`, { ip: attacker })).status);
  check(fails.every((s) => s === 404), "10 failed lookups -> all 404 (the 3 successes did not use up the budget)", fails);

  const eleventh = await call(base, "GET", `/api/clips/${await freeCode()}`, { ip: attacker });
  const retryAfter = Number(eleventh.headers.get("retry-after"));
  check(eleventh.status === 429, "11th failed lookup -> 429", eleventh.status);
  check(retryAfter >= 1 && retryAfter <= WINDOW, `Retry-After header present (${retryAfter} s)`, eleventh.headers.get("retry-after"));
  check(eleventh.json.error === "Too many requests. Please try again later.", "generic 429 body", eleventh.json);

  const blockedGood = await call(base, "GET", `/api/clips/${real.json.code}`, { ip: attacker });
  check(blockedGood.status === 429, "a real code is ALSO refused while blocked (no mixing in good codes)", blockedGood.status);
  const blockedDl = await call(base, "GET", `/api/clips/${await freeCode()}/download`, { ip: attacker });
  check(blockedDl.status === 429, "download shares the failed-lookup block", blockedDl.status);
  const otherIp = await call(base, "GET", `/api/clips/${real.json.code}`);
  check(otherIp.status === 200, "a different IP is unaffected", otherIp.status);

  // ---- 2) reset ---------------------------------------------------------
  console.log(`\n2) Limit resets after the window (waiting ${retryAfter + 1} s as told by Retry-After)`);
  await sleep((retryAfter + 1) * 1000);
  const after = await call(base, "GET", `/api/clips/${await freeCode()}`, { ip: attacker });
  check(after.status === 404, "lookup allowed again after the window (404, not 429)", after.status);

  // ---- 3) create limits (sent in parallel: also proves the counter is atomic) ----
  console.log("\n3) Create limits");
  await ensureWindowRoom(WINDOW, 20);
  const textIp = newIp();
  const textRes = await Promise.all(
    Array.from({ length: 21 }, (_, i) => call(base, "POST", "/api/clips", { ip: textIp, json: { text: `burst ${i}` } })),
  );
  const t201 = textRes.filter((r) => r.status === 201).length;
  const t429 = textRes.filter((r) => r.status === 429);
  check(t201 === 20 && t429.length === 1, "21 parallel text creates -> exactly 20 × 201 and 1 × 429", textRes.map((r) => r.status));
  check(!!t429[0]?.headers.get("retry-after"), "429 has Retry-After");

  const fileIp = newIp();
  const fileRes = await Promise.all(
    Array.from({ length: 6 }, (_, i) =>
      call(base, "POST", "/api/clips", { ip: fileIp, json: { file: { name: `f${i}.txt`, size: 10 } } }),
    ),
  );
  const f201 = fileRes.filter((r) => r.status === 201).length;
  check(f201 === 5 && fileRes.filter((r) => r.status === 429).length === 1, "6 parallel file creates -> exactly 5 × 201 and 1 × 429", fileRes.map((r) => r.status));
  const textAfterFiles = await call(base, "POST", "/api/clips", { ip: fileIp, json: { text: "text still ok" } });
  check(textAfterFiles.status === 201, "same IP can still create TEXT clips (general limit 20 not reached)", textAfterFiles.status);

  const healthIp = newIp();
  const health = await Promise.all(Array.from({ length: 31 }, () => call(base, "GET", "/api/health", { ip: healthIp })));
  check(
    health.filter((r) => r.status === 200).length === 30 && health.filter((r) => r.status === 429).length === 1,
    "health: 30 × 200, then 429",
    health.map((r) => r.status),
  );

  // ---- 5) request hardening ---------------------------------------------
  console.log("\n5) Request hardening");
  const ip5 = newIp();
  const malformed = await call(base, "POST", "/api/clips", { ip: ip5, body: "{bad json", headers: { "Content-Type": "application/json" } });
  check(malformed.status === 400 && malformed.json.error === "Request body must be valid JSON.", "malformed JSON -> 400", malformed);
  const plain = await call(base, "POST", "/api/clips", { ip: ip5, body: '{"text":"x"}', headers: { "Content-Type": "text/plain" } });
  check(plain.status === 415, "Content-Type text/plain -> 415", plain.status);
  const form = await call(base, "POST", "/api/clips", { ip: ip5, body: "text=x", headers: { "Content-Type": "application/x-www-form-urlencoded" } });
  check(form.status === 415, "form-encoded -> 415", form.status);
  const noType = await call(base, "POST", "/api/clips", { ip: ip5 });
  check(noType.status === 415, "no Content-Type, no body -> 415", noType.status);

  const huge = JSON.stringify({ text: "a".repeat(MB + 10) });
  const big = await call(base, "POST", "/api/clips", { ip: ip5, body: huge, headers: { "Content-Type": "application/json" } });
  check(big.status === 413, "1 MB+ body (with Content-Length) -> 413", big.status);

  const enc = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(enc.encode('{"text":"'));
      for (let i = 0; i < 20; i++) c.enqueue(enc.encode("b".repeat(64 * 1024)));
      c.enqueue(enc.encode('"}'));
      c.close();
    },
  });
  const chunked = await call(base, "POST", "/api/clips", { ip: ip5, body: stream, headers: { "Content-Type": "application/json" } });
  check(chunked.status === 413, "1.3 MB streamed body WITHOUT Content-Length -> 413", chunked.status);

  const charset = await call(base, "POST", "/api/clips", { ip: ip5, json: { text: "ok" }, headers: { "Content-Type": "application/json; charset=utf-8" } });
  check(charset.status === 201, "application/json; charset=utf-8 accepted", charset.status);
  const extra = await call(base, "POST", "/api/clips", { ip: ip5, json: { text: "ok", admin: true, ready: false, id: "x" } });
  check(extra.status === 201, "unknown fields are ignored", extra.status);
  const longText = await call(base, "POST", "/api/clips", { ip: ip5, json: { text: "c".repeat(100_001) } });
  check(longText.status === 400, "100,001-char text (body < 1 MB) -> 400", longText.status);

  // ---- 7) headers -------------------------------------------------------
  console.log("\n7) Security headers");
  const targets: Array<[string, Res]> = [
    ["GET 404", await call(base, "GET", `/api/clips/${await freeCode()}`)],
    ["POST 400", await call(base, "POST", "/api/clips", { json: {} })],
    ["POST 415", await call(base, "POST", "/api/clips", { body: "x", headers: { "Content-Type": "text/plain" } })],
    ["health 200", await call(base, "GET", "/api/health")],
    ["cron 401", await call(base, "POST", "/api/cron/cleanup")],
  ];
  for (const [label, r] of targets) {
    const h = r.headers;
    const missing = [
      h.get("x-content-type-options") === "nosniff" ? null : "nosniff",
      h.get("referrer-policy") === "no-referrer" ? null : "referrer-policy",
      h.get("x-frame-options") === "DENY" ? null : "x-frame-options",
      (h.get("permissions-policy") ?? "").includes("camera=()") ? null : "permissions-policy",
      (h.get("cache-control") ?? "").includes("no-store") ? null : "no-store",
      h.get("x-powered-by") === null ? null : "x-powered-by present",
    ].filter(Boolean);
    check(missing.length === 0, `${label}: all headers present, no X-Powered-By`, missing);
  }
  const page = await fetch(`${base}/`);
  check(page.headers.get("x-frame-options") === "DENY" && page.headers.get("x-content-type-options") === "nosniff", "page / also has the security headers");

  // ---- 8) no raw IPs ----------------------------------------------------
  console.log("\n8) Raw IPs are never stored");
  const { data: rows, error } = await supabaseAdmin.from("rate_limits").select("*");
  check(!error && Array.isArray(rows) && rows.length > 0, `rate_limits readable (${rows?.length ?? 0} rows)`, error?.message);
  const allText = JSON.stringify(rows);
  check(rows!.every((r) => KEY_FORMAT.test(r.key)), 'every key is "<bucket>:<32 hex chars>"', rows!.find((r) => !KEY_FORMAT.test(r.key)));
  check([...usedIps].every((ip) => !allText.includes(ip)), `none of the ${usedIps.size} test IPs appears anywhere in the table`);
  check(!/127\.0\.0\.1|::1|localhost/.test(allText), "no localhost address appears either");
  check(rows!.every((r) => Object.keys(r).sort().join() === "count,key,window_start"), "only columns: key, window_start, count");
  check(rows!.some((r) => r.key === rateLimitKey("lookup-fail", attacker)), "the attacker's counter exists under its HMAC key");

  // ---- 9) earlier suites ------------------------------------------------
  console.log("\n9) Earlier test suites (against this server)");
  for (const [label, args] of [
    ["test:files", ["run", "test:files", "--", base]],
    ["test:collisions", ["run", "test:collisions"]],
  ] as const) {
    const r = spawnSync("npm", [...args], { shell: true, encoding: "utf8", timeout: 300_000 });
    const out = `${r.stdout}${r.stderr}`;
    const passed = r.status === 0 && out.includes("ALL PASSED");
    check(passed, `npm ${label} -> ALL PASSED`, out.split("\n").filter((l) => /FAIL|Error/.test(l)).slice(0, 8));
  }

  stopAll();
}

// ---------------------------------------------------------------------------
// Scenario B/C: global caps
// ---------------------------------------------------------------------------

async function scenarioCaps() {
  console.log("\n=== Server B: MAX_LIVE_CLIPS = current + 1 ===");
  console.log("\n4a) Live clip cap (a pending upload counts)");
  const u = await usage();
  const baseB = await startServer(3211, { ...DEFAULT_LIMITS, MAX_LIVE_CLIPS: String(u.liveClips + 1) });
  const pending = await call(baseB, "POST", "/api/clips", { json: { file: { name: "pending.txt", size: 10 } } });
  check(pending.status === 201, `pending file clip fills the last slot (${u.liveClips} -> ${u.liveClips + 1})`, pending.status);
  const t = await call(baseB, "POST", "/api/clips", { json: { text: "one too many" } });
  check(t.status === 503 && t.json.error === "The service is full right now. Please try again later.", "next text create -> 503 'service is full'", t);
  const f = await call(baseB, "POST", "/api/clips", { json: { file: { name: "x.txt", size: 10 } } });
  check(f.status === 503, "next file create -> 503", f.status);
  stopAll();

  console.log("\n=== Server C: MAX_TOTAL_STORAGE_MB just above current usage ===");
  console.log("\n4b) Storage cap (a pending upload's declared size counts)");
  const u2 = await usage();
  const capMb = Math.floor(u2.liveBytes / MB) + 1;
  const room = capMb * MB - u2.liveBytes;
  const baseC = await startServer(3212, { ...DEFAULT_LIMITS, MAX_TOTAL_STORAGE_MB: String(capMb) });
  const fill = await call(baseC, "POST", "/api/clips", { json: { file: { name: "fill.bin", size: room - 100 } } });
  check(fill.status === 201, `pending file declaring ${room - 100} bytes fits (cap ${capMb} MB)`, fill.status);
  const over = await call(baseC, "POST", "/api/clips", { json: { file: { name: "over.bin", size: 200 } } });
  check(over.status === 503 && over.json.error === "The service is full right now. Please try again later.", "200 more bytes -> 503 'service is full'", over);
  const text = await call(baseC, "POST", "/api/clips", { json: { text: "text uses no storage" } });
  check(text.status === 201, "a text-only clip still works (doesn't use file storage)", text.status);
  stopAll();
}

// ---------------------------------------------------------------------------
// Scenario D/E: Supabase broken
// ---------------------------------------------------------------------------

async function scenarioBroken() {
  const cases: Array<[number, string, Record<string, string>]> = [
    [3213, "invalid service key", { SUPABASE_SERVICE_ROLE_KEY: "fake-invalid-service-key-for-tests" }],
    [3214, "Supabase unreachable", { NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:9" }],
  ];
  for (const [port, label, env] of cases) {
    console.log(`\n=== Server ${port === 3213 ? "D" : "E"}: ${label} ===`);
    console.log(`\n6) No error details leak (${label})`);
    const base = await startServer(port, { ...DEFAULT_LIMITS, ...env });

    const h = await call(base, "GET", "/api/health");
    check(h.status === 503 && h.text === '{"ok":false}', 'health -> 503 with body exactly {"ok":false}', h.text);

    const c = await call(base, "POST", "/api/clips", { json: { text: "x" } });
    check(c.status === 503 && !LEAK.test(c.text), "create DENIED (limiter DB down) with generic 503", c.text);

    const g = await call(base, "GET", `/api/clips/123456`);
    check(g.status === 500 && !LEAK.test(g.text), "lookup: limiter fails open, then generic 500", g.text);

    const d = await call(base, "GET", `/api/clips/123456/download`);
    const p = await call(base, "POST", `/api/clips/123456/complete`);
    check(!LEAK.test(d.text) && !LEAK.test(p.text), "download / complete bodies are generic too", [d.text, p.text]);
    stopAll();
  }
}

// ---------------------------------------------------------------------------

async function cleanUp() {
  stopAll();
  const codes = [...createdCodes];
  if (codes.length > 0) {
    const { data } = await supabaseAdmin.from("clips").select("id, file_path").in("code", codes);
    const keys = (data ?? []).flatMap((r) => [r.id, r.file_path]).filter(Boolean) as string[];
    if (keys.length > 0) await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([...new Set(keys)]);
    for (let i = 0; i < codes.length; i += 100) {
      await supabaseAdmin.from("clips").delete().in("code", codes.slice(i, i + 100));
    }
  }
  const rlKeys = [...usedIps].flatMap((ip) => BUCKETS.map((b) => rateLimitKey(b, ip)));
  for (let i = 0; i < rlKeys.length; i += 100) {
    await supabaseAdmin.from("rate_limits").delete().in("key", rlKeys.slice(i, i + 100));
  }
  createdCodes.clear();
  console.log(`\nCleanup: removed ${codes.length} test clip(s) and the rate-limit rows of ${usedIps.size} test IP(s).`);
}

async function main() {
  if (!process.argv.includes("--no-build")) {
    console.log("Building the app (next build)…");
    const b = spawnSync(process.execPath, [NEXT_BIN, "build"], { stdio: "inherit" });
    if (b.status !== 0) {
      console.error("Build failed.");
      process.exit(1);
    }
  }
  process.on("SIGINT", () => {
    stopAll();
    process.exit(130);
  });

  try {
    for (const scenario of [scenarioA, scenarioCaps, scenarioBroken]) {
      try {
        await scenario();
      } catch (err) {
        failures++;
        console.error(`  FAIL  ${scenario.name} threw:`, err);
        stopAll();
      }
      await cleanUp();
    }
  } finally {
    await cleanUp();
  }
  console.log(failures === 0 ? "\nALL PASSED" : `\n${failures} CHECK(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
