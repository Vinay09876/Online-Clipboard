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

    // Cheap call that needs a valid service role key and no tables.
    const { error } = await supabaseAdmin.storage.listBuckets();
    if (error) throw new Error(`Supabase check failed: ${error.message}`);

    return Response.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[health]", message);
    return Response.json({ ok: false, error: message }, { status: 500 });
  }
}
