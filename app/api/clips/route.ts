import { after } from "next/server";
import { checkCapacity } from "@/lib/capacity";
import { cleanupExpiredClips } from "@/lib/cleanup";
import { CodeGenerationError, MAX_TEXT_LENGTH, createClip, type NewClipInput } from "@/lib/clips";
import { parseFileInput } from "@/lib/files";
import { errors, json, readJsonBody } from "@/lib/http";
import { consume, getClientIp } from "@/lib/rateLimit";

const LAZY_CLEANUP_BATCH = 20;

/**
 * POST /api/clips
 * Content-Type: application/json
 * Body: { text?: string, file?: { name: string, size: number } }  (at least one; unknown fields ignored)
 *
 * 201 { code, expiresAt }                                       text-only
 * 201 { code, expiresAt, upload: { signedUrl, token, path } }   with file
 * 400 invalid input | 413 body too large | 415 wrong content type
 * 429 rate limited (Retry-After) | 503 service full / unavailable | 500
 */
export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  // 1. Rate limit every create attempt. If the limiter's DB is down, DENY (protects storage).
  const createLimit = await consume("create", ip);
  if (createLimit.kind === "limited") return errors.tooMany(createLimit.retryAfter);
  if (createLimit.kind === "error") return errors.unavailable();

  // 2. Body: content type, size, JSON.
  const body = await readJsonBody(request);
  if (!body.ok) return body.response;
  if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value)) {
    return errors.badRequest("Request body must be a JSON object.");
  }

  // 3. Fields (anything other than text/file is ignored).
  const { text, file } = body.value as { text?: unknown; file?: unknown };
  const hasText = text !== undefined && text !== null;
  const hasFile = file !== undefined && file !== null;

  if (!hasText && !hasFile) return errors.badRequest('Provide "text", "file", or both.');

  const input: NewClipInput = {};

  if (hasText) {
    if (typeof text !== "string") return errors.badRequest('Field "text" must be a string.');
    if (text.trim().length === 0) return errors.badRequest("Text cannot be empty.");
    if (text.length > MAX_TEXT_LENGTH) {
      return errors.badRequest(`Text cannot be longer than ${MAX_TEXT_LENGTH} characters.`);
    }
    // Postgres text columns cannot store NUL characters.
    if (text.includes("\u0000")) return errors.badRequest("Text contains an invalid character.");
    input.text = text;
  }

  if (hasFile) {
    const parsed = parseFileInput(file);
    if (!parsed.ok) return errors.badRequest(parsed.error);
    input.file = parsed.file;

    // 4. Stricter limit for file clips (in addition to the general one).
    const fileLimit = await consume("create-file", ip);
    if (fileLimit.kind === "limited") return errors.tooMany(fileLimit.retryAfter);
    if (fileLimit.kind === "error") return errors.unavailable();
  }

  // 5. Global caps.
  const capacity = await checkCapacity(input.file?.size ?? 0);
  if (capacity === "full") return errors.full();
  if (capacity === "error") return errors.unavailable();

  // 6. Create.
  try {
    const created = await createClip(input);

    // Lazy cleanup: runs after the response is sent; can never fail this request.
    after(async () => {
      try {
        const r = await cleanupExpiredClips({ batchSize: LAZY_CLEANUP_BATCH });
        if (r.deletedClips || r.failed) console.log("[lazy cleanup]", r);
      } catch (err) {
        console.error("[lazy cleanup]", err);
      }
    });

    return json(created, 201);
  } catch (err) {
    if (err instanceof CodeGenerationError) {
      console.error("[POST /api/clips]", err.message);
      return errors.unavailable();
    }
    console.error("[POST /api/clips]", err);
    return errors.internal();
  }
}
