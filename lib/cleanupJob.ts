/**
 * The clean-up run behind POST /api/cron/cleanup, with an explicit time budget so it always
 * answers well inside every platform's limit. Pure: the database work is passed in, so tests
 * can drive it with a fake clock (e2e/platform.spec.ts).
 *
 * Limits it has to fit (checked 2026-11-21):
 *   Vercel   maxDuration = 30 s, set in the route (Hobby allows more; 30 s is our own cap)
 *   Netlify  60 s synchronous function limit, fixed on every plan (docs.netlify.com/build/functions/configuration)
 *   pg_cron  net.http_post(timeout_milliseconds := 30000) in docs/cleanup-scheduling.md
 * The smallest is 30 s, so the job aims to finish in about 20 s (HARD_LIMIT_MS is what tests check against).
 *
 * Safe if interrupted at any point (timeout, crash, redeploy): every batch removes the files
 * first and only then the rows, rows still alive are never selected, and orphaned files are
 * swept on a later run. Whatever is left is simply picked up by the next run, 10 minutes later.
 */

export const CLEANUP_BUDGET = {
  /** Stop starting new batches after this long. */
  batchesMs: 20_000,
  /** Only start the orphan-file sweep if this little time has passed (it lists the whole bucket). */
  sweepStartBeforeMs: 15_000,
  /** Generous worst case for one step (one batch, the rate-limit delete, or the sweep). */
  slowestStepMs: 5_000,
  /** The tightest limit above (Vercel maxDuration and the pg_net timeout). */
  hardLimitMs: 30_000,
  batchSize: 100,
} as const;

export type CleanupTotals = {
  deletedClips: number;
  deletedFiles: number;
  failed: number;
  batches: number;
  orphanFilesDeleted: number;
  orphanFilesFailed: number;
  rateLimitRowsDeleted: number;
  /** True when the orphan sweep was skipped to stay inside the budget. */
  sweepSkipped: boolean;
};

export type CleanupDeps = {
  cleanupExpiredClips: (o: { batchSize: number }) => Promise<{ deletedClips: number; deletedFiles: number; failed: number }>;
  cleanupRateLimits: () => Promise<number>;
  sweepOrphanedFiles: () => Promise<{ deleted: number; failed: number }>;
  now?: () => number;
};

/** Runs one clean-up pass. `totals` is filled in as it goes, so a caller can report partial progress on error. */
export async function runCleanupJob(deps: CleanupDeps, totals: CleanupTotals = emptyTotals()): Promise<CleanupTotals> {
  const now = deps.now ?? Date.now;
  const started = now();
  const elapsed = () => now() - started;
  const B = CLEANUP_BUDGET;

  // 1. Expired clips and abandoned uploads, in batches.
  while (elapsed() < B.batchesMs) {
    const r = await deps.cleanupExpiredClips({ batchSize: B.batchSize });
    totals.batches++;
    totals.deletedClips += r.deletedClips;
    totals.deletedFiles += r.deletedFiles;
    totals.failed += r.failed;
    // Stop when the backlog is drained, or when this batch had failures:
    // failed rows stay in place and would just be selected again.
    if (r.deletedClips + r.failed < B.batchSize || r.failed > 0) break;
  }

  // 2. Old rate-limit counters (one cheap statement).
  totals.rateLimitRowsDeleted = await deps.cleanupRateLimits();

  // 3. Orphaned files, only if there is clearly time left. Runs after step 1 so files of
  //    just-deleted rows are already gone and aren't counted twice.
  if (elapsed() < B.sweepStartBeforeMs) {
    const s = await deps.sweepOrphanedFiles();
    totals.orphanFilesDeleted = s.deleted;
    totals.orphanFilesFailed = s.failed;
  } else {
    totals.sweepSkipped = true;
  }
  return totals;
}

export function emptyTotals(): CleanupTotals {
  return {
    deletedClips: 0,
    deletedFiles: 0,
    failed: 0,
    batches: 0,
    orphanFilesDeleted: 0,
    orphanFilesFailed: 0,
    rateLimitRowsDeleted: 0,
    sweepSkipped: false,
  };
}
