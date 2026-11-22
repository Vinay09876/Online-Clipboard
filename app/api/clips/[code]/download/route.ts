import { CLIP_CODE_REGEX } from "@/lib/clips";
import { signDownload } from "@/lib/files";
import { downloadGate } from "@/lib/gates";
import { errors, json } from "@/lib/http";
import { getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/clips/[code]/download
 * 200 { url, expiresIn }  url = signed, 60-second, attachment download of the original file name
 * 400 bad code | 404 not found / expired / not ready / no file (all identical)
 * 429 rate limited (Retry-After)
 * 503 { error, reason: "downloads_paused" } monthly download budget used up | 500
 *
 * Limits: shares the failed-lookup budget with GET /api/clips/[code], plus its own
 * per-IP request limit. Block check, rate limit, lookup and the monthly budget are one
 * round trip (lib/gates.ts); signing the URL is the second.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[code]/download">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  try {
    const gate = await downloadGate(ip, code);
    switch (gate.kind) {
      case "limited":
        return errors.tooMany(gate.retryAfter);
      case "not_found":
        return errors.notFound();
      case "paused":
        return errors.downloadsPaused();
      case "ok": {
        const signed = await signDownload(gate.filePath, gate.fileName);
        return json({ url: signed.url, expiresIn: signed.expiresIn });
      }
    }
  } catch (err) {
    console.error(`[GET /api/clips/${code}/download]`, err);
    return errors.internal();
  }
}
