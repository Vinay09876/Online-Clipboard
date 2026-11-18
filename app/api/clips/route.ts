import { after } from "next/server";
import { cleanupExpiredClips } from "@/lib/cleanup";
import { CodeGenerationError, MAX_TEXT_LENGTH, createTextClip } from "@/lib/clips";

const LAZY_CLEANUP_BATCH = 20;

/**
 * POST /api/clips
 * Body: { text: string }
 * 201 { code, expiresAt } | 400 { error } | 503 { error } | 500 { error }
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("Request body must be valid JSON.");
  }

  const text =
    typeof body === "object" && body !== null ? (body as { text?: unknown }).text : undefined;

  if (typeof text !== "string") {
    return badRequest('Field "text" is required and must be a string.');
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

  try {
    const { code, expiresAt } = await createTextClip(text);

    // Lazy cleanup: runs after the response is sent; can never fail this request.
    after(async () => {
      try {
        const r = await cleanupExpiredClips({ batchSize: LAZY_CLEANUP_BATCH });
        if (r.deletedClips || r.failed) console.log("[lazy cleanup]", r);
      } catch (err) {
        console.error("[lazy cleanup]", err);
      }
    });

    return Response.json({ code, expiresAt }, { status: 201 });
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
