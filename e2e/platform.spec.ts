import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CLEANUP_BUDGET, runCleanupJob, type CleanupDeps } from "../lib/cleanupJob";
import { clientIpFrom, parseHostingProvider, type HostingProvider } from "../lib/clientIp";
import { decideHost, isTemporaryHost, parseLegacyHosts } from "../lib/site";
import { isPagePath } from "../proxy";
import { expect, test } from "./helpers";

/**
 * Hosting-platform logic (Growth Step 5: Netlify next to Vercel). Pure checks, plus the
 * page cache headers on the default test server (3230).
 */

const src = (f: string) => readFileSync(join(process.cwd(), f), "utf8");
const h = (o: Record<string, string>) => new Headers(o);

// --------------------------------------------------------------------------- client IP

test("HOSTING_PROVIDER: explicit values, auto-detection, and a clear error for typos", () => {
  expect(parseHostingProvider({ HOSTING_PROVIDER: "netlify" })).toEqual({ ok: true, provider: "netlify", explicit: true });
  expect(parseHostingProvider({ HOSTING_PROVIDER: " Vercel " })).toEqual({ ok: true, provider: "vercel", explicit: true });
  expect(parseHostingProvider({ VERCEL: "1" })).toEqual({ ok: true, provider: "vercel", explicit: false });
  expect(parseHostingProvider({ NETLIFY: "true" })).toEqual({ ok: true, provider: "netlify", explicit: false });
  expect(parseHostingProvider({})).toEqual({ ok: true, provider: "local", explicit: false });
  // An explicit setting wins over detection.
  expect(parseHostingProvider({ HOSTING_PROVIDER: "netlify", VERCEL: "1" })).toMatchObject({ provider: "netlify" });
  const bad = parseHostingProvider({ HOSTING_PROVIDER: "netlfy" });
  expect(bad.ok).toBe(false);
  expect(!bad.ok && bad.error).toMatch(/HOSTING_PROVIDER must be one of vercel, netlify, local/);
});

test("client IP per provider: the trusted header wins, faked headers are ignored", () => {
  const fake = { "x-forwarded-for": "6.6.6.6, 7.7.7.7", "x-real-ip": "8.8.8.8" };

  // Vercel overwrites x-real-ip / x-forwarded-for at its edge: x-real-ip is the client.
  expect(clientIpFrom(h({ "x-real-ip": "203.0.113.5", "x-forwarded-for": "203.0.113.5" }), "vercel")).toBe("203.0.113.5");
  expect(clientIpFrom(h({ "x-forwarded-for": "203.0.113.5" }), "vercel")).toBe("203.0.113.5"); // fallback

  // Netlify: ONLY x-nf-client-connection-ip. A client faking X-Forwarded-For / X-Real-IP gains nothing.
  expect(clientIpFrom(h({ ...fake, "x-nf-client-connection-ip": "203.0.113.9" }), "netlify")).toBe("203.0.113.9");
  expect(clientIpFrom(h(fake), "netlify"), "no Netlify header: never fall back to spoofable headers").toBe("unknown");

  // Local (next start / dev / tests): X-Forwarded-For as sent, documented as spoofable.
  expect(clientIpFrom(h(fake), "local")).toBe("6.6.6.6");

  // Normalisation still applies on every provider.
  expect(clientIpFrom(h({ "x-nf-client-connection-ip": "2001:db8:1:2:aaaa::1" }), "netlify")).toBe("2001:db8:1:2::/64");
  expect(clientIpFrom(h({ "x-nf-client-connection-ip": "::ffff:198.51.100.7" }), "netlify")).toBe("198.51.100.7");
  expect(clientIpFrom(h({ "x-nf-client-connection-ip": "not-an-ip" }), "netlify")).toBe("unknown");
});

