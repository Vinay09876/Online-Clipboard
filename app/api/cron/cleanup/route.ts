import { createHash, timingSafeEqual } from "node:crypto";
import { cleanupExpiredClips, cleanupRateLimits, sweepOrphanedFiles } from "@/lib/cleanup";
import { emptyTotals, runCleanupJob } from "@/lib/cleanupJob";
import { CRON_SECRET } from "@/lib/config";
import { empty, json } from "@/lib/http";

// Standard Next.js route option. Vercel honours it; Netlify ignores it and always allows 60 s.
// The job itself budgets about 20 s (lib/cleanupJob.ts), so it fits both.
export const maxDuration = 30;

/**
 * POST /api/cron/cleanup
 * Header: Authorization: Bearer <CRON_SECRET>
 * 200 { deletedClips, deletedFiles, failed, batches, orphanFilesDeleted, orphanFilesFailed, rateLimitRowsDeleted, sweepSkipped }
 * 401 (empty body) | 500 { error, ...totals so far }
 */
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) return empty(401);

  const started = Date.now();
  const totals = emptyTotals();
  try {
    await runCleanupJob({ cleanupExpiredClips, cleanupRateLimits, sweepOrphanedFiles }, totals);
    console.log("[cron/cleanup]", { ...totals, ms: Date.now() - started });
    return json(totals);
  } catch (err) {
    console.error("[cron/cleanup]", err);
    return json({ error: "Cleanup failed.", ...totals }, 500);
  }
}

/**
 * Constant-time check of "Bearer <secret>". Fails closed if CRON_SECRET is unset.
 * Both sides are hashed first so timingSafeEqual always compares equal-length buffers
 * (and the secret's length is not leaked).
 */
function isAuthorized(header: string | null): boolean {
  if (!CRON_SECRET || !header) return false;
  const expected = createHash("sha256").update(`Bearer ${CRON_SECRET}`).digest();
  const actual = createHash("sha256").update(header).digest();
  return timingSafeEqual(expected, actual);
}
