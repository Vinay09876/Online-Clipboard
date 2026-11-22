/**
 * Runs the core e2e flows on Firefox, WebKit (Safari's engine) and an iPhone-sized WebKit.
 *   npm run test:browsers                 (extra args go to Playwright, e.g. -g "file")
 * Needs the browsers once: npx playwright install firefox webkit
 */
import { spawnSync } from "node:child_process";

const r = spawnSync(
  process.execPath,
  ["node_modules/@playwright/test/cli.js", "test", "--project=firefox", "--project=webkit", "--project=iphone", ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, E2E_BROWSERS: "1" } },
);
process.exit(r.status ?? 1);
