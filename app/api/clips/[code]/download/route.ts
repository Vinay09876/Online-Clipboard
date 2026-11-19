import { CLIP_CODE_REGEX } from "@/lib/clips";
import { getDownloadUrl } from "@/lib/files";

const NO_STORE = { "Cache-Control": "no-store" };

/**
 * GET /api/clips/[code]/download
 * 200 { url, expiresIn }  url = signed, 60-second, attachment download of the original file name
 * 400 bad code | 404 not found / expired / not ready / no file (all identical) | 500
 */
export async function GET(_request: Request, ctx: RouteContext<"/api/clips/[code]/download">) {
  const { code } = await ctx.params;

  if (!CLIP_CODE_REGEX.test(code)) {
    return Response.json({ error: "Code must be exactly 6 digits." }, { status: 400, headers: NO_STORE });
  }

  try {
    const result = await getDownloadUrl(code);
    if (!result) {
      return Response.json({ error: "Clip not found." }, { status: 404, headers: NO_STORE });
    }
    return Response.json(result, { headers: NO_STORE });
  } catch (err) {
    console.error(`[GET /api/clips/${code}/download]`, err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500, headers: NO_STORE },
    );
  }
}
