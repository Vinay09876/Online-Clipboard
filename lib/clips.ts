import "server-only";

import { randomInt, randomUUID } from "node:crypto";
import { CLIP_EXPIRY_MINUTES } from "@/lib/config";
import { fastRpc } from "@/lib/fastRpc";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { Clip, ClipRow } from "@/types/clip";

export const CLIP_CODE_REGEX = /^[0-9]{6}$/;
export const MAX_TEXT_LENGTH = 100_000;
export const STORAGE_BUCKET = "clip-files";

const MAX_CODE_ATTEMPTS = 5;
const PG_UNIQUE_VIOLATION = "23505";

/** Thrown when no free code was found after MAX_CODE_ATTEMPTS tries. */
export class CodeGenerationError extends Error {
  constructor() {
    super(`No free clip code after ${MAX_CODE_ATTEMPTS} attempts`);
    this.name = "CodeGenerationError";
  }
}

/** Cryptographically random 6-digit code, zero-padded: "000000"–"999999". */
export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function rowToClip(row: ClipRow): Clip {
  return {
    id: row.id,
    code: row.code,
    textContent: row.text_content,
    filePath: row.file_path,
    fileName: row.file_name,
    fileSize: row.file_size === null ? null : Number(row.file_size),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    ready: row.ready,
  };
}

/**
 * Deletes an expired clip that still holds `code` (not yet removed by the
 * cleanup job), plus its storage object if it had one.
 * Storage failures are logged, not thrown: the code is already free, and an
 * orphaned object is removed later by the orphan sweep.
 */
async function freeExpiredCode(code: string): Promise<void> {
  await removeObjects(await deleteExpiredHolder(code));
}

/** Deletes the expired clip holding `code` (if any) and returns its file path(s). */
async function deleteExpiredHolder(code: string): Promise<string[]> {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .delete()
    .eq("code", code)
    .lte("expires_at", new Date().toISOString())
    .select("file_path");

  if (error) throw new Error(`Failed to delete expired clip: ${error.message}`);

  return (data ?? []).map((r: { file_path: string | null }) => r.file_path).filter((p): p is string => !!p);
}

/** Removes storage objects of freed clips. Failures are logged; the orphan sweep retries. */
async function removeObjects(paths: string[]): Promise<void> {
  if (paths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("[clips] failed to remove expired file(s)", paths.length, storageError.message);
    }
  }
}

export type CreateClipOptions = {
  /** Code generator. Defaults to generateCode; tests pass a fake to force collisions. */
  generateCode?: () => string;
  /**
   * Runs work that doesn't need to delay the response (removing a freed clip's old file).
   * API routes pass `after`; by default it is awaited inline (scripts, tests).
   */
  defer?: (task: () => Promise<void>) => void;
};

/** Already-validated input (see app/api/clips/route.ts and lib/files.ts). */
export type NewClipInput = {
  text?: string;
  file?: { name: string; size: number };
};

export type CreatedClip = {
  code: string;
  expiresAt: string;
  /** Present only for file clips: where the browser PUTs the file bytes. */
  upload?: { signedUrl: string; token: string; path: string };
};

/**
 * Creates a clip with a fresh code (text, file, or both).
 *
 * File clips are inserted with ready = false. The storage key is the clip's own
 * id (never the user's file name). A signed upload URL for that key is returned;
 * if creating it fails, the row is deleted again.
 *
 * Throws CodeGenerationError if every code attempt collides with a live clip,
 * or a plain Error for any other failure.
 */
export async function createClip(
  input: NewClipInput,
  options: CreateClipOptions = {},
): Promise<CreatedClip> {
  const nextCode = options.generateCode ?? generateCode;
  const id = randomUUID();
  const file = input.file;

  let created: { code: string; expiresAt: string } | null = null;

  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS && !created; attempt++) {
    const code = nextCode();
    const expiresAt = new Date(Date.now() + CLIP_EXPIRY_MINUTES * 60_000).toISOString();

    // Fast path (db/005): free an expired holder + insert, in ONE round trip.
    const fast = await fastRpc<{ inserted: boolean; out_expires_at: string | null; freed_paths: string[] | null }>(
      "clip_insert_with_code",
      {
        p_id: id,
        p_code: code,
        p_text: input.text ?? null,
        p_file_path: file ? id : null,
        p_file_name: file ? file.name : null,
        p_file_size: file ? file.size : null,
        p_ready: !file,
        p_expires_at: expiresAt,
      },
    );
    if (fast) {
      const freed = fast.freed_paths ?? [];
      if (freed.length > 0) {
        const task = () => removeObjects(freed);
        if (options.defer) options.defer(task);
        else await task();
      }
      if (fast.inserted) created = { code, expiresAt: fast.out_expires_at! };
      else console.warn(`[clips] code collision on attempt ${attempt}, retrying`);
      continue;
    }

    // Original path: two round trips.
    await freeExpiredCode(code);

    const { data, error } = await supabaseAdmin
      .from("clips")
      .insert({
        id,
        code,
        text_content: input.text ?? null,
        file_path: file ? id : null,
        file_name: file ? file.name : null,
        file_size: file ? file.size : null,
        ready: !file,
        expires_at: expiresAt,
      })
      .select("code, expires_at")
      .single<Pick<ClipRow, "code" | "expires_at">>();

    if (!error) {
      created = { code: data.code, expiresAt: data.expires_at };
    } else if (error.code === PG_UNIQUE_VIOLATION) {
      console.warn(`[clips] code collision on attempt ${attempt}, retrying`);
    } else {
      throw new Error(`Failed to insert clip: ${error.code} ${error.message}`);
    }
  }

  if (!created) throw new CodeGenerationError();
  if (!file) return created;

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(id);

  if (signError || !signed) {
    const { error: rollbackError } = await supabaseAdmin.from("clips").delete().eq("id", id);
    if (rollbackError) console.error("[clips] rollback after signed URL failure failed", rollbackError.message);
    throw new Error(`Failed to create signed upload URL: ${signError?.message ?? "no data"}`);
  }

  return {
    ...created,
    upload: { signedUrl: signed.signedUrl, token: signed.token, path: signed.path },
  };
}

/** Text-only shortcut (kept for scripts/test-collisions.ts). */
export async function createTextClip(
  text: string,
  options: CreateClipOptions = {},
): Promise<{ code: string; expiresAt: string }> {
  const { code, expiresAt } = await createClip({ text }, options);
  return { code, expiresAt };
}

/** Returns the live (not expired) AND ready clip with this code, or null. */
export async function getClipByCode(code: string): Promise<Clip | null> {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .select("*")
    .eq("code", code)
    .eq("ready", true)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<ClipRow>();

  if (error) throw new Error(`Failed to fetch clip: ${error.code} ${error.message}`);
  return data ? rowToClip(data) : null;
}
