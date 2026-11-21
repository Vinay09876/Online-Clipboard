/**
 * Starts the production servers the Playwright tests need (one build, several configs),
 * and reports readiness on http://localhost:3239/ready once ALL of them answer.
 * Started by playwright.config.ts (webServer); stopped by Playwright when tests end.
 *
 *   3230  no SITE_URL                                   → existing UI tests, not indexable
 *   3231  SITE_URL on a temporary host (*.vercel.app)    → not indexable
 *   3232  SITE_URL=https://example.com                   → indexable
 *   3233  SITE_URL=https://example.com, ALLOW_INDEXING=false → kill switch, not indexable
 *   3234  MAX_FILE_SIZE_MB=7, CLIP_EXPIRY_MINUTES=15, RATE_LIMIT_LOOKUP_FAILURES=4 → copy follows config
 *
 * Set E2E_SKIP_BUILD=1 to reuse the last build.
 */
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";

const NEXT_BIN = "node_modules/next/dist/bin/next";

export const SERVERS = [
  { port: 3230, env: { SITE_URL: "", ALLOW_INDEXING: "" } },
  { port: 3231, env: { SITE_URL: "https://online-clipboard-test.vercel.app", ALLOW_INDEXING: "" } },
  { port: 3232, env: { SITE_URL: "https://example.com", ALLOW_INDEXING: "" } },
  { port: 3233, env: { SITE_URL: "https://example.com", ALLOW_INDEXING: "false" } },
  // Small limits: the home page copy must show these numbers, not the defaults.
  { port: 3234, env: { SITE_URL: "", ALLOW_INDEXING: "", MAX_FILE_SIZE_MB: "7", CLIP_EXPIRY_MINUTES: "15", RATE_LIMIT_LOOKUP_FAILURES: "4" } },
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
