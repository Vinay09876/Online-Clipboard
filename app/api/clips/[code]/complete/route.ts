import { CLIP_CODE_REGEX } from "@/lib/clips";
import { MAX_FILE_SIZE_MB } from "@/lib/config";
import { completeFileUpload } from "@/lib/files";
import { errors, json } from "@/lib/http";
import { consume, getClientIp, isBlocked, record } from "@/lib/rateLimit";

/**
 * POST /api/clips/[code]/complete   (no body needed; any body is ignored)
 * Call after the browser has PUT the file to the signed upload URL.
 * 200 { ok: true } | 400 bad code | 404 not found/expired | 409 not uploaded yet
 * 413 file over the limit (clip deleted) | 429 rate limited (Retry-After) | 500
 *
 * A 404 here also counts as a failed lookup: otherwise this endpoint could be used
 * to probe which codes exist without touching the lookup limit.
 */
export async function POST(request: Request, ctx: RouteContext<"/api/clips/[code]/complete">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  const blocked = await isBlocked("lookup-fail", ip); // DB error -> allow
  if (blocked.kind === "limited") return errors.tooMany(blocked.retryAfter);
  const limit = await consume("complete", ip); // DB error -> allow
  if (limit.kind === "limited") return errors.tooMany(limit.retryAfter);

  try {
    const result = await completeFileUpload(code);
    switch (result) {
      case "ok":
        return json({ ok: true });
      case "not_found":
        await record("lookup-fail", ip);
        return errors.notFound();
      case "missing_object":
        return json({ error: "The file has not been uploaded yet." }, 409);
      case "too_large":
        return json({ error: `File is too large. The limit is ${MAX_FILE_SIZE_MB} MB.` }, 413);
    }
  } catch (err) {
    console.error(`[POST /api/clips/${code}/complete]`, err);
    return errors.internal();
  }
}
