import { after } from "next/server";
import { cleanupExpiredClips } from "@/lib/cleanup";
import { CodeGenerationError, MAX_TEXT_LENGTH, createClip, type NewClipInput } from "@/lib/clips";
import { parseFileInput } from "@/lib/files";

const LAZY_CLEANUP_BATCH = 20;

/**
 * POST /api/clips
 * Body: { text?: string, file?: { name: string, size: number } }  (at least one)
 * 201 { code, expiresAt }                                  text-only
 * 201 { code, expiresAt, upload: { signedUrl, token, path } }  with file
 * 400 { error } | 503 { error } | 500 { error }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return badRequest("Request body must be a JSON object.");
  }

  const { text, file } = body as { text?: unknown; file?: unknown };
  const hasText = text !== undefined && text !== null;
  const hasFile = file !== undefined && file !== null;

  if (!hasText && !hasFile) {
    return badRequest('Provide "text", "file", or both.');
  }

  const input: NewClipInput = {};

  if (hasText) {
    if (typeof text !== "string") {
      return badRequest('Field "text" must be a string.');
    }
    if (text.trim().length === 0) {
      return badRequest("Text cannot be empty.");
    }
    if (text.length > MAX_TEXT_LENGTH) {
      return badRequest(`Text cannot be longer than ${MAX_TEXT_LENGTH} characters.`);
    }
    if (text.includes("\u0000")) {
      // Postgres text columns cannot store NUL characters.
      return badRequest("Text contains an invalid character.");
    }
    input.text = text;
  }

  if (hasFile) {
    const parsed = parseFileInput(file);
    if (!parsed.ok) return badRequest(parsed.error);
    input.file = parsed.file;
  }

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

    return Response.json(created, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    if (err instanceof CodeGenerationError) {
      console.error("[POST /api/clips]", err.message);
      return Response.json(
        { error: "Could not create a clip right now. Please try again." },
        { status: 503 },
      );
    }
    console.error("[POST /api/clips]", err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}
