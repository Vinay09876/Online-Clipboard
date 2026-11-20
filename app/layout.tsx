import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BASE_OPEN_GRAPH, DEFAULT_TITLE, INDEXABLE, SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { LogoMark } from "@/components/LogoMark";
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
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f4f5" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

const linkClass =
  "underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100";

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <a
          href="#main"
          // not-sr-only resets padding to 0, so the padding is applied on focus as well.
          className="sr-only rounded-lg bg-indigo-600 text-sm font-medium text-white shadow-lg focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:px-4 focus:py-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
        >
          Skip to content
        </a>

        <header className="px-4 pt-4">
          <div className="mx-auto flex w-full max-w-xl items-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded text-sm font-semibold text-zinc-800 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-200 dark:hover:text-white"
            >
              <LogoMark className="size-6" />
              {SITE_NAME}
            </Link>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
          {children}
        </main>

        <footer className="px-4 pb-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
          <p>No account needed. Don&apos;t share passwords or sensitive personal data.</p>
          <nav aria-label="Site" className="mt-2 flex justify-center gap-4">
            <Link href="/" className={linkClass}>
              Home
            </Link>
            <Link href="/terms" className={linkClass}>
              Terms &amp; privacy
            </Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
