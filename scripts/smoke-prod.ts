/**
 * Smoke test for a DEPLOYED instance. Talks to the site only through its public URL,
 * like a visitor; needs no keys and no .env file.
 *
 *   npm run smoke:prod -- https://your-app.vercel.app
 *   npm run smoke:prod -- https://your-app.vercel.app --skip-spoof-test
 *   npm run smoke:prod -- https://your-app.vercel.app --lookup-limit 30   (if you raised RATE_LIMIT_LOOKUP_FAILURES)
 *
 * Safe for production: it creates one tiny text clip and one tiny file clip, which
 * expire on their own. The IP-spoofing check at the end deliberately trips the
 * failed-lookup limit, which LOCKS YOUR OWN IP out of code lookups for up to
 * 10 minutes (sending and the rest of the site still work).
 */
import { randomBytes } from "node:crypto";

const args = process.argv.slice(2);
const baseArg = args.find((a) => /^https?:\/\//.test(a));
const skipSpoof = args.includes("--skip-spoof-test");
const limitIdx = args.indexOf("--lookup-limit");
const LOOKUP_LIMIT = limitIdx >= 0 ? Number(args[limitIdx + 1]) : 10;
/** Must match RATE_LIMIT_WINDOW_SECONDS on the server (default 600). */
const WINDOW_SECONDS = 600;

if (!baseArg || !Number.isInteger(LOOKUP_LIMIT) || LOOKUP_LIMIT < 1) {
  console.error("Usage: npm run smoke:prod -- <baseUrl> [--skip-spoof-test] [--lookup-limit N]");
  process.exit(2);
}
const BASE = baseArg.replace(/\/+$/, "");

let failures = 0;
let warnings = 0;
function check(ok: boolean, label: string, detail?: unknown) {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${!ok && detail !== undefined ? `  -> ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  if (!ok) failures++;
}
function warn(label: string) {
  console.log(`  WARN  ${label}`);
  warnings++;
}

type Res = { status: number; headers: Headers; json: Record<string, unknown>; text: string };
async function call(method: "GET" | "POST", path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* HTML or empty */
  }
  return { status: res.status, headers: res.headers, json, text };
}

const randomCode = () => String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
const randomIp = () => Array.from(randomBytes(4), (b, i) => (i === 0 ? 1 + (b % 223) : b)).join(".");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function checkSecurityHeaders(label: string, h: Headers) {
  const missing = [
    h.get("x-content-type-options") === "nosniff" ? null : "X-Content-Type-Options",
    h.get("referrer-policy") === "no-referrer" ? null : "Referrer-Policy",
    h.get("x-frame-options") === "DENY" ? null : "X-Frame-Options",
    h.get("permissions-policy") ? null : "Permissions-Policy",
    h.get("content-security-policy") ? null : "Content-Security-Policy",
  ].filter(Boolean);
  check(missing.length === 0, `${label}: security headers + CSP present`, missing);
  check(h.get("x-powered-by") === null, `${label}: no X-Powered-By`, h.get("x-powered-by"));
}

async function main() {
  console.log(`Smoke-testing ${BASE}\n`);

  // ---------------------------------------------------------------- health
  console.log("1) Health");
  const health = await call("GET", "/api/health");
  check(health.status === 200 && health.text === '{"ok":true}', 'GET /api/health -> {"ok":true}', health.text);

  // -------------------------------------------------------- pages + headers
  console.log("\n2) Page and API headers");
  const page = await fetch(`${BASE}/`);
  const html = await page.text();
  check(page.status === 200, "GET / -> 200", page.status);
  checkSecurityHeaders("page /", page.headers);
  const csp = page.headers.get("content-security-policy") ?? "";
  const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
  check(!!nonce, "page CSP has a nonce", csp);
  check(!/unsafe-eval|ws:/.test(csp), "page CSP has no development relaxations", csp);
  check(/connect-src 'self' https:\/\/[a-z0-9-]+\.supabase\.co/.test(csp), "connect-src allows the Supabase project", csp);
  const scriptNonces = [...html.matchAll(/<script\b[^>]*>/g)].map((m) => /nonce="([^"]+)"/.exec(m[0])?.[1]);
  check(scriptNonces.length > 0 && scriptNonces.every((n) => n === nonce), `all ${scriptNonces.length} <script> tags carry the nonce`);
  if (BASE.startsWith("https://")) {
    if (!page.headers.get("strict-transport-security")) warn("no Strict-Transport-Security header (Vercel normally adds it)");
  }
  const terms = await fetch(`${BASE}/terms`);
  check(terms.status === 200, "GET /terms -> 200", terms.status);
  if ((await terms.text()).includes("[Placeholder] An abuse contact has not been configured")) {
    warn("ABUSE_CONTACT_EMAIL is not set: /terms shows the placeholder");
  }

  // ------------------------------------------------------------- text clip
  console.log("\n3) Text clip");
  const marker = `smoke test ${new Date().toISOString()}`;
  const created = await call("POST", "/api/clips", { text: marker });
  checkSecurityHeaders("API response", created.headers);
  check((created.headers.get("cache-control") ?? "").includes("no-store"), "API response is no-store");
  check(created.status === 201 && /^\d{6}$/.test(String(created.json.code)), "create text clip -> 201 + code", created.json);
  const got = await call("GET", `/api/clips/${created.json.code}`);
  check(got.status === 200 && got.json.text === marker, "fetch it back -> same text", got.json);

  // ------------------------------------------------------------- file clip
  console.log("\n4) File clip (direct upload to Supabase, then download)");
  const bytes = randomBytes(2048);
  const fc = await call("POST", "/api/clips", { file: { name: "smoke-test.bin", size: bytes.length } });
  const upload = fc.json.upload as { signedUrl?: string } | undefined;
  check(fc.status === 201 && !!upload?.signedUrl, "create file clip -> 201 + signed upload URL", fc.status);
  if (upload?.signedUrl) {
    const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(bytes) });
    check(put.status === 200, "PUT bytes to the signed URL (no API key)", put.status);
    const done = await call("POST", `/api/clips/${fc.json.code}/complete`);
    check(done.status === 200, "complete -> 200", done.status);
    const dl = await call("GET", `/api/clips/${fc.json.code}/download`);
    check(dl.status === 200 && typeof dl.json.url === "string", "download -> signed URL", dl.status);
    if (typeof dl.json.url === "string") {
      const file = await fetch(dl.json.url);
      const body = Buffer.from(await file.arrayBuffer());
      check(file.status === 200 && body.equals(bytes), "downloaded bytes equal uploaded bytes", file.status);
    }
  }

  // ------------------------------------------------------------ wrong code
  console.log("\n5) Wrong code");
  const wrong = await call("GET", `/api/clips/${randomCode()}`);
  if (wrong.status === 429) {
    console.log("\n  Your IP is still locked by an earlier run (failed-lookup limit). Wait 10 minutes and run again,");
    console.log("  or run with --skip-spoof-test.");
    process.exit(1);
  }
  check(wrong.status === 404 && wrong.json.error === "Clip not found.", "unknown code -> 404 'Clip not found.'", wrong.json);
  let failedLookups = 1; // the wrong-code request above

  // ------------------------------------------------------- spoofing check
  if (skipSpoof) {
    console.log("\n6) IP spoofing check: SKIPPED (--skip-spoof-test)");
  } else {
    console.log("\n6) IP spoofing check");
    console.log(
      `  WARNING: this deliberately trips the failed-lookup limit (${LOOKUP_LIMIT}) and locks YOUR IP out of\n` +
        "  code lookups for up to 10 minutes. Press Ctrl+C within 5 seconds to cancel.",
    );
    await sleep(5000);

    // Rate-limit windows are fixed and aligned to the clock (every 10 minutes: :00, :10, …).
    // If the loop below crossed a boundary, the counter would reset half-way and the result
    // would be meaningless. So start with at least 60 s left in the current window.
    const windowOf = (t: number) => Math.floor(t / 1000 / WINDOW_SECONDS);
    const left = WINDOW_SECONDS - ((Date.now() / 1000) % WINDOW_SECONDS);
    if (left < 60) {
      console.log(`  (waiting ${Math.ceil(left + 2)} s for the next rate-limit window to start)`);
      await sleep((left + 2) * 1000);
      failedLookups = 0; // new window: earlier failures no longer count
    }
    const startWindow = windowOf(Date.now());

    // Every request claims to come from a different client. If the platform trusted these
    // headers, every request would get a fresh limit and none would ever be refused.
    let blockedAt: number | null = null;
    for (let i = 1; i <= LOOKUP_LIMIT + 3; i++) {
      const fake = randomIp();
      const r = await call("GET", `/api/clips/${randomCode()}`, undefined, { "X-Forwarded-For": fake, "X-Real-IP": fake });
      if (r.status === 429) {
        blockedAt = i;
        break;
      }
      if (r.status === 404) failedLookups++;
    }
    const crossedWindow = windowOf(Date.now()) !== startWindow;

    if (blockedAt === null && crossedWindow) {
      // Not a verdict either way: run again.
      warn("INCONCLUSIVE: a rate-limit window boundary was crossed during the check. Wait 10 minutes and run again.");
    } else {
      check(
        blockedAt !== null,
        blockedAt !== null
          ? `refused with 429 after ${failedLookups} failed lookups, despite a different fake IP on every request`
          : "NOT refused: each fake X-Forwarded-For / X-Real-IP got a fresh limit",
      );
      console.log(
        blockedAt !== null
          ? "  => The platform overwrites X-Forwarded-For / X-Real-IP with the real client address, so the\n" +
              "     rate limit cannot be bypassed by faking headers. Your IP is now locked for up to 10 minutes."
          : "  => DANGER: the rate limit can be bypassed by faking headers. This is expected on localhost or\n" +
              "     `next start`, but must never happen on Vercel. Do not share the URL until this passes.",
      );
    }
  }

  console.log(
    failures === 0
      ? `\nALL PASSED${warnings ? ` (${warnings} warning${warnings > 1 ? "s" : ""})` : ""}`
      : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
