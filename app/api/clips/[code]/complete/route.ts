import { CLIP_CODE_REGEX } from "@/lib/clips";
import { MAX_FILE_SIZE_MB } from "@/lib/config";
import { completeFileUpload } from "@/lib/files";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * POST /api/clips/[code]/complete
 * Call after the browser has PUT the file to the signed upload URL.
 * 200 { ok: true } | 400 bad code | 404 not found/expired | 409 not uploaded yet
 * 413 file over the limit (clip deleted) | 500
 */
export async function POST(_request: Request, ctx: RouteContext<"/api/clips/[code]/complete">) {
  const { code } = await ctx.params;

  if (!CLIP_CODE_REGEX.test(code)) {
    return Response.json({ error: "Code must be exactly 6 digits." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await completeFileUpload(code);

    switch (result) {
      case "ok":
        return Response.json({ ok: true }, { headers: NO_STORE });
      case "not_found":
        return Response.json({ error: "Clip not found." }, { status: 404, headers: NO_STORE });
      case "missing_object":
        return Response.json(
          { error: "The file has not been uploaded yet." },
          { status: 409, headers: NO_STORE },
        );
      case "too_large":
        return Response.json(
          { error: `File is too large. The limit is ${MAX_FILE_SIZE_MB} MB.` },
          { status: 413, headers: NO_STORE },
        );
    }
  } catch (err) {
    console.error(`[POST /api/clips/${code}/complete]`, err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
