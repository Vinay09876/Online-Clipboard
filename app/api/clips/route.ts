import { after } from "next/server";
import { cleanupExpiredClips } from "@/lib/cleanup";
import { CodeGenerationError, MAX_TEXT_LENGTH, createClip, type NewClipInput } from "@/lib/clips";
import { parseFileInput } from "@/lib/files";
import { createGate } from "@/lib/gates";
import { errors, json, readJsonBody } from "@/lib/http";
import { getClientIp } from "@/lib/rateLimit";

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
 *
 * Order of decisions (unchanged): create limit → input errors → file limit → caps → create.
 * The body is read and validated locally first, so all the database checks can run in ONE
 * round trip (lib/gates.ts); an invalid request still counts against the create limit,
 * and a rate-limited client still gets 429 whatever it sent.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request.headers);

  // 1. Read and validate the body (no database work).
  const validated = validateBody(await readJsonBody(request));

  // 2. Rate limits + global caps. If the limiter's DB is down, DENY (protects storage).
  const gate = await createGate(ip, validated.ok ? validated.input : null);
  if (gate.create.kind === "limited") return errors.tooMany(gate.create.retryAfter);
  if (gate.create.kind === "error") return errors.unavailable();
  if (!validated.ok) return validated.response;
  if (gate.file?.kind === "limited") return errors.tooMany(gate.file.retryAfter);
  if (gate.file?.kind === "error") return errors.unavailable();
  if (gate.capacity === "full") return errors.full();
  if (gate.capacity !== "ok") return errors.unavailable();

  // 3. Create. Removing a reused code's old file waits until after the response.
  try {
    const created = await createClip(validated.input, { defer: (task) => after(task) });

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

type Validated = { ok: true; input: NewClipInput } | { ok: false; response: Response };

/** Body checks: content type, size and JSON (readJsonBody), then the fields. */
function validateBody(body: Awaited<ReturnType<typeof readJsonBody>>): Validated {
  const bad = (message: string): Validated => ({ ok: false, response: errors.badRequest(message) });
  if (!body.ok) return { ok: false, response: body.response };
  if (typeof body.value !== "object" || body.value === null || Array.isArray(body.value)) {
    return bad("Request body must be a JSON object.");
  }

  // Fields (anything other than text/file is ignored).
  const { text, file } = body.value as { text?: unknown; file?: unknown };
  const hasText = text !== undefined && text !== null;
  const hasFile = file !== undefined && file !== null;
  if (!hasText && !hasFile) return bad('Provide "text", "file", or both.');

  const input: NewClipInput = {};
  if (hasText) {
    if (typeof text !== "string") return bad('Field "text" must be a string.');
    if (text.trim().length === 0) return bad("Text cannot be empty.");
    if (text.length > MAX_TEXT_LENGTH) return bad(`Text cannot be longer than ${MAX_TEXT_LENGTH} characters.`);
    // Postgres text columns cannot store NUL characters.
    if (text.includes("\u0000")) return bad("Text contains an invalid character.");
    input.text = text;
  }
  if (hasFile) {
    const parsed = parseFileInput(file);
    if (!parsed.ok) return bad(parsed.error);
    input.file = parsed.file;
  }
  return { ok: true, input };
}
