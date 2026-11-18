import "server-only";

import { STORAGE_BUCKET } from "@/lib/clips";
import { supabaseAdmin } from "@/lib/supabase/admin";

export type CleanupResult = {
  /** Rows deleted from public.clips. */
  deletedClips: number;
  /** Objects actually removed from the clip-files bucket. */
  deletedFiles: number;
  /** Expired rows left in place because their file or row could not be deleted. */
  failed: number;
};

type ExpiredRow = { id: string; file_path: string | null };

/**
 * Deletes one batch of expired clips (oldest first) and their files.
 *
 * Order matters:
 *   1. Remove files via the Storage API (never by SQL on storage.objects).
 *   2. Delete rows by id, but only rows whose file is gone (or that had none).
 * If file removal fails, those rows are kept so the next run retries them;
 * the row is the only record of where the file lives.
 */
export async function cleanupExpiredClips(
  { batchSize = 100 }: { batchSize?: number } = {},
): Promise<CleanupResult> {
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from("clips")
    .select("id, file_path")
    .lte("expires_at", now)
    .order("expires_at", { ascending: true })
    .limit(batchSize);

  if (error) throw new Error(`Cleanup select failed: ${error.code} ${error.message}`);

  const rows = (data ?? []) as ExpiredRow[];
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
      // Keep these rows; next run retries.
      console.error("[cleanup] storage remove failed; keeping rows for retry", {
        count: paths.length,
        error: storageError.message,
      });
      failed += withFile.length;
    } else {
      // A path that no longer exists is not an error: the file is gone either way.
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
      .lte("expires_at", now) // safety: never delete a row that is somehow live
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
