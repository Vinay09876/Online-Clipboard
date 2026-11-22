/**
 * Smoke test for a DEPLOYED instance (Vercel, Netlify, or any URL). Talks to the site only
 * through its public URL, like a visitor; needs no keys and no .env file.
 *
 *   npm run smoke:prod -- https://your-app.netlify.app
 *   npm run smoke:prod -- https://your-app.vercel.app
 *   npm run smoke:prod -- <url> --skip-spoof-test
 *   npm run smoke:prod -- <url> --lookup-limit 30   (if you raised RATE_LIMIT_LOOKUP_FAILURES)
 *
 * Safe for production: it creates a few tiny text clips and one tiny file clip, which expire
 * on their own. The IP-spoofing check at the end deliberately trips the failed-lookup limit,
 * which LOCKS YOUR OWN IP out of code lookups for up to 10 minutes (sending and the rest of
 * the site still work).
 *
 * Response times are printed at the end, so Vercel and Netlify can be compared: run it against
 * both from the same computer, one after the other.
 */
import { randomBytes } from "node:crypto";
import { isTemporaryHost } from "../lib/site";

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
const HOST = new URL(BASE).hostname;
const TEMPORARY = isTemporaryHost(HOST);

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
function explain(text: string) {
  console.log(`        ${text}`);
}

type Res = { status: number; headers: Headers; json: Record<string, unknown>; text: string; ms: number };
async function call(method: "GET" | "POST", path: string, body?: unknown, headers: Record<string, string> = {}): Promise<Res> {
  const t0 = performance.now();
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: "manual",
  });
  const text = await res.text();
  const ms = performance.now() - t0;
  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(text);
  } catch {
    /* HTML or empty */
  }
  return { status: res.status, headers: res.headers, json, text, ms };
}

const randomCode = () => String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
const randomIp = () => Array.from(randomBytes(4), (b, i) => (i === 0 ? 1 + (b % 223) : b)).join(".");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const nonceOf = (csp: string) => /'nonce-([^']+)'/.exec(csp)?.[1];

const timings: Record<string, number[]> = {};
const time = (label: string, ms: number) => (timings[label] ??= []).push(ms);

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

/** Checks one HTML page: nonce in CSP, every <script> carries it. Returns the nonce. */
function checkNonce(label: string, res: Res): string | undefined {
  const csp = res.headers.get("content-security-policy") ?? "";
  const nonce = nonceOf(csp);
  const tags = [...res.text.matchAll(/<script\b[^>]*>/g)].map((m) => m[0]);
  // Netlify's free plan injects its badge script (/.netlify/scripts/hud) after our page is
  // rendered, so it can't carry the nonce; the CSP blocks it (accepted in Growth Step 5).
  const injected = tags.filter((t) => /src="\/\.netlify\/scripts\//.test(t));
  if (injected.length > 0 && label === "page /") warn("Netlify's badge script is injected and blocked by the CSP (known, harmless)");
  const scripts = tags.filter((t) => !injected.includes(t)).map((t) => /nonce="([^"]+)"/.exec(t)?.[1]);
  check(
    !!nonce && scripts.length > 0 && scripts.every((n) => n === nonce),
    `${label}: all ${scripts.length} <script> tags carry the nonce from this response's CSP header`,
    { nonce, scriptNonces: [...new Set(scripts)] },
  );
  return nonce;
}