test("spoofing attempt: 11 requests with different fake headers map to ONE identity on Vercel and Netlify", () => {
  const real: Record<HostingProvider, Record<string, string>> = {
    vercel: { "x-real-ip": "198.51.100.20", "x-forwarded-for": "198.51.100.20" }, // what Vercel's edge sets
    netlify: { "x-nf-client-connection-ip": "198.51.100.20" }, // what Netlify's edge sets
    local: {},
  };
  for (const provider of ["vercel", "netlify"] as const) {
    const ids = new Set<string>();
    for (let i = 1; i <= 11; i++) {
      // What a client can add itself. On Vercel the platform overwrites x-real-ip / x-forwarded-for,
      // so the "real" values are applied last; on Netlify the fakes stay but are ignored.
      const clientSent = { "x-forwarded-for": `10.0.0.${i}`, "x-real-ip": `10.0.1.${i}`, "client-ip": `10.0.2.${i}` };
      ids.add(clientIpFrom(h({ ...clientSent, ...real[provider] }), provider));
    }
    expect([...ids], provider).toEqual(["198.51.100.20"]);
  }
  // For contrast: locally every fake header is a new identity (why production must not run as "local").
  const local = new Set(Array.from({ length: 11 }, (_, i) => clientIpFrom(h({ "x-forwarded-for": `10.0.0.${i + 1}` }), "local")));
  expect(local.size).toBe(11);
});

// --------------------------------------------------------------------------- env documentation

