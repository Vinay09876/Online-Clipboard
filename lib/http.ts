import "server-only";

/**
 * Shared response helpers. Every API response goes through `json()` or `empty()`,
 * so every one carries Cache-Control: no-store, and error bodies are always
 * a fixed, generic { error } message (never a raw exception).
 */

export const NO_STORE = "no-store";

/**
 * Max POST body. Text is capped at 100,000 characters; as JSON that can grow up to
 * ~6 bytes per character (\uXXXX escapes), so 1 MB fits any valid request.
 */
export const MAX_JSON_BODY_BYTES = 1024 * 1024;

export function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { "Cache-Control": NO_STORE, ...headers } });
}

export function empty(status: number, headers: Record<string, string> = {}): Response {
  return new Response(null, { status, headers: { "Cache-Control": NO_STORE, ...headers } });
}

export const errors = {
  badRequest: (message: string) => json({ error: message }, 400),
  notFound: () => json({ error: "Clip not found." }, 404),
  tooMany: (retryAfterSeconds: number) =>
    json({ error: "Too many requests. Please try again later." }, 429, {
      "Retry-After": String(Math.max(1, Math.ceil(retryAfterSeconds))),
    }),
  full: () => json({ error: "The service is full right now. Please try again later." }, 503),
  unavailable: () => json({ error: "Could not create a clip right now. Please try again." }, 503),
  internal: () => json({ error: "Something went wrong. Please try again." }, 500),
};

export type JsonBodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

/**
 * Reads a JSON request body safely:
 *  415 unless Content-Type is application/json (charset parameter allowed)
 *  413 if the body is larger than maxBytes (checked on Content-Length AND while streaming,
 *      so a missing or lying Content-Length doesn't help)
 *  400 if it isn't valid JSON
 */
export async function readJsonBody(request: Request, maxBytes = MAX_JSON_BODY_BYTES): Promise<JsonBodyResult> {
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json") {
    return { ok: false, response: json({ error: "Content-Type must be application/json." }, 415) };
  }

  const tooLarge = () => ({
    ok: false as const,
    response: json({ error: "Request body is too large." }, 413),
  });

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return tooLarge();

  let text: string;
  if (request.body) {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        return tooLarge();
      }
      chunks.push(value);
    }
    text = new TextDecoder("utf-8").decode(Buffer.concat(chunks));
  } else {
    text = "";
  }

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, response: errors.badRequest("Request body must be valid JSON.") };
  }
}
