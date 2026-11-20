import { NextResponse, type NextRequest } from "next/server";
import { INDEXABLE } from "@/lib/site";

/**
 * Content-Security-Policy with a fresh nonce for every page request.
 *
 * Next.js reads the nonce from the request's CSP header while rendering and adds it to
 * its own <script> tags. Any script without the nonce (an injected one) is blocked.
 * Pages must therefore render per request (see app/page.tsx and app/terms/page.tsx).
 *
 * Production is strict. Development additionally allows:
 *   - 'unsafe-eval'   React uses eval() for better error stacks in dev only
 *   - ws: / wss:      the dev server's hot-reload websocket
 * API routes get a separate, fixed CSP from next.config.ts (they serve JSON, not pages).
 */

/** Origin of the Supabase project (uploads go straight from the browser to it). */
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export function buildCsp(nonce: string, isDev: boolean): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // Tailwind ships a stylesheet, but React sets a few inline style values
    // (e.g. the progress bar width) and Next.js may inject small inline styles.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    `connect-src 'self'${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ""}${isDev ? " ws: wss:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // Belt and braces next to <meta name="robots">: also covers robots.txt, the sitemap,
  // icons and the share image on temporary hosts. (API routes always get it: next.config.ts.)
  if (!INDEXABLE) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: not API routes, build assets, or the favicon.
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
