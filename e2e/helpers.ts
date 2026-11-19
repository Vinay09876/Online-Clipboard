import { test as base, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

/** Admin client for clean-up only (runs in the test process, never in the browser). */
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const createdCodes = new Set<string>();

export function rememberCode(code: string) {
  createdCodes.add(code);
}

export async function deleteCreatedClips() {
  const codes = [...createdCodes];
  createdCodes.clear();
  if (codes.length === 0) return;
  const { data } = await admin.from("clips").select("id, file_path").in("code", codes);
  const keys = (data ?? []).flatMap((r) => [r.id, r.file_path]).filter(Boolean) as string[];
  if (keys.length) await admin.storage.from("clip-files").remove([...new Set(keys)]);
  await admin.from("clips").delete().in("code", codes);
}

/** A code with no row at all. */
export async function unusedCode(): Promise<string> {
  for (;;) {
    const code = String(randomBytes(3).readUIntBE(0, 3) % 1_000_000).padStart(6, "0");
    const { data } = await admin.from("clips").select("id").eq("code", code);
    if (data && data.length === 0) return code;
  }
}

/** A random address in 198.18.0.0/15 (reserved for testing). */
export function testIp(): string {
  const b = randomBytes(3);
  return `198.${18 + (b[0] & 1)}.${b[1]}.${1 + (b[2] % 254)}`;
}

/**
 * Every test gets:
 *  - its own client IP on /api/* requests (X-Forwarded-For; only honoured off Vercel),
 *    so rate limits from one test don't affect another;
 *  - a check that the browser logged no errors or warnings. Chromium's own
 *    "Failed to load resource" lines for the 404/429 responses the tests cause on
 *    purpose are network log entries, not page errors, and are ignored.
 */
export const test = base.extend<{ ip: string; consoleProblems: string[] }>({
  ip: async ({}, provide) => {
    await provide(testIp());
  },
  consoleProblems: async ({ page, ip }, provide) => {
    const problems: string[] = [];
    page.on("console", (m) => {
      if ((m.type() === "error" || m.type() === "warning") && !m.text().startsWith("Failed to load resource")) {
        problems.push(`${m.type()}: ${m.text()}`);
      }
    });
    page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
    await routeApiWithIp(page, ip);
    await provide(problems);
    expect(problems, "browser console errors/warnings").toEqual([]);
  },
});

export async function routeApiWithIp(page: Page, ip: string) {
  await page.route("**/api/**", (route) =>
    route.continue({ headers: { ...route.request().headers(), "x-forwarded-for": ip } }),
  );
}

export async function typeCode(page: Page, code: string) {
  await page.getByRole("textbox", { name: "Digit 1 of 6" }).click();
  await page.keyboard.type(code);
}

export { expect };
