/**
 * LOCAL load test: ~50 simulated visitors doing realistic things at the same time.
 *
 *   1. npm run build && npm start            (a LOCAL production server, port 3000)
 *   2. npm run load:test                     (or: npm run load:test -- http://localhost:3000 --users 50 --rounds 3)
 *
 * ⚠ It uses the REAL Supabase project from .env.local, which the live site shares:
 *   - it creates up to ~150 short-lived clips (kept well below MAX_LIVE_CLIPS so real
 *     visitors are never refused), small 1 KB files, rate-limit counters and download bytes;
 *   - everything it created is deleted at the end, even if the run fails half-way.
 *   Run it at a quiet time.
 *
 * Refuses any non-localhost URL unless you pass --allow-remote (don't load-test production).
 * Each simulated visitor uses its own fake IP (X-Forwarded-For), which a LOCAL server
 * trusts (HOSTING_PROVIDER=local), so per-IP limits behave as they would for real people.
 */
import { randomBytes } from "node:crypto";
import { rateLimitKey, type Bucket } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabase/admin";

const args = process.argv.slice(2);
const base = (args.find((a) => /^https?:\/\//.test(a)) ?? "http://localhost:3000").replace(/\/+$/, "");
const num = (flag: string, d: number) => (args.includes(flag) ? Number(args[args.indexOf(flag) + 1]) : d);
const USERS = num("--users", 50);
const ROUNDS = num("--rounds", 3);
const MAX_LIVE = Number(process.env.MAX_LIVE_CLIPS ?? 200);

const host = new URL(base).hostname;
if (!["localhost", "127.0.0.1", "::1", "[::1]"].includes(host) && !args.includes("--allow-remote")) {
  console.error(`Refusing to load-test ${base}: only localhost is allowed (pass --allow-remote to override, not recommended).`);
  process.exit(2);
}

// ------------------------------------------------------------------ bookkeeping
const created = new Set<string>(); // codes
const usedIps = new Set<string>();
let downloadedBytes = 0;
const samples = new Map<string, { ms: number[]; status: Map<string, number> }>();

function record(label: string, ms: number, status: number | string) {
  if (!samples.has(label)) samples.set(label, { ms: [], status: new Map() });
  const s = samples.get(label)!;
  s.ms.push(ms);
  s.status.set(String(status), (s.status.get(String(status)) ?? 0) + 1);
}

function fakeIp(): string {
  const b = randomBytes(3);
  const ip = `198.${18 + (b[0] & 1)}.${b[1]}.${1 + (b[2] % 254)}`; // 198.18.0.0/15: reserved for testing
  usedIps.add(ip);
  return ip;
}

async function api(label: string, ip: string, method: string, path: string, body?: unknown) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { "X-Forwarded-For": ip, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    record(label, performance.now() - t0, res.status);
    return { status: res.status, json };
  } catch (e) {
    record(label, performance.now() - t0, e instanceof Error ? e.name : "error");
    return { status: 0, json: {} as Record<string, unknown> };
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const think = () => sleep(200 + Math.random() * 600);
const randomCode = () => String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");

// ------------------------------------------------------------------ one visitor
async function visitor(i: number, budget: { left: number }) {
  const ip = fakeIp();
  for (let r = 0; r < ROUNDS; r++) {
    await think();
    if (budget.left-- <= 0) break;
    // Send a text clip, then open it (as the receiving device would).
    const c = await api("POST /api/clips (text)", ip, "POST", "/api/clips", { text: `load test ${i}/${r} ${Date.now()}` });
    if (c.status === 201) {
      created.add(String(c.json.code));
      await think();
      await api("GET /api/clips/[code]", ip, "GET", `/api/clips/${c.json.code}`);
    }
    // Every 4th visitor also sends and receives a small file.
    if (i % 4 === 0 && budget.left-- > 0) {
      const bytes = randomBytes(1024);
      const f = await api("POST /api/clips (file)", ip, "POST", "/api/clips", { file: { name: "load.bin", size: bytes.length } });
      const upload = f.json.upload as { signedUrl?: string } | undefined;
      if (f.status === 201 && upload?.signedUrl) {
        created.add(String(f.json.code));
        const t0 = performance.now();
        const put = await fetch(upload.signedUrl, { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: new Uint8Array(bytes) }).catch(() => null);
        record("PUT signed URL (Supabase)", performance.now() - t0, put?.status ?? "error");
        await api("POST .../complete", ip, "POST", `/api/clips/${f.json.code}/complete`);
        const dl = await api("GET .../download", ip, "GET", `/api/clips/${f.json.code}/download`);
        if (dl.status === 200) downloadedBytes += bytes.length;
      }
    }
    // Someone mistypes a code now and then.
    if (Math.random() < 0.3) await api("GET wrong code (404 expected)", ip, "GET", `/api/clips/${randomCode()}`);
  }
}

// ------------------------------------------------------------------ limit probes
async function probeLimits() {
  console.log("\nRate-limit probes (one fake IP each):");
  const ip1 = fakeIp();
  let firstCreate429 = 0;
  for (let i = 1; i <= 23; i++) {
    const r = await api("probe: creates from one IP", ip1, "POST", "/api/clips", { text: `load probe ${i}` });
    if (r.status === 201) created.add(String(r.json.code));
    if (r.status === 429 && !firstCreate429) firstCreate429 = i;
  }
  console.log(`  creates from one IP: first 429 at request #${firstCreate429 || "never"} (limit RATE_LIMIT_CREATES, default 20)`);
  const ip2 = fakeIp();
  let firstLookup429 = 0;
  for (let i = 1; i <= 12; i++) {
    const r = await api("probe: wrong codes from one IP", ip2, "GET", `/api/clips/${randomCode()}`);
    if (r.status === 429 && !firstLookup429) firstLookup429 = i;
  }
  console.log(`  wrong codes from one IP: first 429 at request #${firstLookup429 || "never"} (limit RATE_LIMIT_LOOKUP_FAILURES, default 10)`);
}

// ------------------------------------------------------------------ clean-up
async function cleanUp() {
  const codes = [...created];
  let rows = 0;
  let files = 0;
  for (let i = 0; i < codes.length; i += 100) {
    const chunk = codes.slice(i, i + 100);
    const { data } = await supabaseAdmin.from("clips").select("file_path").in("code", chunk);
    const paths = (data ?? []).map((r) => r.file_path).filter(Boolean) as string[];
    if (paths.length) {
      const { data: removed } = await supabaseAdmin.storage.from("clip-files").remove(paths);
      files += removed?.length ?? 0;
    }
    const { data: del } = await supabaseAdmin.from("clips").delete().in("code", chunk).select("id");
    rows += del?.length ?? 0;
  }
  const buckets: Bucket[] = ["lookup-fail", "create", "create-file", "complete", "download", "health"];
  const keys = [...usedIps].flatMap((ip) => buckets.map((b) => rateLimitKey(b, ip)));
  for (let i = 0; i < keys.length; i += 100) await supabaseAdmin.from("rate_limits").delete().in("key", keys.slice(i, i + 100));
  if (downloadedBytes > 0) {
    const month = new Date().toISOString().slice(0, 8) + "01";
    const { data } = await supabaseAdmin.from("download_usage").select("bytes").eq("month", month).maybeSingle();
    if (data) await supabaseAdmin.from("download_usage").update({ bytes: Math.max(0, Number(data.bytes) - downloadedBytes) }).eq("month", month);
  }
  const { count } = await supabaseAdmin.from("clips").select("id", { count: "exact", head: true }).in("code", codes.slice(0, 100));
  console.log(
    `\nClean-up: deleted ${rows} clip row(s), ${files} file(s), rate-limit counters of ${usedIps.size} fake IPs, ` +
      `and ${downloadedBytes} bytes from this month's download total. Left behind: ${count ?? "?"} row(s).`,
  );
}

// ------------------------------------------------------------------ report
function report(wallMs: number) {
  const pct = (a: number[], p: number) => {
    const s = [...a].sort((x, y) => x - y);
    return Math.round(s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))]);
  };
  console.log(`\nResults (${USERS} visitors × ${ROUNDS} rounds, ${Math.round(wallMs / 1000)} s):`);
  console.log("  " + "endpoint".padEnd(34) + "n".padStart(5) + "p50".padStart(7) + "p95".padStart(7) + "max".padStart(7) + "   statuses");
  let total = 0;
  let unexpected = 0;
  for (const [label, s] of samples) {
    const statuses = [...s.status.entries()].map(([k, v]) => `${k}×${v}`).join(" ");
    console.log("  " + label.padEnd(34) + String(s.ms.length).padStart(5) + String(pct(s.ms, 50)).padStart(7) + String(pct(s.ms, 95)).padStart(7) + String(pct(s.ms, 100)).padStart(7) + "   " + statuses);
    if (label.startsWith("probe")) continue;
    total += s.ms.length;
    for (const [k, v] of s.status) if (!/^(200|201|404)$/.test(k)) unexpected += v;
  }
  console.log(`\n  Unexpected responses (not 200/201/404) outside the probes: ${unexpected} of ${total} (${((100 * unexpected) / Math.max(1, total)).toFixed(1)} %)`);
}

async function main() {
  const health = await fetch(`${base}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(`${base}/api/health is not OK. Start a local production server first (npm run build && npm start).`);
    process.exit(2);
  }
  const { data: usage } = await supabaseAdmin.rpc("clip_usage").single<{ live_clips: number }>();
  const live = Number(usage?.live_clips ?? 0);
  // Never push the shared database near its cap: real visitors must keep working.
  const budget = { left: Math.max(0, Math.min(USERS * ROUNDS * 1.25, MAX_LIVE - live - 50 - 25)) };
  console.log(
    `Load test against ${base}: ${USERS} visitors, ${ROUNDS} rounds. Live clips now: ${live}/${MAX_LIVE}; ` +
      `this run may create at most ${Math.floor(budget.left)} clips (+ up to 23 in the probes).\n` +
      "⚠ Uses the REAL Supabase project (shared with the live site). Everything is deleted afterwards.\n" +
      "Starting in 5 seconds (Ctrl+C to cancel)…",
  );
  await sleep(5000);

  const t0 = performance.now();
  try {
    await Promise.all(Array.from({ length: USERS }, (_, i) => visitor(i, budget)));
    const wall = performance.now() - t0;
    await probeLimits();
    report(wall);
  } finally {
    await cleanUp();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
