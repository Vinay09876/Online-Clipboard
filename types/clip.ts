/**
 * A shared clip. A clip holds text, a file, or both.
 * Timestamps are ISO 8601 strings (what Supabase returns over JSON).
 */
export type Clip = {
  id: string;
  /** 6-digit code used to retrieve the clip, e.g. "482913". */
  code: string;
  text: string | null;
  /** Path of the file inside Supabase Storage, or null if no file. */
  filePath: string | null;
  /** Original file name shown to the user. */
  fileName: string | null;
  /** File size in bytes. */
  fileSize: number | null;
  createdAt: string;
  expiresAt: string;
};
