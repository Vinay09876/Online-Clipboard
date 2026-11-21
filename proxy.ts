import { NextResponse, type NextRequest } from "next/server";
import { GUIDES } from "@/content/guides/index";
import { isActiveAdPage } from "@/lib/ads";
import { INDEXABLE } from "@/lib/site";

const GUIDE_SLUGS = new Set(GUIDES.map((g) => g.slug));

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
 *
 * Ads (lib/ads.ts). Only while ads are active, and only on pages that can show ads (the
 * /guides hub and known guides), the policy is widened to what Google's AdSense CSP page
 * documents (https://support.google.com/adsense/answer/16283098). Google supports ONLY a
 * nonce-based "strict" CSP and publishes no domain allowlist (its domains change), so no
 * domains are listed; scheme sources are used instead:
 *   script-src  + 'unsafe-inline' 'unsafe-eval' https: http:   (Google's documented script-src;
 *               with a nonce + 'strict-dynamic', current browsers ignore 'unsafe-inline',
 *               https: and http: — they are fallbacks for old browsers. 'unsafe-eval' is NOT
 *               ignored: Google lists it, so the ad code may need it.)
 *   frame-src   https:   ads and Google's consent message render in iframes
 *               (without this, default-src 'self' would block them)
 *   img-src     + https: ad images and measurement pixels
 *   connect-src + https: ad and consent requests
 *   style-src   + https: / font-src + https:   stylesheets/fonts the ad or consent code may add
 * object-src 'none', base-uri, form-action and frame-ancestors stay as they are.
 * Every other page, and every page while ads are off, gets the unchanged policy.
 */

/** Origin of the Supabase project (uploads go straight from the browser to it). */
const SUPABASE_ORIGIN = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "";
  }
})();

export function buildCsp(nonce: string, isDev: boolean, ads = false): string {
  const scriptExtra = ads ? " 'unsafe-inline' 'unsafe-eval' https: http:" : isDev ? " 'unsafe-eval'" : "";
  const https = ads ? " https:" : "";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${scriptExtra}`,
    // Tailwind ships a stylesheet, but React sets a few inline style values
    // (e.g. the progress bar width) and Next.js may inject small inline styles.
    `style-src 'self' 'unsafe-inline'${https}`,
    `img-src 'self' data: blob:${https}`,
    `font-src 'self'${https}`,
    `connect-src 'self'${SUPABASE_ORIGIN ? ` ${SUPABASE_ORIGIN}` : ""}${isDev ? " ws: wss:" : ""}${https}`,
    ...(ads ? ["frame-src https:"] : []),
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const adPage = isActiveAdPage(request.nextUrl.pathname); // always false while ads are off
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development", adPage);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  // Unknown guide slugs must be a real 404. Deciding here, before rendering starts, gives the
  // correct status code (a notFound() inside the streamed page would arrive after a 200), and
  // dynamicParams=false isn't available with cacheComponents. The rewrite target matches no
  // route, so Next.js serves the normal not-found page with status 404.
  const guide = /^\/guides\/([^/]+)\/?$/.exec(request.nextUrl.pathname);
  const response =
    guide && !GUIDE_SLUGS.has(decodeURIComponent(guide[1]))
      ? NextResponse.rewrite(new URL("/__unknown-guide__", request.url), { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // Belt and braces next to <meta name="robots">: also covers robots.txt, the sitemap,
  // icons and the share image on temporary hosts. (API routes always get it: next.config.ts.)
  if (!INDEXABLE) response.headers.set("X-Robots-Tag", "noindex, nofollow");
  // Google's consent message needs cross-origin referrers (default is no-referrer, next.config.ts).
  if (adPage) response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
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
