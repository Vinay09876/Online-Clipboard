/**
 * Is db/005_fast_paths.sql applied? Calls each 005 function once with harmless test values
 * against the REAL database (from .env.local) and reports which ones exist.
 *
 *   npm run db:check
 *
 * Side effects: one failed-lookup counter row and one "create" counter row under keys
 * starting with "db-check:", both deleted at the end. No clips are created.
 */
import { supabaseAdmin } from "@/lib/supabase/admin";

const KEY = `db-check:${Date.now()}`;

async function exists(fn: string, args: Record<string, unknown>): Promise<boolean | string> {
  const { error } = await supabaseAdmin.rpc(fn, args);
  if (!error) return true;
  if (error.code === "PGRST202" || error.code === "42883") return false;
  return `${error.code} ${error.message}`;
}

async function main() {
  const results: [string, boolean | string][] = [
    ["clip_create_gate", await exists("clip_create_gate", { p_create_key: `${KEY}:c`, p_create_limit: 1000, p_file_key: null, p_file_limit: 1, p_window_seconds: 600, p_with_usage: true })],
    ["clip_lookup", await exists("clip_lookup", { p_fail_key: `${KEY}:f`, p_fail_limit: 1000, p_window_seconds: 600, p_code: "000000" })],
    // Blocked immediately (limit 0), so nothing else is touched:
    ["clip_complete_gate", await exists("clip_complete_gate", { p_fail_key: `${KEY}:f`, p_fail_limit: 0, p_op_key: `${KEY}:o`, p_op_limit: 0, p_window_seconds: 600, p_code: "000000" })],
    ["clip_download_gate", await exists("clip_download_gate", { p_fail_key: `${KEY}:f`, p_fail_limit: 0, p_op_key: `${KEY}:o`, p_op_limit: 0, p_window_seconds: 600, p_code: "000000", p_month_limit_bytes: 0 })],
  ];
  // clip_insert_with_code is not called (it would insert a clip); it ships in the same file.

  await supabaseAdmin.from("rate_limits").delete().like("key", `${KEY}%`);

  for (const [fn, r] of results) console.log(`  ${r === true ? "OK     " : r === false ? "MISSING" : "ERROR  "}  ${fn}${typeof r === "string" ? `  (${r})` : ""}`);
  const missing = results.filter(([, r]) => r === false).length;
  console.log(
    missing === 0
      ? "\ndb/005_fast_paths.sql is applied: the API uses the one-round-trip paths."
      : `\n${missing} function(s) missing: apply db/005_fast_paths.sql in Supabase → SQL Editor (the app works either way).`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
