import { CLIP_CODE_REGEX } from "@/lib/clips";
import { MAX_FILE_SIZE_MB } from "@/lib/config";
import { finishUpload } from "@/lib/files";
import { completeGate } from "@/lib/gates";
import { errors, json } from "@/lib/http";
import { getClientIp } from "@/lib/rateLimit";

/**
 * POST /api/clips/[code]/complete   (no body needed; any body is ignored)
 * Call after the browser has PUT the file to the signed upload URL.
 * 200 { ok: true } | 400 bad code | 404 not found/expired | 409 not uploaded yet
 * 413 file over the limit (clip deleted) | 429 rate limited (Retry-After) | 500
 *
 * A 404 here also counts as a failed lookup: otherwise this endpoint could be used
 * to probe which codes exist without touching the lookup limit.
 * Block check, rate limit and lookup are one round trip (lib/gates.ts).
 */
export async function POST(request: Request, ctx: RouteContext<"/api/clips/[code]/complete">) {
  const { code } = await ctx.params;
  if (!CLIP_CODE_REGEX.test(code)) return errors.badRequest("Code must be exactly 6 digits.");

  const ip = getClientIp(request.headers);
  try {
    const gate = await completeGate(ip, code);
    if (gate.kind === "limited") return errors.tooMany(gate.retryAfter);
    if (gate.kind === "not_found") return errors.notFound();

    const result = await finishUpload(gate.row);
    switch (result) {
      case "ok":
        return json({ ok: true });
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
