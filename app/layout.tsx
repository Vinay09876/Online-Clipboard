import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { connection } from "next/server";
import { BASE_OPEN_GRAPH, DEFAULT_TITLE, INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { adsenseAccountId } from "@/lib/ads";
import { LogoMark } from "@/components/LogoMark";
import { ThemeToggle } from "@/components/ThemeToggle";
import "./globals.css";

// System font stacks only (Tailwind defaults): no web fonts, no external requests.

/**
 * Every page is rendered per request. The CSP in proxy.ts uses a fresh nonce per
 * request, and Next.js can only put that nonce on its <script> tags while rendering
 * a request. A build-time (static) shell would have no nonce and its scripts would be
 * blocked. With cacheComponents enabled, `instant = false` + `connection()` is how a
 * segment opts out of the prerendered shell.
 */
export const instant = false;

const ADSENSE_ACCOUNT = adsenseAccountId();

export const metadata: Metadata = {
  // Absolute base for canonical / Open Graph URLs. Only set when SITE_URL is configured.
  ...(SITE_ORIGIN ? { metadataBase: new URL(SITE_ORIGIN) } : {}),
  title: { default: DEFAULT_TITLE, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  referrer: "no-referrer",
  formatDetection: { telephone: false }, // 6-digit codes are not phone numbers
  // Single source of truth: lib/site.ts. Temporary hosts and the kill switch → noindex.
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false },
  openGraph: BASE_OPEN_GRAPH,
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
  },
  // AdSense site-ownership verification: <meta name="google-adsense-account" content="ca-pub-…">
  // on every page, only when ADSENSE_CLIENT_ID is set on an indexable domain (lib/ads.ts).
  // A plain meta tag: it loads no Google script.
  ...(ADSENSE_ACCOUNT ? { other: { "google-adsense-account": ADSENSE_ACCOUNT } } : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Light by default; the dark theme is opt-in (ThemeToggle), not taken from the device.
  colorScheme: "light",
  themeColor: "#f4f4f5",
};

const MAIN_NAV = [
  { href: "/guides", label: "Guides" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];
const FOOTER_NAV = [
  { href: "/", label: "Home" },
  ...MAIN_NAV,
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

const headerLinkClass =
  "rounded text-zinc-700 underline-offset-4 hover:text-zinc-950 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-300 dark:hover:text-white";

const linkClass =
  "underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100";

/**
 * Applies a saved dark-theme choice before the first paint (no flash). Static string, no
 * user input. Runs with the request's CSP nonce. No saved choice = light.
 */
const THEME_SCRIPT =
  '(function(){try{if(localStorage.getItem("theme")==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()';

/**
 * Netlify's edge adds a newline + an HTML comment inside <head> ("This site is hosted on
 * Netlify…") and its badge <script> after </html>. React finds those nodes where it rendered
 * none and throws hydration error #418, then re-renders the whole page in the browser.
 * This removes them before React starts: the comment and whitespace-only text in <head> right
 * away, the badge script (already blocked by our CSP) as soon as the parser adds it.
 * Static string, no user input; runs with the CSP nonce. A no-op on Vercel and locally.
 */
const HOST_INJECTION_GUARD =
  "(function(){try{var h=document.head;for(var n=h.firstChild;n;){var x=n.nextSibling;" +
  "if((n.nodeType===8&&/Netlify/.test(n.nodeValue))||(n.nodeType===3&&!/\\S/.test(n.nodeValue)))h.removeChild(n);n=x}" +
  "var o=new MutationObserver(function(m){for(var i=0;i<m.length;i++)for(var j=0;j<m[i].addedNodes.length;j++){" +
  'var a=m[i].addedNodes[j];if(a.nodeType===1&&a.tagName==="SCRIPT"&&a.hasAttribute("data-nf-variant"))a.parentNode.removeChild(a)}});' +
  'o.observe(document.documentElement,{childList:true,subtree:true});' +
  'document.addEventListener("DOMContentLoaded",function(){o.disconnect()})}catch(e){}})()';

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    // suppressHydrationWarning: THEME_SCRIPT may add data-theme before React hydrates.
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: HOST_INJECTION_GUARD }} />
      </head>
      <body className="flex min-h-full flex-col bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <a
          href="#main"
          // not-sr-only resets padding to 0, so the padding is applied on focus as well.
          className="sr-only rounded-lg bg-indigo-600 text-sm font-medium text-white shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Skip to content
        </a>

        {/* Same width and side padding as every page column (max-w-2xl px-4), so edges line up. */}
        <header className="pt-4">
          <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded text-sm font-semibold text-zinc-800 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-200 dark:hover:text-white"
            >
              <LogoMark className="size-6" />
              {SITE_NAME}
            </Link>
            <div className="flex items-center gap-3">
              <nav aria-label="Main" className="flex gap-4 text-sm">
                {MAIN_NAV.map((l) => (
                  <Link key={l.href} href={l.href} className={headerLinkClass}>
                    {l.label}
                  </Link>
                ))}
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </main>

        <footer className="px-4 pb-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
          <p>No account needed. Don&apos;t share passwords or sensitive personal data.</p>
          <nav aria-label="Site" className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            {FOOTER_NAV.map((l) => (
              <Link key={l.href} href={l.href} className={linkClass}>
                {l.label}
              </Link>
            ))}
          </nav>
        </footer>
      </body>
    </html>
  );
}
