import { createHash, timingSafeEqual } from "node:crypto";
import { cleanupExpiredClips } from "@/lib/cleanup";
import { CRON_SECRET } from "@/lib/config";

// Give the loop below room to finish on Vercel (the time budget is 20 s).
export const maxDuration = 30;

const TIME_BUDGET_MS = 20_000;
const BATCH_SIZE = 100;

/**
 * POST /api/cron/cleanup
 * Header: Authorization: Bearer <CRON_SECRET>
 * 200 { deletedClips, deletedFiles, failed, batches } | 401 | 500
 */
export async function POST(request: Request) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return new Response(null, { status: 401 });
  }

  const started = Date.now();
  const totals = { deletedClips: 0, deletedFiles: 0, failed: 0, batches: 0 };

  try {
    while (Date.now() - started < TIME_BUDGET_MS) {
      const r = await cleanupExpiredClips({ batchSize: BATCH_SIZE });
      totals.batches++;
      totals.deletedClips += r.deletedClips;
      totals.deletedFiles += r.deletedFiles;
      totals.failed += r.failed;

      const processed = r.deletedClips + r.failed;
      // Stop when the backlog is drained, or when this batch had failures:
      // failed rows stay expired and would just be selected again.
      if (processed < BATCH_SIZE || r.failed > 0) break;
    }

    console.log("[cron/cleanup]", { ...totals, ms: Date.now() - started });
    return Response.json(totals, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[cron/cleanup]", err);
    return Response.json(
      { error: "Cleanup failed.", ...totals },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
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
