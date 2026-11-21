import { defineConfig, devices } from "@playwright/test";

// Supabase credentials for test clean-up (e2e/helpers.ts). Not exposed to the browser.
process.loadEnvFile?.(".env.local");

const external = process.env.E2E_BASE_URL; // e.g. http://localhost:3001 to test your running dev server

/** SEO projects need their own servers with specific SITE_URL values (scripts/e2e-servers.mjs). */
const seoProjects = [
  { name: "seo-no-site-url", port: 3230, grep: /@nosite/ },
  { name: "seo-temporary-host", port: 3231, grep: /@temp/ },
  { name: "seo-real-domain", port: 3232, grep: /@real/ },
  { name: "seo-kill-switch", port: 3233, grep: /@killswitch/ },
].map((p) => ({
  name: p.name,
  testMatch: /seo\.spec\.ts/,
  grep: p.grep,
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${p.port}` },
}));

/**
 * Ads (e2e/ads.spec.ts), one project per server:
 *   @adsoff    3230 default config and 3232 real domain without ad settings: nothing about ads
 *   @adson     3235 real domain + ad flags (fake publisher ID): HTML/headers only, no browser
 *   @adsnever  3231 temporary host and 3233 kill switch, both WITH ad flags: still no ads
 */
const adsProjects = [
  { name: "ads-off-default", port: 3230, grep: /@adsoff/ },
  { name: "ads-off-real-domain", port: 3232, grep: /@adsoff/ },
  { name: "ads-on", port: 3235, grep: /@adson/ },
  { name: "ads-never-temporary-host", port: 3231, grep: /@adsnever/ },
  { name: "ads-never-kill-switch", port: 3233, grep: /@adsnever/ },
].map((p) => ({
  name: p.name,
  testMatch: /ads\.spec\.ts/,
  grep: p.grep,
  use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${p.port}` },
}));

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: external ?? "http://localhost:3230",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", testIgnore: /(seo|ads)\.spec\.ts/, grepInvert: /@config/, use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testIgnore: /(seo|ads)\.spec\.ts/, use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
    // Against an external server (E2E_BASE_URL) only the UI projects run.
    ...(external ? [] : seoProjects),
    ...(external ? [] : adsProjects),
    // Home page copy must follow config: server 3234 runs with small limits.
    ...(external
      ? []
      : [
          {
            name: "content-config",
            testMatch: /(home-content|pages)\.spec\.ts/,
            grep: /@config/,
            use: { ...devices["Desktop Chrome"], baseURL: "http://localhost:3234" },
          },
        ]),
  ],
  // Without E2E_BASE_URL: build once and start all test servers (see scripts/e2e-servers.mjs).
  webServer: external
    ? undefined
    : {
        command: "node scripts/e2e-servers.mjs",
        url: "http://localhost:3239/ready",
        timeout: 300_000,
        reuseExistingServer: false,
        stdout: "ignore",
        stderr: "pipe",
      },
});
