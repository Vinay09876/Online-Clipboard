import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Calls one of the combined Postgres functions from db/005_fast_paths.sql.
 *
 * Returns null whenever the fast path can't be used, and the caller then runs the OLD
 * step-by-step calls, which behave exactly as before. That happens when:
 *   - 005 has not been applied yet (function missing): remembered for 5 minutes per
 *     server instance, so the fallback doesn't pay for a failing call every time, and
 *     picks up the functions automatically once you apply the SQL;
 *   - the call fails for any other reason (logged).
 * Safe because every 005 function is one transaction: if it errors, nothing it did
 * (counters included) is kept.
 */

const RETRY_MISSING_AFTER_MS = 5 * 60_000;
const missingUntil = new Map<string, number>();

/** PostgREST "function not found" (schema cache) and Postgres "undefined_function". */
function isMissingFunction(code: string | undefined): boolean {
  return code === "PGRST202" || code === "42883";
}

export async function fastRpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  const until = missingUntil.get(fn);
  if (until && Date.now() < until) return null;

  const { data, error } = await supabaseAdmin.rpc(fn, args).single<T>();
  if (!error && data) {
    if (until) {
      missingUntil.delete(fn);
      console.log(`[fastRpc] ${fn} is available now (db/005 applied)`);
    }
    return data;
  }
  if (isMissingFunction(error?.code)) {
    if (!until) console.warn(`[fastRpc] ${fn} not found: db/005_fast_paths.sql not applied yet, using the slower path`);
    missingUntil.set(fn, Date.now() + RETRY_MISSING_AFTER_MS);
  } else {
    console.error(`[fastRpc] ${fn} failed, using the slower path:`, error?.code, error?.message);
  }
  return null;
}

/** Test hook: which functions are currently considered missing. */
export function fastRpcMissing(): string[] {
  return [...missingUntil.entries()].filter(([, t]) => Date.now() < t).map(([f]) => f);
}
