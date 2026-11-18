import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL } from "@/lib/config";

/**
 * Server-only Supabase client using the service role key.
 *
 * - The service role key bypasses Row Level Security, so this client must only
 *   ever run on the server (API routes / server code).
 * - `import "server-only"` makes the build fail if a Client Component imports
 *   this file, directly or indirectly.
 * - Missing/invalid env vars throw a clear error from lib/config.ts on import.
 */
export const supabaseAdmin: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // No user sessions on the server: don't store or refresh tokens.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);
