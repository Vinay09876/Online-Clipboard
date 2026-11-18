import { CLIP_CODE_REGEX, getClipByCode } from "@/lib/clips";

// Clip contents are private: never let a browser or CDN cache them.
const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/clips/[code]
 * 200 { text, fileName, fileSize, createdAt, expiresAt }
 * 400 invalid code format | 404 not found OR expired (identical) | 500
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/clips/[code]">) {
  const { code } = await ctx.params;

  if (!CLIP_CODE_REGEX.test(code)) {
    return Response.json(
      { error: "Code must be exactly 6 digits." },
      { status: 400, headers: NO_STORE },
    );
  }

  try {
    const clip = await getClipByCode(code);

    // Same response for "never existed" and "expired".
    if (!clip) {
      return Response.json({ error: "Clip not found." }, { status: 404, headers: NO_STORE });
    }

    // Explicit allow-list: id and filePath are never sent to the client.
    return Response.json(
      {
        text: clip.textContent,
        fileName: clip.fileName,
        fileSize: clip.fileSize,
        createdAt: clip.createdAt,
        expiresAt: clip.expiresAt,
      },
      { status: 200, headers: NO_STORE },
    );
  } catch (err) {
    console.error(`[GET /api/clips/${code}]`, err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
