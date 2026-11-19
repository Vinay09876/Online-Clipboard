import { CLIP_CODE_REGEX, getClipByCode } from "@/lib/clips";
import { errors, json } from "@/lib/http";
import { getClientIp, isBlocked, record } from "@/lib/rateLimit";

/**
 * GET /api/clips/[code]
 * 200 { text, fileName, fileSize, createdAt, expiresAt }
 * 400 invalid code format | 404 not found OR expired OR pending (identical)
 * 429 too many FAILED lookups from this IP (Retry-After) | 500
 *
 * Only failures (404) count toward the limit; successful fetches don't. Once the limit
 * is reached, every lookup from that IP is refused until the window resets, so a
 * guesser can't keep going by mixing in a known-good code.
 */
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[code]">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow (reads stay up)
  if (blocked.kind === "limited") return errors.tooMany(blocked.retryAfter);

  try {
    const clip = await getClipByCode(code);
    if (!clip) {
      await record("lookup-fail", ip);
      return errors.notFound();
    }

    // Explicit allow-list: id, filePath and ready are never sent to the client.
    return json({
      text: clip.textContent,
      fileName: clip.fileName,
      fileSize: clip.fileSize,
      createdAt: clip.createdAt,
      expiresAt: clip.expiresAt,
    });
  } catch (err) {
    console.error(`[GET /api/clips/${code}]`, err);
    return errors.internal();
  }
}