async function main() {
  console.log(`Smoke-testing ${BASE}${TEMPORARY ? "  (temporary host: must be noindex)" : ""}\n`);

  // ---------------------------------------------------------------- health
  console.log("1) Health");
  for (let i = 0; i < 5; i++) {
    const health = await call("GET", "/api/health");
    time("GET /api/health", health.ms);
    if (i === 0) check(health.status === 200 && health.text === '{"ok":true}', 'GET /api/health -> {"ok":true}', health.text);
  }

  // -------------------------------------------------------- pages + headers
  console.log("\n2) Pages, security headers, CSP nonce");
  const home = await call("GET", "/");
  time("GET / (page)", home.ms);
  check(home.status === 200, "GET / -> 200", home.status);
  checkSecurityHeaders("page /", home.headers);
  const csp = home.headers.get("content-security-policy") ?? "";
  check(!/unsafe-eval|ws:/.test(csp), "page CSP has no development relaxations", csp);
  check(/connect-src 'self' https:\/\/[a-z0-9-]+\.supabase\.co/.test(csp), "connect-src allows the Supabase project", csp);
  check(!/google|doubleclick/.test(csp), "CSP has no ad domains (ads are off)", csp);
  const n1 = checkNonce("page /", home);

  const home2 = await call("GET", "/");
  time("GET / (page)", home2.ms);
  const n2 = checkNonce("page / (second request)", home2);
  check(!!n1 && !!n2 && n1 !== n2, "two requests got DIFFERENT nonces (no page served from a cache)", { n1, n2 });
  if (n1 && n1 === n2) explain("A CDN cached the HTML: the nonce is reused, which weakens the CSP. See docs/deploy-netlify.md.");
  const cc = home.headers.get("cache-control") ?? "";
  // Next.js sends "private, no-store"; Vercel rewrites the browser-facing header to
  // "public, max-age=0, must-revalidate" (its edge only caches with s-maxage). Both forbid reuse.
  const noReuse = /no-store/.test(cc) || (/max-age=0\b/.test(cc) && !/s-maxage=[1-9]/.test(cc));
  check(noReuse, "page Cache-Control forbids reusing the page (no-store, or max-age=0 without s-maxage)", cc);
  const cacheStatus = home2.headers.get("cache-status");
  if (cacheStatus) {
    console.log(`  info  Cache-Status: ${cacheStatus}`);
    check(!/;\s*hit\b/i.test(cacheStatus), "the CDN did not answer the page from its cache", cacheStatus);
  }

  if (BASE.startsWith("https://") && !home.headers.get("strict-transport-security")) {
    warn("no Strict-Transport-Security header (Vercel and Netlify normally add it)");
  }

  const guide = await call("GET", "/guides/what-is-an-online-clipboard");
  check(guide.status === 200, "GET a guide -> 200", guide.status);
  checkNonce("guide page", guide);
  const unknownGuide = await call("GET", "/guides/this-guide-does-not-exist");
  check(unknownGuide.status === 404, "unknown guide slug -> real 404 status (not 200 with a 'not found' page)", unknownGuide.status);
  const missingPage = await call("GET", "/no-such-page");
  check(missingPage.status === 404, "unknown page -> 404", missingPage.status);

  const terms = await call("GET", "/terms");
  check(terms.status === 200, "GET /terms -> 200", terms.status);
  if (terms.text.includes("[Placeholder] An abuse contact has not been configured")) {
    warn("ABUSE_CONTACT_EMAIL is not set: /terms shows the placeholder");
  }

  // --------------------------------------------------------------- indexing
  console.log("\n3) Indexing and ads");
  const metaNoindex = /<meta name="robots" content="noindex/.test(home.text);
  const headerNoindex = /noindex/.test(home.headers.get("x-robots-tag") ?? "");
  if (TEMPORARY) {
    check(metaNoindex, `${HOST} is a temporary host: <meta name="robots"> is noindex`);
    check(headerNoindex, "X-Robots-Tag: noindex header on pages");
    const robots = await call("GET", "/robots.txt");
    check(/Disallow: \/\s*$/m.test(robots.text) && !/Sitemap:/i.test(robots.text), "robots.txt disallows everything, no sitemap", robots.text);
  } else {
    console.log(`  info  ${HOST} is not a temporary host: indexing depends on SITE_URL / ALLOW_INDEXING.`);
  }
  // The <meta> comes from the page render, the header from the proxy (an Edge Function on Netlify).
  // If they disagree, the proxy can't see SITE_URL / ALLOW_INDEXING at runtime.
  check(metaNoindex === headerNoindex, "proxy and page agree on indexing (meta robots vs X-Robots-Tag)", { metaNoindex, headerNoindex });
  if (metaNoindex !== headerNoindex) {
    explain("The proxy reads SITE_URL/ALLOW_INDEXING differently from the pages. On Netlify, give these variables");
    explain('the scope "All scopes" (or at least Functions + Runtime) and redeploy.');
  }
  const adsTxt = await call("GET", "/ads.txt");
  check(adsTxt.status === 404, "/ads.txt -> 404 while ads are off", adsTxt.status);
  check(!/adsbygoogle|google-adsense-account/.test(home.text + guide.text), "no ad code or AdSense meta tag on pages");

  // ------------------------------------------------------------- text clip
  console.log("\n4) Text clip");
  const marker = `smoke test ${new Date().toISOString()}`;
  const created = await call("POST", "/api/clips", { text: marker });
  time("POST /api/clips (create)", created.ms);
  checkSecurityHeaders("API response", created.headers);
  check((created.headers.get("cache-control") ?? "").includes("no-store"), "API response is no-store");
  check(created.status === 201 && /^\d{6}$/.test(String(created.json.code)), "create text clip -> 201 + code", created.json);
  const got = await call("GET", `/api/clips/${created.json.code}`);
  time("GET /api/clips/<code> (fetch)", got.ms);
  check(got.status === 200 && got.json.text === marker, "fetch it back -> same text", got.json);
  for (let i = 0; i < 2; i++) {
    const extra = await call("POST", "/api/clips", { text: `${marker} timing ${i + 2}` });
    if (extra.status === 201) time("POST /api/clips (create)", extra.ms);
    const again = await call("GET", `/api/clips/${created.json.code}`);
    if (again.status === 200) time("GET /api/clips/<code> (fetch)", again.ms);
  }

  // ------------------------------------------------------------- file clip
  console.log("\n5) File clip (direct upload to Supabase, then download)");
  const bytes = randomBytes(2048);
  const fc = await call("POST", "/api/clips", { file: { name: "smoke-test.bin", size: bytes.length } });
  time("POST /api/clips (create file)", fc.ms);
  const upload = fc.json.upload as { signedUrl?: string } | undefined;
  check(fc.status === 201 && !!upload?.signedUrl, "create file clip -> 201 + signed upload URL", fc.status);
  if (upload?.signedUrl) {
    const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(bytes) });
    check(put.status === 200, "PUT bytes to the signed URL (no API key)", put.status);
    const done = await call("POST", `/api/clips/${fc.json.code}/complete`);
    time("POST .../complete", done.ms);
    check(done.status === 200, "complete -> 200", done.status);
    const dl = await call("GET", `/api/clips/${fc.json.code}/download`);
    time("GET .../download (link)", dl.ms);
    check(dl.status === 200 && typeof dl.json.url === "string", "download -> signed URL", dl.status);
    if (typeof dl.json.url === "string") {
      const file = await fetch(dl.json.url);
      const body = Buffer.from(await file.arrayBuffer());
      check(file.status === 200 && body.equals(bytes), "downloaded bytes equal uploaded bytes", file.status);
    }
    for (let i = 0; i < 2; i++) {
      const again = await call("GET", `/api/clips/${fc.json.code}/download`);
      if (again.status === 200) time("GET .../download (link)", again.ms);
    }
  }

  // ------------------------------------------------------------ wrong code
  console.log("\n6) Wrong code");
  const wrong = await call("GET", `/api/clips/${randomCode()}`);
  if (wrong.status === 429) {
    console.log("\n  Your IP is still locked by an earlier run (failed-lookup limit). Wait 10 minutes and run again,");
    console.log("  or run with --skip-spoof-test.");
    printTimings();
    process.exit(1);
  }
  check(wrong.status === 404 && wrong.json.error === "Clip not found.", "unknown code -> 404 'Clip not found.'", wrong.json);
  let failedLookups = 1; // the wrong-code request above

  // ------------------------------------------------------- spoofing check
  if (skipSpoof) {
    console.log("\n7) IP spoofing check: SKIPPED (--skip-spoof-test)");
  } else {
    console.log("\n7) IP spoofing check");
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

    // Every request claims to come from a different client, through every client-IP header a
    // platform might read (Vercel: x-real-ip / x-forwarded-for; Netlify: x-nf-client-connection-ip;
    // others). If the server trusted any of them, every request would get a fresh limit.
    let blockedAt: number | null = null;
    for (let i = 1; i <= LOOKUP_LIMIT + 3; i++) {
      const fake = randomIp();
      const r = await call("GET", `/api/clips/${randomCode()}`, undefined, {
        "X-Forwarded-For": fake,
        "X-Real-IP": fake,
        "X-Nf-Client-Connection-Ip": fake,
        "Client-IP": fake,
        "True-Client-IP": fake,
        "CF-Connecting-IP": fake,
        Forwarded: `for=${fake}`,
      });
      if (r.status === 429) {
        blockedAt = i;
        break;
      }
      if (r.status === 404) failedLookups++;
    }
    const crossedWindow = windowOf(Date.now()) !== startWindow;

    if (blockedAt === null && crossedWindow) {
      warn("INCONCLUSIVE: a rate-limit window boundary was crossed during the check. Wait 10 minutes and run again.");
    } else {
      check(
        blockedAt !== null,
        blockedAt !== null
          ? `refused with 429 after ${failedLookups} failed lookups, despite a different fake IP in every header`
          : "NOT refused: faked client-IP headers got a fresh limit on every request",
      );
      if (blockedAt !== null) {
        explain("The server identifies you by a header the platform sets itself, so the rate limit can't be");
        explain("bypassed by faking headers. Your IP is now locked for up to 10 minutes.");
      } else {
        explain("DANGER: the rate limit can be bypassed. Expected on localhost / `next start`, never in production.");
        explain("Check HOSTING_PROVIDER (vercel on Vercel, netlify on Netlify) and redeploy. Don't share the URL until this passes.");
      }
    }
  }

  printTimings();
  console.log(
    failures === 0
      ? `\nALL PASSED${warnings ? ` (${warnings} warning${warnings > 1 ? "s" : ""})` : ""}`
      : `\n${failures} CHECK(S) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

function printTimings() {
  console.log("\nResponse times from this computer (first request may include a cold start):");
  for (const [label, list] of Object.entries(timings)) {
    const sorted = [...list].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    console.log(
      `  ${label.padEnd(32)} first ${Math.round(list[0])} ms, median ${Math.round(median)} ms, ` +
        `min ${Math.round(sorted[0])} ms, max ${Math.round(sorted[sorted.length - 1])} ms  (n=${list.length})`,
    );
  }
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
