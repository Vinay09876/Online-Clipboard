import type { Metadata, Viewport } from "next";
import "./globals.css";

// System font stacks only (Tailwind defaults): no web fonts, no external requests.

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-zinc-100 font-sans text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        {children}
      </body>
    </html>
  );
}
