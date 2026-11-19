/**
 * A shared clip. A clip holds text, a file, or both.
 * Field names are the camelCase form of the DB columns (see db/001_init.sql).
 * Timestamps are ISO 8601 strings (what Supabase returns over JSON).
 */
export type Clip = {
  id: string;
  /** 6-digit code used to retrieve the clip, e.g. "482913". */
  code: string;
  /** DB column: text_content */
  textContent: string | null;
  /** Path of the file inside the clip-files bucket. Server-only, never sent to the client. */
  filePath: string | null;
  /** Original file name shown to the user. */
  fileName: string | null;
  /** File size in bytes. */
  fileSize: number | null;
  createdAt: string;
  expiresAt: string;
  /** false while a file upload is pending; such clips are invisible to readers. */
  ready: boolean;
};

/** Shape of a row in the public.clips table (snake_case, as stored). */
export type ClipRow = {
  id: string;
  code: string;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  expires_at: string;
  ready: boolean;
};
