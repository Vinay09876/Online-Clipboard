import "server-only";

import { STORAGE_BUCKET } from "@/lib/clips";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Files and unfinished uploads younger than this are never touched by cleanup.
 * Longer than Supabase's signed-upload-URL lifetime (2 h), so an upload that can
 * still legitimately finish is never swept.
 */
export const STALE_AFTER_MS = 3 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Expired (and abandoned) clips
// ---------------------------------------------------------------------------

export type CleanupResult = {
  /** Rows deleted from public.clips. */
  deletedClips: number;
  /** Objects actually removed from the clip-files bucket. */
  deletedFiles: number;
  /** Rows left in place because their file or row could not be deleted. */
  failed: number;
};

type DeadRow = { id: string; file_path: string | null };

/**
 * Deletes one batch of "dead" clips (oldest first) and their files. A clip is dead if:
 *  - it has expired, or
 *  - its upload was never completed (ready = false) and it is older than STALE_AFTER_MS.
 *
 * Order matters:
 *   1. Remove files via the Storage API (never by SQL on storage.objects).
 *   2. Delete rows by id, but only rows whose file is gone (or that had none).
 * If file removal fails, those rows are kept so the next run retries them.
 */
export async function cleanupExpiredClips(
  { batchSize = 100 }: { batchSize?: number } = {},
): Promise<CleanupResult> {
  const now = new Date().toISOString();
  const staleCutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
  const deadFilter = `expires_at.lte.${now},and(ready.eq.false,created_at.lte.${staleCutoff})`;

  const { data, error } = await supabaseAdmin
    .from("clips")
    .select("id, file_path")
    .or(deadFilter)
    .order("expires_at", { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`Cleanup select failed: ${error.code} ${error.message}`);

  const rows = (data ?? []) as DeadRow[];
  if (rows.length === 0) return { deletedClips: 0, deletedFiles: 0, failed: 0 };

  const withFile = rows.filter((r) => r.file_path);
  const textOnly = rows.filter((r) => !r.file_path);

  let deletedFiles = 0;
  let failed = 0;
  const deletableIds = textOnly.map((r) => r.id);

  if (withFile.length > 0) {
    const paths = withFile.map((r) => r.file_path as string);
    const { data: removed, error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths);

    if (storageError) {
      console.error("[cleanup] storage remove failed; keeping rows for retry", {
        count: paths.length,
        error: storageError.message,
      });
      failed += withFile.length;
    } else {
      // A path that doesn't exist (e.g. upload never happened) is not an error.
      deletedFiles = removed?.length ?? 0;
      deletableIds.push(...withFile.map((r) => r.id));
    }
  }

  let deletedClips = 0;
  if (deletableIds.length > 0) {
    const { data: deleted, error: deleteError } = await supabaseAdmin
      .from("clips")
      .delete()
      .in("id", deletableIds)
      .or(deadFilter) // safety: never delete a row that is still alive
      .select("id");

    if (deleteError) {
      console.error("[cleanup] row delete failed", {
        count: deletableIds.length,
        error: `${deleteError.code} ${deleteError.message}`,
      });
      failed += deletableIds.length;
    } else {
      deletedClips = deleted?.length ?? 0;
    }
  }

  return { deletedClips, deletedFiles, failed };
}

// ---------------------------------------------------------------------------
// Orphaned files (object in the bucket, no row in clips)
// ---------------------------------------------------------------------------

export type SweepResult = { scanned: number; deleted: number; failed: number };

/** Storage keys we create are always a clip id (uuid) at the bucket root. */
const CLIP_KEY_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const LIST_PAGE_SIZE = 100;
const LOOKUP_CHUNK = 100;

/**
 * Deletes objects at the bucket root that
 *   - look like a clip key (uuid), and
 *   - are older than minAgeMs, and
 *   - have NO row in clips whose file_path equals the key (live, expired or pending alike).
 *
 * Why this can't delete a file that belongs to a row: a row is always inserted
 * BEFORE its object can exist (the upload URL is created after the insert), and
 * the reference check runs after listing, so any row that exists is seen.
 * Anything not matching the uuid pattern (folders, test files) is ignored.
 *
 * At most `maxObjects` objects are examined per run (oldest first).
 */
export async function sweepOrphanedFiles(
  { minAgeMs = STALE_AFTER_MS, maxObjects = 1000 }: { minAgeMs?: number; maxObjects?: number } = {},
): Promise<SweepResult> {
  const cutoff = Date.now() - minAgeMs;
  const candidates: string[] = [];
  let scanned = 0;

  // 1. List old objects, oldest first. Stop at the first object newer than the cutoff.
  listing: for (let offset = 0; scanned < maxObjects; offset += LIST_PAGE_SIZE) {
    const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).list("", {
      limit: LIST_PAGE_SIZE,
      offset,
      sortBy: { column: "created_at", order: "asc" },
    });
    if (error) throw new Error(`Orphan sweep list failed: ${error.message}`);

    for (const obj of data ?? []) {
      if (!obj.id) continue; // folder, not an object
      scanned++;
      if (!obj.created_at || new Date(obj.created_at).getTime() > cutoff) break listing;
      if (CLIP_KEY_REGEX.test(obj.name)) candidates.push(obj.name);
      if (scanned >= maxObjects) break listing;
    }
    if (!data || data.length < LIST_PAGE_SIZE) break;
  }

  if (candidates.length === 0) return { scanned, deleted: 0, failed: 0 };

  // 2. Drop every candidate that is referenced by any row.
  const referenced = new Set<string>();
  for (let i = 0; i < candidates.length; i += LOOKUP_CHUNK) {
    const chunk = candidates.slice(i, i + LOOKUP_CHUNK);
    const { data, error } = await supabaseAdmin.from("clips").select("file_path").in("file_path", chunk);
    if (error) throw new Error(`Orphan sweep lookup failed: ${error.code} ${error.message}`);
    for (const r of data ?? []) if (r.file_path) referenced.add(r.file_path);
  }
  const orphans = candidates.filter((k) => !referenced.has(k));
  if (orphans.length === 0) return { scanned, deleted: 0, failed: 0 };

  // 3. Delete them.
  const { data: removed, error: rmError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(orphans);
  if (rmError) {
    console.error("[cleanup] orphan remove failed", { count: orphans.length, error: rmError.message });
    return { scanned, deleted: 0, failed: orphans.length };
  }
  return { scanned, deleted: removed?.length ?? 0, failed: 0 };
}
