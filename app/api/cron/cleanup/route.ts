import { createHash, timingSafeEqual } from "node:crypto";
import { cleanupExpiredClips, cleanupRateLimits, sweepOrphanedFiles } from "@/lib/cleanup";
import { CRON_SECRET } from "@/lib/config";
import { empty, json } from "@/lib/http";

// Give the work below room to finish on Vercel (the batch loop budget is 20 s).
export const maxDuration = 30;

const TIME_BUDGET_MS = 20_000;
const BATCH_SIZE = 100;

/**
 * POST /api/cron/cleanup
 * Header: Authorization: Bearer <CRON_SECRET>
 * 200 { deletedClips, deletedFiles, failed, batches, orphanFilesDeleted, orphanFilesFailed, rateLimitRowsDeleted }
 * 401 (empty body) | 500 { error, ...totals so far }
 */
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) return empty(401);

  const started = Date.now();
  const totals = {
    deletedClips: 0,
    deletedFiles: 0,
    failed: 0,
    batches: 0,
    orphanFilesDeleted: 0,
    orphanFilesFailed: 0,
    rateLimitRowsDeleted: 0,
  };

  try {
    // 1. Expired clips and abandoned uploads, in batches.
    while (Date.now() - started < TIME_BUDGET_MS) {
      const r = await cleanupExpiredClips({ batchSize: BATCH_SIZE });
      totals.batches++;
      totals.deletedClips += r.deletedClips;
      totals.deletedFiles += r.deletedFiles;
      totals.failed += r.failed;

      const processed = r.deletedClips + r.failed;
      // Stop when the backlog is drained, or when this batch had failures:
      // failed rows stay in place and would just be selected again.
      if (processed < BATCH_SIZE || r.failed > 0) break;
    }

    // 2. Old rate-limit counters (one cheap statement).
    totals.rateLimitRowsDeleted = await cleanupRateLimits();

    // 3. Orphaned files, if there is time left. Runs after step 1 so files of
    //    just-deleted rows are already gone and aren't counted twice.
    if (Date.now() - started < TIME_BUDGET_MS) {
      const s = await sweepOrphanedFiles();
      totals.orphanFilesDeleted = s.deleted;
      totals.orphanFilesFailed = s.failed;
    }

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