test("every environment variable the app reads is in .env.example and the deploy docs", () => {
  const files = ["lib/config.ts", "lib/site.ts", "lib/ads.ts", "lib/clientIp.ts", "proxy.ts", "next.config.ts", "app/layout.tsx"];
  const code = files.map(src).join("\n");
  const names = new Set<string>();
  for (const m of code.matchAll(/process\.env\.([A-Z_]+)/g)) names.add(m[1]);
  for (const m of code.matchAll(/(?:readPositiveInt|readOptionalEmail|readOptionalSecret|readRequired|readUrl)\("([A-Z_]+)"/g)) names.add(m[1]);
  for (const m of code.matchAll(/slotEnv: "([A-Z_]+)"/g)) names.add(m[1]);
  // Set by the platform or the runtime, not by the owner.
  for (const platform of ["NODE_ENV", "VERCEL", "NETLIFY"]) names.delete(platform);
  expect(names.size).toBeGreaterThan(20);

  const example = src(".env.example");
  const docs = src("docs/deploy.md") + src("docs/deploy-netlify.md") + src("docs/ads-plan.md");
  const missing = [...names].filter((n) => !new RegExp(`\\b${n}\\b`).test(example)).map((n) => `.env.example: ${n}`);
  missing.push(...[...names].filter((n) => !new RegExp(`\\b${n}\\b`).test(docs)).map((n) => `docs: ${n}`));
  expect(missing).toEqual([]);
});

// --------------------------------------------------------------------------- proxy portability

test("proxy.ts and everything it imports use no Node-only APIs (Netlify runs it as an Edge Function)", () => {
  for (const f of ["proxy.ts", "lib/site.ts", "lib/ads.ts", "content/guides/index.ts"]) {
    const code = src(f).replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ""); // ignore comments
    expect(code, `${f}: no node: imports`).not.toMatch(/from\s+["']node:|require\(["']node:/);
    expect(code, `${f}: no Buffer`).not.toMatch(/\bBuffer\b/);
    expect(code, `${f}: no fs/net/crypto modules`).not.toMatch(/from\s+["'](fs|net|path|crypto|os)["']/);
  }
});

test("temporary-host check still recognises every IP form without node:net", () => {
  for (const host of ["127.0.0.1", "10.1.2.3", "255.255.255.255", "::1", "2001:db8::1", "[::1]", "localhost", "a.vercel.app", "b.netlify.app", "x.localhost"]) {
    expect(isTemporaryHost(host), host).toBe(true);
  }
  for (const host of ["example.com", "1.2.3.4.example.com", "256.1.1.1.nip.io", "www.netlify.com", "vercel.app.example.org"]) {
    expect(isTemporaryHost(host), host).toBe(false);
  }
  // Via the URL parser, as lib/site.ts gets them.
  expect(isTemporaryHost(new URL("https://127.1/").hostname)).toBe(true);
  expect(isTemporaryHost(new URL("https://[0:0:0:0:0:0:0:1]/").hostname)).toBe(true);
});

// --------------------------------------------------------------------------- page caching (nonce)

test("isPagePath: pages yes, files and the share image no", () => {
  for (const p of ["/", "/guides", "/guides/what-is-an-online-clipboard", "/terms", "/no-such-page"]) expect(isPagePath(p), p).toBe(true);
  for (const p of ["/robots.txt", "/sitemap.xml", "/ads.txt", "/icon.svg", "/apple-icon.png", "/manifest.webmanifest", "/opengraph-image"]) {
    expect(isPagePath(p), p).toBe(false);
  }
});

test("pages tell every CDN not to store them; each request gets its own nonce", async ({ request }) => {
  const nonces = new Set<string>();
  for (const path of ["/", "/guides", "/guides/what-is-an-online-clipboard", "/terms", "/no-such-page", "/", "/guides"]) {
    const res = await request.get(path);
    const hd = res.headers();
    expect(hd["cache-control"], path).toMatch(/no-store/);
    expect(hd["cache-control"], path).toMatch(/private/);
    expect(hd["cdn-cache-control"], path).toBe("no-store");
    expect(hd["netlify-cdn-cache-control"], path).toBe("no-store");
    const nonce = /'nonce-([^']+)'/.exec(hd["content-security-policy"] ?? "")?.[1];
    expect(nonce, path).toBeTruthy();
    expect(await res.text(), `${path}: HTML uses this response's nonce`).toContain(`nonce="${nonce}"`);
    nonces.add(nonce!);
  }
  expect(nonces.size, "no nonce is ever reused").toBe(7);
  // Files keep their normal caching.
  for (const path of ["/icon.svg", "/robots.txt", "/opengraph-image"]) {
    expect((await request.get(path)).headers()["netlify-cdn-cache-control"], path).toBeUndefined();
  }
});

// --------------------------------------------------------------------------- cleanup budget

/** Fake database work: each call advances a fake clock. */
function fakeDeps(o: { backlog: number; batchMs: number; failAtBatch?: number }) {
  let t = 0;
  let left = o.backlog;
  let batch = 0;
  let swept = false;
  const deps: CleanupDeps = {
    now: () => t,
    cleanupExpiredClips: async ({ batchSize }) => {
      t += o.batchMs;
      batch++;
      if (o.failAtBatch === batch) return { deletedClips: 50, deletedFiles: 50, failed: 2 };
      const n = Math.min(batchSize, left);
      left -= n;
      return { deletedClips: n, deletedFiles: n, failed: 0 };
    },
    cleanupRateLimits: async () => {
      t += 300;
      return 7;
    },
    sweepOrphanedFiles: async () => {
      t += 2_000;
      swept = true;
      return { deleted: 1, failed: 0 };
    },
  };
  return { deps, clock: () => t, swept: () => swept, left: () => left };
}

test("cleanup budget fits the tightest platform limit, and the route's maxDuration covers it", () => {
  const B = CLEANUP_BUDGET;
  // Worst case: the last batch starts just before batchesMs, then the rate-limit delete.
  expect(B.batchesMs + 2 * B.slowestStepMs).toBeLessThanOrEqual(B.hardLimitMs);
  // The sweep only starts before sweepStartBeforeMs; with a slow batch and rate-limit step before it, still inside.
  expect(B.sweepStartBeforeMs + 3 * B.slowestStepMs).toBeLessThanOrEqual(B.hardLimitMs);
  const maxDuration = Number(/export const maxDuration = (\d+)/.exec(src("app/api/cron/cleanup/route.ts"))?.[1]);
  expect(maxDuration * 1000, "Vercel maxDuration ≥ the job's hard limit").toBeGreaterThanOrEqual(B.hardLimitMs);
  expect(maxDuration, "within Netlify's fixed 60 s synchronous limit").toBeLessThanOrEqual(60);
  const pgNetTimeout = Number(/timeout_milliseconds := (\d+)/.exec(src("docs/cleanup-scheduling.md"))?.[1]);
  expect(pgNetTimeout, "pg_cron waits at least as long as the job may run").toBeGreaterThanOrEqual(B.hardLimitMs);
});

test("cleanup: a huge backlog stops at the budget, skips the sweep, and leaves the rest for the next run", async () => {
  const f = fakeDeps({ backlog: 100_000, batchMs: 3_000 });
  const totals = await runCleanupJob(f.deps);
  expect(totals.batches).toBe(7); // starts at 0,3,…,18 s; the 7th ends at 21 s
  expect(totals.deletedClips).toBe(700);
  expect(totals.rateLimitRowsDeleted).toBe(7);
  expect(totals.sweepSkipped).toBe(true);
  expect(f.swept()).toBe(false);
  expect(f.clock()).toBeLessThanOrEqual(CLEANUP_BUDGET.hardLimitMs);
  expect(f.left()).toBeGreaterThan(0); // picked up 10 minutes later
});

test("cleanup: small backlog drains in one batch and still sweeps orphans", async () => {
  const f = fakeDeps({ backlog: 40, batchMs: 800 });
  const totals = await runCleanupJob(f.deps);
  expect(totals).toMatchObject({ batches: 1, deletedClips: 40, sweepSkipped: false, orphanFilesDeleted: 1 });
  expect(f.swept()).toBe(true);
});

test("cleanup: a batch with failures stops the loop (failed rows would be re-selected forever)", async () => {
  const f = fakeDeps({ backlog: 10_000, batchMs: 500, failAtBatch: 3 });
  const totals = await runCleanupJob(f.deps);
  expect(totals.batches).toBe(3);
  expect(totals.failed).toBe(2);
});

test("cleanup: an error part-way keeps the totals gathered so far (the route reports them with the 500)", async () => {
  const f = fakeDeps({ backlog: 1_000, batchMs: 100 });
  const totals = { ...(await import("../lib/cleanupJob")).emptyTotals() };
  const deps = { ...f.deps, cleanupRateLimits: async () => Promise.reject(new Error("db down")) };
  await expect(runCleanupJob(deps, totals)).rejects.toThrow("db down");
  expect(totals.deletedClips).toBe(1_000);
});

// --------------------------------------------------------------------------- canonical host (Step 7)

test("decideHost: inert without a real domain; www/legacy redirect; other hosts noindex; localhost untouched", () => {
  const legacy = new Set(["old.vercel.app"]);
  const d = (host: string | null, method = "GET", path = "/a?b=1", canonical: string | null = "vinaycode.com") =>
    decideHost(host, method, path, canonical, legacy);

  expect(d("www.vinaycode.com", "GET", "/a?b=1", null)).toEqual({ kind: "inert" });
  expect(d("vinaycode.com")).toEqual({ kind: "canonical" });
  expect(d("VinayCode.com:443")).toEqual({ kind: "canonical" });
  expect(d("www.vinaycode.com")).toEqual({ kind: "redirect", status: 301, location: "https://vinaycode.com/a?b=1" });
  expect(d("www.vinaycode.com", "HEAD")).toMatchObject({ kind: "redirect", status: 301 });
  expect(d("www.vinaycode.com", "POST")).toMatchObject({ kind: "redirect", status: 308 });
  expect(d("old.vercel.app")).toEqual({ kind: "redirect", status: 301, location: "https://vinaycode.com/a?b=1" });
  expect(d("old.vercel.app", "POST")).toEqual({ kind: "noindex" });
  expect(d("online-clipboard-git-main-x.vercel.app")).toEqual({ kind: "noindex" });
  expect(d(null)).toEqual({ kind: "noindex" });
  expect(d("localhost:3000")).toEqual({ kind: "local" });
  expect(d("127.0.0.1:3232")).toEqual({ kind: "local" });
  // A www canonical works the other way round.
  expect(d("vinaycode.com", "GET", "/", "www.vinaycode.com")).toMatchObject({ kind: "redirect", location: "https://www.vinaycode.com/" });
});

test("LEGACY_HOSTS: host names only, never the site's own host", () => {
  expect(parseLegacyHosts("")).toEqual({ ok: true, hosts: [] });
  expect(parseLegacyHosts(" A.vercel.app , b.netlify.app ,", "vinaycode.com")).toEqual({ ok: true, hosts: ["a.vercel.app", "b.netlify.app"] });
  for (const bad of ["https://a.vercel.app", "a.vercel.app/x", "a vercel app", "localhost"]) {
    const r = parseLegacyHosts(bad, "vinaycode.com");
    expect(r.ok, bad).toBe(false);
    expect(!r.ok && r.error, bad).toMatch(/LEGACY_HOSTS must be host names/);
  }
  for (const own of ["vinaycode.com", "www.vinaycode.com"]) {
    const r = parseLegacyHosts(own, "vinaycode.com");
    expect(!r.ok && r.error, own).toMatch(/must not contain the site's own host/);
  }
});
