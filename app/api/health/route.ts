import { connection } from "next/server";
import { json } from "@/lib/http";

/**
 * GET /api/health
 * 200 { ok: true }  |  503 { ok: false }  |  429 rate limited
 * Never returns error details; they go to the server log only.
 */
export async function GET(request: Request) {
  // Run at request time, never prerendered at build time.
  await connection();

  try {
    // Imported inside try so even a config error (missing env var) gives { ok: false }.
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { consume, getClientIp } = await import("@/lib/rateLimit");
    const { errors } = await import("@/lib/http");

    const limit = await consume("health", getClientIp(request.headers)); // DB error -> allow
    if (limit.kind === "limited") return errors.tooMany(limit.retryAfter);

    // Storage (needs a valid service role key) and database (needs the clips table and
    // service_role privileges on it), checked in parallel: they don't depend on each other.
    const [{ error }, { error: dbError }] = await Promise.all([
      supabaseAdmin.storage.listBuckets(),
      supabaseAdmin.from("clips").select("id").limit(1),
    ]);
    if (error) throw new Error(`Supabase storage check failed: ${error.message}`);
    if (dbError) throw new Error(`Supabase database check failed: ${dbError.message}`);

    return json({ ok: true });
  } catch (err) {
    console.error("[health]", err instanceof Error ? err.message : err);
    return json({ ok: false }, 503);
  }
}
