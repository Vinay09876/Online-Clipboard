import "server-only";

import { STORAGE_BUCKET } from "@/lib/clips";
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const DOWNLOAD_URL_TTL_SECONDS = 60;
const MAX_FILE_NAME_LENGTH = 255;

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

/**
 * Makes a user-supplied file name safe to store and to send back as a download name.
 * It is never used in a storage key.
 *  - keeps only the last path segment ("../../evil.txt" -> "evil.txt")
 *  - removes control characters and bidi-override characters (used to disguise extensions)
 *  - trims, caps at 255 characters (keeping the extension), falls back to "file"
 */
export function sanitizeFileName(raw: string): string {
  let name = raw.normalize("NFC");
  name = name.split(/[/\\]/).pop() ?? "";
  name = name.replace(/[\u0000-\u001f\u007f-\u009f]/g, "");
  name = name.replace(/[‎‏‪-‮⁦-⁩]/g, "");
  name = name.trim();

  if (/^\.*$/.test(name)) return "file"; // "", ".", ".."

  const chars = Array.from(name); // count code points, never split a character
  if (chars.length > MAX_FILE_NAME_LENGTH) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 ? Array.from(name.slice(dot)) : [];
    if (ext.length > 0 && ext.length <= 16) {
      name = chars.slice(0, MAX_FILE_NAME_LENGTH - ext.length).join("") + ext.join("");
    } else {
      name = chars.slice(0, MAX_FILE_NAME_LENGTH).join("");
    }
  }
  return name;
}

export type FileInput = { name: string; size: number };

/** Validates `file` from the request body. Returns the clean value or an error message. */
export function parseFileInput(value: unknown): { ok: true; file: FileInput } | { ok: false; error: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: 'Field "file" must be an object: { name, size }.' };
  }
  const { name, size } = value as { name?: unknown; size?: unknown };

  if (typeof name !== "string") {
    return { ok: false, error: 'Field "file.name" is required and must be a string.' };
  }
  if (typeof size !== "number" || !Number.isInteger(size) || size <= 0) {
    return { ok: false, error: 'Field "file.size" must be a positive whole number of bytes.' };
  }
  if (size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `File is too large. The limit is ${MAX_FILE_SIZE_MB} MB.` };
  }
  return { ok: true, file: { name: sanitizeFileName(name), size } };
}

// ---------------------------------------------------------------------------
// Complete an upload
// ---------------------------------------------------------------------------

export type CompleteResult = "ok" | "not_found" | "missing_object" | "too_large";

function isStorageNotFound(err: unknown): boolean {
  const e = err as { status?: number; statusCode?: string } | null;
  return e?.statusCode === "404" || e?.status === 404;
}

/**
 * Marks a file clip ready after checking the uploaded object.
 *  not_found       no live file clip with this code
 *  missing_object  nothing uploaded yet (client may upload and call again)
 *  too_large       real size over the limit: object AND row are deleted
 *  ok              file_size set to the real size, ready = true
 *                  (also returned if the clip is already ready, so retries are safe)
 */
export async function completeFileUpload(
  code: string,
  { maxBytes = MAX_FILE_SIZE_BYTES }: { maxBytes?: number } = {},
): Promise<CompleteResult> {
  const { data: row, error } = await supabaseAdmin
    .from("clips")
    .select("id, file_path, ready")
    .eq("code", code)
    .not("file_path", "is", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ id: string; file_path: string; ready: boolean }>();

  if (error) throw new Error(`Complete lookup failed: ${error.code} ${error.message}`);
  if (!row) return "not_found";
  if (row.ready) return "ok";

  const { data: info, error: infoError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .info(row.file_path);

  if (infoError) {
    if (isStorageNotFound(infoError)) return "missing_object";
    throw new Error(`Storage info failed: ${infoError.message}`);
  }

  const realSize = info?.size;
  if (typeof realSize !== "number") throw new Error("Storage info returned no size");

  if (realSize > maxBytes) {
    const { error: rmError } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([row.file_path]);
    if (rmError) {
      // Keep the row so the expiry cleanup can retry the file deletion later.
      console.error("[files] could not delete oversized object", rmError.message);
    } else {
      const { error: delError } = await supabaseAdmin.from("clips").delete().eq("id", row.id);
      if (delError) console.error("[files] could not delete oversized clip row", delError.message);
    }
    return "too_large";
  }

  const { error: updError } = await supabaseAdmin
    .from("clips")
    .update({ file_size: realSize, ready: true })
    .eq("id", row.id)
    .eq("ready", false);

  if (updError) throw new Error(`Complete update failed: ${updError.code} ${updError.message}`);
  return "ok";
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

/**
 * Signed, short-lived download URL for a ready, unexpired file clip, or null.
 * The browser downloads it as an attachment named after the original file.
 */
export async function getDownloadUrl(code: string): Promise<{ url: string; expiresIn: number } | null> {
  const { data: row, error } = await supabaseAdmin
    .from("clips")
    .select("file_path, file_name")
    .eq("code", code)
    .eq("ready", true)
    .not("file_path", "is", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<{ file_path: string; file_name: string | null }>();

  if (error) throw new Error(`Download lookup failed: ${error.code} ${error.message}`);
  if (!row) return null;

  const { data, error: signError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(row.file_path, DOWNLOAD_URL_TTL_SECONDS);

  if (signError || !data) throw new Error(`Signed download URL failed: ${signError?.message ?? "no data"}`);

  // Add ?download=<name> ourselves. supabase-js's own `download` option encodes the
  // name twice, which garbles names containing ( ) & # or non-ASCII characters.
  const url = new URL(data.signedUrl);
  url.searchParams.set("download", row.file_name || "file");

  return { url: url.toString(), expiresIn: DOWNLOAD_URL_TTL_SECONDS };
}
