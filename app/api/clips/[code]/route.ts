import { CLIP_CODE_REGEX } from "@/lib/clips";
import { lookupClip } from "@/lib/gates";
import { errors, json } from "@/lib/http";
import { getClientIp } from "@/lib/rateLimit";

/**
 * GET /api/clips/[code]
 * 200 { text, fileName, fileSize, createdAt, expiresAt }
 * 400 invalid code format | 404 not found OR expired OR pending (identical)
 * 429 too many FAILED lookups from this IP (Retry-After) | 500
 *
 * Only failures (404) count toward the limit; successful fetches don't. Once the limit
 * is reached, every lookup from that IP is refused until the window resets, so a
 * guesser can't keep going by mixing in a known-good code.
 * The block check, the lookup and the failure count are one round trip (lib/gates.ts).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/clips/[code]">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  try {
    const result = await lookupClip(ip, code);
    if (result.kind === "limited") return errors.tooMany(result.retryAfter);
    if (result.kind === "not_found") return errors.notFound();

    // Explicit allow-list: id, filePath and ready are never sent to the client.
    const { text, fileName, fileSize, createdAt, expiresAt } = result.clip;
    return json({ text, fileName, fileSize, createdAt, expiresAt });
  } catch (err) {
    console.error(`[GET /api/clips/${code}]`, err);
    return errors.internal();
  }
}
