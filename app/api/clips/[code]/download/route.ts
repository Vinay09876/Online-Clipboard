import { CLIP_CODE_REGEX } from "@/lib/clips";
import { getDownloadUrl } from "@/lib/files";
import { errors, json } from "@/lib/http";
import { consume, getClientIp, isBlocked, record } from "@/lib/rateLimit";

/**
 * GET /api/clips/[code]/download
 * 200 { url, expiresIn }  url = signed, 60-second, attachment download of the original file name
 * 400 bad code | 404 not found / expired / not ready / no file (all identical)
 * 429 rate limited (Retry-After)
 * 503 { error, reason: "downloads_paused" } monthly download budget used up | 500
 *
 * Limits: shares the failed-lookup budget with GET /api/clips/[code], plus its own
 * per-IP request limit.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[code]/download">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow
  if (blocked.kind === "limited") return errors.tooMany(blocked.retryAfter);
  const limit = await consume("download", ip); // DB error -> allow
  if (limit.kind === "limited") return errors.tooMany(limit.retryAfter);

  try {
    const result = await getDownloadUrl(code);
    switch (result.kind) {
      case "not_found":
        await record("lookup-fail", ip);
        return errors.notFound();
      case "paused":
        return errors.downloadsPaused();
      case "ok":
        return json({ url: result.url, expiresIn: result.expiresIn });
    }
  } catch (err) {
    console.error(`[GET /api/clips/${code}/download]`, err);
    return errors.internal();
  }
}
