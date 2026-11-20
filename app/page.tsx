import type { Metadata } from "next";
import { headers } from "next/headers";
import { ClipboardApp } from "@/components/ClipboardApp";
import { MAX_TEXT_LENGTH } from "@/lib/clips";
import { CLIP_EXPIRY_MINUTES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, pageUrls, serializeJsonLd } from "@/lib/site";

export const metadata: Metadata = {
  // Title/description come from the layout defaults; this page adds its canonical URL.
  ...pageUrls("/"),
};

/**
 * Server Component. Reads the limits from server config and passes plain numbers to the
 * client, so lib/config.ts (which holds secrets) is never bundled for the browser.
 */
export default async function Home() {
  const limits = {
    maxTextLength: MAX_TEXT_LENGTH,
    maxFileBytes: MAX_FILE_SIZE_BYTES,
    maxFileMb: MAX_FILE_SIZE_MB,
    expiryMinutes: CLIP_EXPIRY_MINUTES,
  };

  // Structured data for search engines. Static, server-built values only.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    ...(SITE_ORIGIN ? { url: `${SITE_ORIGIN}/` } : {}),
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and a modern web browser.",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };
  // Same per-request nonce that proxy.ts put in the CSP (JSON-LD isn't executed, but the
  // nonce keeps every <script> tag consistent with the policy).
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <div className="mx-auto w-full max-w-xl flex-1 px-4 py-6 sm:py-10">
      <script
        type="application/ld+json"
        nonce={nonce}
        // Escaped by serializeJsonLd: "<" can't close the tag. No user data is included.
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(jsonLd) }}
      />

      <div className="mb-6 space-y-2 text-center">
        <h1 className="tracking-tight">
          <span className="block text-2xl font-bold sm:text-3xl">Online Clipboard</span>
          <span className="mt-1 block text-base font-medium text-zinc-700 sm:text-lg dark:text-zinc-300">
            Share text and files with a 6-digit code
          </span>
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No account needed. Everything is deleted after {CLIP_EXPIRY_MINUTES} minutes.
        </p>
      </div>

      <ClipboardApp limits={limits} />
    </div>
  );
}
