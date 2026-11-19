import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { connection } from "next/server";
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
  title: "Online Clipboard — share text and files with a 6-digit code",
  description:
    "Paste text or drop a file, get a 6-digit code, and open it on any other device. Clips expire automatically. No account needed.",
  applicationName: "Online Clipboard",
  referrer: "no-referrer",
  formatDetection: { telephone: false }, // 6-digit codes are not phone numbers
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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
        <footer className="px-4 pb-6 text-center text-xs text-zinc-600 dark:text-zinc-400">
          <p>No account needed. Don&apos;t share passwords or sensitive personal data.</p>
          <nav aria-label="Site" className="mt-2 flex justify-center gap-4">
            <Link
              href="/"
              className="underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100"
            >
              Home
            </Link>
            <Link
              href="/terms"
              className="underline underline-offset-2 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:text-zinc-100"
            >
              Terms &amp; privacy
            </Link>
          </nav>
        </footer>
      </body>
    </html>
  );
}
