import { defineConfig, devices } from "@playwright/test";

// Supabase credentials for test clean-up (e2e/helpers.ts). Not exposed to the browser.
process.loadEnvFile?.(".env.local");

const PORT = 3230;
const external = process.env.E2E_BASE_URL; // e.g. http://localhost:3001 to test your running dev server

export default defineConfig({
  testDir: "e2e",
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: external ?? `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] }, grep: /@mobile/ },
  ],
  // Without E2E_BASE_URL: build and start a production server just for the tests.
  webServer: external
    ? undefined
    : {
        command: `npm run build && node node_modules/next/dist/bin/next start -p ${PORT}`,
        url: `http://localhost:${PORT}/api/clips/abc`, // answers 400 once the server is up
        timeout: 300_000,
        reuseExistingServer: false,
        stdout: "ignore",
        stderr: "pipe",
      },
});
