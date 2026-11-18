import { connection } from "next/server";

/**
 * GET /api/health
 * 200 { ok: true }                  → env vars valid and Supabase reachable with the service key
 * 500 { ok: false, error: string }  → something is misconfigured
 */
export async function GET() {
  // Run at request time, never prerendered at build time.
  await connection();

  try {
    // Imported inside try so a config error comes back as JSON
    // instead of crashing the route module.
    const { supabaseAdmin } = await import("@/lib/supabase/admin");

    // Storage: needs a valid service role key.
    const { error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(`Supabase storage check failed: ${error.message}`);

    // Database: needs the clips table and service_role privileges on it.
    const { error: dbError } = await supabaseAdmin.from("clips").select("id").limit(1);
    if (dbError) throw new Error(`Supabase database check failed: ${dbError.message}`);

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[health]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
