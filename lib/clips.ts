import "server-only";

import { randomInt } from "node:crypto";
import { CLIP_EXPIRY_MINUTES } from "@/lib/config";
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
  };
}

/**
 * Deletes an expired clip that still holds `code` (not yet removed by the
 * cleanup job), plus its storage object if it had one.
 * Storage failures are logged, not thrown: the code is already free, and an
 * orphaned object is harmless (the Step 4 cleanup can sweep it).
 */
async function freeExpiredCode(code: string): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .delete()
    .eq("code", code)
    .lte("expires_at", new Date().toISOString())
    .select("file_path");

  if (error) throw new Error(`Failed to delete expired clip: ${error.message}`);

  const paths = (data ?? [])
    .map((r: { file_path: string | null }) => r.file_path)
    .filter((p): p is string => !!p);

  if (paths.length > 0) {
    const { error: storageError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .remove(paths);
    if (storageError) {
      console.error("[clips] failed to remove expired file(s)", paths, storageError);
    }
  }
}

/**
 * Creates a text clip with a fresh code.
 * Throws CodeGenerationError if every attempt collides with a live clip,
 * or a plain Error for any other database failure.
 */
export async function createTextClip(
  text: string,
): Promise<{ code: string; expiresAt: string }> {
  for (let attempt = 1; attempt <= MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateCode();
    await freeExpiredCode(code);

    const expiresAt = new Date(Date.now() + CLIP_EXPIRY_MINUTES * 60_000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("clips")
      .insert({ code, text_content: text, expires_at: expiresAt })
      .select("code, expires_at")
      .single<Pick<ClipRow, "code" | "expires_at">>();

    if (!error) return { code: data.code, expiresAt: data.expires_at };

    if (error.code === PG_UNIQUE_VIOLATION) {
      console.warn(`[clips] code collision on attempt ${attempt}, retrying`);
      continue;
    }

    throw new Error(`Failed to insert clip: ${error.code} ${error.message}`);
  }

  throw new CodeGenerationError();
}

/** Returns the live (not expired) clip with this code, or null. */
export async function getClipByCode(code: string): Promise<Clip | null> {
  const { data, error } = await supabaseAdmin
    .from("clips")
    .select("*")
    .eq("code", code)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle<ClipRow>();

  if (error) throw new Error(`Failed to fetch clip: ${error.code} ${error.message}`);
  return data ? rowToClip(data) : null;
}
