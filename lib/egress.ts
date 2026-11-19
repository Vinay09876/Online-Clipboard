import "server-only";

import { MAX_MONTHLY_DOWNLOAD_BYTES } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type EgressDecision = "ok" | "paused";

/**
 * Reserves `bytes` of this month's download budget (UTC calendar month).
 *  ok      added to the counter; go ahead and issue the download link
 *  paused  this download would exceed MAX_MONTHLY_DOWNLOAD_MB; nothing was added
 *
 * Fails OPEN: if the counter can't be reached, the download is allowed and the error
 * is logged. Better a few uncounted downloads than a broken app.
 *
 * This counts what the app hands out (file size per download link), which is a close
 * proxy for Supabase Storage egress, not an exact meter. Keep the limit below the
 * plan's 5 GB to leave headroom for database traffic and repeated link use.
 */
export async function reserveDownload(bytes: number): Promise<EgressDecision> {
  const { data, error } = await supabaseAdmin
    .rpc("add_download_bytes", { p_bytes: Math.max(0, Math.round(bytes)), p_limit_bytes: MAX_MONTHLY_DOWNLOAD_BYTES })
    .single<{ total_bytes: number; allowed: boolean }>();

  if (error || !data) {
    console.error("[egress] add_download_bytes failed (allowing download):", error?.code, error?.message);
    return "ok";
  }
  if (!data.allowed) {
    console.warn(`[egress] monthly download limit reached (${data.total_bytes} + ${bytes} > ${MAX_MONTHLY_DOWNLOAD_BYTES})`);
    return "paused";
  }
  return "ok";
}
