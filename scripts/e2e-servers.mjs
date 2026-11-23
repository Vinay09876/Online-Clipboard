/**
 * Starts the production servers the Playwright tests need (one build, several configs),
 * and reports readiness on http://localhost:3239/ready once ALL of them answer.
 * Started by playwright.config.ts (webServer); stopped by Playwright when tests end.
 *
 *   3230  no SITE_URL                                   → existing UI tests, not indexable
 *   3231  SITE_URL on a temporary host (*.vercel.app)    → not indexable; ad flags set → still no ads
 *   3232  SITE_URL=https://online-clipboard.example.com + LEGACY_HOSTS (apex, www, old hosts)
 *         → indexable, ads not configured (default); mirrors production (a subdomain is canonical);
 *         requests with Host: www.example.com / a legacy host / another host test the redirects
 *   3233  SITE_URL=https://example.com, ALLOW_INDEXING=false → kill switch; ad flags set → still no ads
 *   3234  MAX_FILE_SIZE_MB=7, CLIP_EXPIRY_MINUTES=15, RATE_LIMIT_LOOKUP_FAILURES=4, CONTACT_EMAIL → copy follows config;
 *         tiny global ceiling (3 site-wide failures → 2 per client) for the db/006 test
 *   3235  SITE_URL=https://example.com + ad flags          → ads ACTIVE (HTML/header tests only)
 *
 * The ad flags use an obviously fake publisher ID (all zeros). Tests never load Google's script.
 *
 * Set E2E_SKIP_BUILD=1 to reuse the last build.
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";

const NEXT_BIN = "node_modules/next/dist/bin/next";

/** Old addresses that must redirect to SITE_URL on the real-domain server (Growth Step 7). */
const LEGACY = "example.com,www.example.com,old-clipboard.vercel.app,old-clipboard.netlify.app";

const NO_ADS = {
  ADS_ENABLED: "",
  ADSENSE_CLIENT_ID: "",
  ADSENSE_SLOT_GUIDE_AFTER_INTRO: "",
  ADSENSE_SLOT_GUIDE_BEFORE_RELATED: "",
  ADSENSE_SLOT_GUIDES_HUB: "",
};
const FAKE_ADS = {
  ADS_ENABLED: "true",
  ADSENSE_CLIENT_ID: "ca-pub-0000000000000000",
  ADSENSE_SLOT_GUIDE_AFTER_INTRO: "1111111111",
  ADSENSE_SLOT_GUIDE_BEFORE_RELATED: "2222222222",
  ADSENSE_SLOT_GUIDES_HUB: "3333333333",
};

export const SERVERS = [
  { port: 3230, env: { ...NO_ADS, SITE_URL: "", ALLOW_INDEXING: "" } },
  { port: 3231, env: { ...FAKE_ADS, SITE_URL: "https://online-clipboard-test.vercel.app", ALLOW_INDEXING: "" } },
  { port: 3232, env: { ...NO_ADS, SITE_URL: "https://online-clipboard.example.com", ALLOW_INDEXING: "", LEGACY_HOSTS: LEGACY } },
  { port: 3233, env: { ...FAKE_ADS, SITE_URL: "https://example.com", ALLOW_INDEXING: "false" } },
  // Small limits: the home page copy must show these numbers, not the defaults.
  { port: 3234, env: { ...NO_ADS, SITE_URL: "", ALLOW_INDEXING: "", MAX_FILE_SIZE_MB: "7", CLIP_EXPIRY_MINUTES: "15", RATE_LIMIT_LOOKUP_FAILURES: "4", RATE_LIMIT_GLOBAL_LOOKUP_FAILURES: "3", RATE_LIMIT_LOOKUP_FAILURES_STRICT: "2", CONTACT_EMAIL: "hello@example.org" } },
  { port: 3235, env: { ...FAKE_ADS, SITE_URL: "https://example.com", ALLOW_INDEXING: "" } },
];

if (!process.env.E2E_SKIP_BUILD) {
  const b = spawnSync(process.execPath, [NEXT_BIN, "build"], { stdio: "inherit" });
  if (b.status !== 0) process.exit(1);
}

const children = SERVERS.map(({ port, env }) =>
  spawn(process.execPath, [NEXT_BIN, "start", "-p", String(port)], {
    env: { ...process.env, ...env },
    stdio: ["ignore", "ignore", "inherit"],
  }),
);

function stopAll() {
  for (const c of children) {
    if (c.exitCode !== null) continue;
    if (process.platform === "win32" && c.pid) spawnSync("taskkill", ["/pid", String(c.pid), "/T", "/F"]);
    else c.kill();
  }
}
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"]) process.on(sig, () => (stopAll(), process.exit(0)));
process.on("exit", stopAll);
for (const c of children) c.on("exit", (code) => code && code !== 0 && console.error(`a test server exited with ${code}`));

async function allUp() {
  const results = await Promise.all(
    SERVERS.map(({ port }) =>
      fetch(`http://localhost:${port}/api/clips/abc`).then((r) => r.status === 400, () => false),
    ),
  );
  return results.every(Boolean);
}

createServer(async (req, res) => {
  const ok = req.url === "/ready" && (await allUp());
  res.writeHead(ok ? 200 : 503).end(ok ? "ready" : "starting");
}).listen(3239);
