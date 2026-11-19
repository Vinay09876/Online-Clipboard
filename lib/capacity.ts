import "server-only";

import { MAX_LIVE_CLIPS, MAX_TOTAL_STORAGE_BYTES } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CapacityResult = "ok" | "full" | "error";

/**
 * Global caps for the whole service, checked before every create.
 * Counts unexpired clips INCLUDING pending uploads (ready = false), and the sum of
 * their declared/real file sizes (a pending clip reserves its declared size).
 *
 * This is a soft cap: two creates racing at the very edge can both pass. That is
 * fine for its purpose (stop the free tier from filling up).
 */
export async function checkCapacity(newFileBytes: number): Promise<CapacityResult> {
  const { data, error } = await supabaseAdmin
    .rpc("clip_usage")
    .single<{ live_clips: number | string; live_bytes: number | string }>();

  if (error || !data) {
    console.error("[capacity] clip_usage failed:", error?.code, error?.message);
    return "error";
  }

  const liveClips = Number(data.live_clips);
  const liveBytes = Number(data.live_bytes);

  if (liveClips + 1 > MAX_LIVE_CLIPS) {
    console.warn(`[capacity] live clip cap reached (${liveClips}/${MAX_LIVE_CLIPS})`);
    return "full";
  }
  if (newFileBytes > 0 && liveBytes + newFileBytes > MAX_TOTAL_STORAGE_BYTES) {
    console.warn(`[capacity] storage cap reached (${liveBytes} + ${newFileBytes} > ${MAX_TOTAL_STORAGE_BYTES})`);
    return "full";
  }
  return "ok";
}
