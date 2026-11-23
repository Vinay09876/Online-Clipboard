import { connection } from "next/server";
import { json } from "@/lib/http";

/**
 * GET /api/health/cleanup: is the scheduled clean-up keeping up? (Growth Step 7b)
 *
 * The clean-up job runs every 10 minutes. If any clip expired more than STALL_AFTER_MINUTES
 * ago and still exists, at least ~3 runs were missed or failed (schedule stopped, wrong
 * CRON_SECRET, app or storage errors). Point a free uptime monitor at this URL to get an email.
 *
 * 200 { cleanup: "ok" } | 503 { cleanup: "behind" } | 503 { cleanup: "unknown" } (DB error) | 429
 * Reveals only a yes/no, never counts, codes or contents. Uses the expires_at index; no migration.
 * Shares the health endpoint's per-IP rate limit.
 */
const STALL_AFTER_MINUTES = 30;

export async function GET(request: Request) {
  await connection();
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { consume, getClientIp } = await import("@/lib/rateLimit");
    const { errors } = await import("@/lib/http");

    const limit = await consume("health", getClientIp(request.headers)); // DB error -> allow
    if (limit.kind === "limited") return errors.tooMany(limit.retryAfter);

    const cutoff = new Date(Date.now() - STALL_AFTER_MINUTES * 60_000).toISOString();
    const { data, error } = await supabaseAdmin.from("clips").select("id").lte("expires_at", cutoff).limit(1);
    if (error) throw new Error(`clean-up check failed: ${error.code} ${error.message}`);
    return (data ?? []).length > 0 ? json({ cleanup: "behind" }, 503) : json({ cleanup: "ok" });
  } catch (err) {
    console.error("[health/cleanup]", err instanceof Error ? err.message : err);
    return json({ cleanup: "unknown" }, 503);
  }
}
