import { connection } from "next/server";
import { adsTxt } from "@/lib/ads";

/**
 * /ads.txt: Google's one-line authorised-seller record, served only when ADSENSE_CLIENT_ID is
 * set on an indexable domain (lib/ads.ts → adsTxt). Otherwise a real 404, not an empty file.
 * Read per request (connection()), so it follows the running server's env.
 * Official format: https://support.google.com/adsense/answer/12171612
 */
export async function GET() {
  await connection();
  const line = adsTxt();
  if (!line) {
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response(`${line}\n`, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
