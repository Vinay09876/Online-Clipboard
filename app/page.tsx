import type { Metadata } from "next";
import { ClipboardApp } from "@/components/ClipboardApp";
import { HomeContent } from "@/components/HomeContent";
import { JsonLd } from "@/components/JsonLd";
import { homeContent, plainText } from "@/content/home";
import { MAX_TEXT_LENGTH } from "@/lib/clips";
import { CLIP_EXPIRY_MINUTES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "@/lib/config";
import { getSiteFacts } from "@/lib/facts";
import { SITE_DESCRIPTION, SITE_NAME, SITE_ORIGIN, pageUrls } from "@/lib/site";

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

  // Every number in the page copy comes from server config (lib/facts.ts).
  const content = homeContent(getSiteFacts());

  // Structured data for search engines. Static, server-built values only.
  // WebSite: Google reads the site name shown in results from this node on the home page
  // (developers.google.com/search/docs/appearance/site-names). Omitted without SITE_URL:
  // the node needs the absolute home URL.
  const webSite = SITE_ORIGIN
    ? {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        alternateName: ["Online Clipboard"],
        url: `${SITE_ORIGIN}/`,
      }
    : null;
  const webApp = {
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
  // FAQPage built from exactly the questions and answers rendered below.
  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer.map(plainText).join(" ") },
    })),
  };

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-10 pt-5 sm:pt-6">
      <JsonLd data={webSite ? [webSite, webApp, faqPage] : [webApp, faqPage]} />

      <div className="mb-5 space-y-2 text-center">
        <h1 className="tracking-tight">
          <span className="block text-2xl font-bold sm:text-3xl">{SITE_NAME}</span>
          <span className="mt-1 block text-base font-medium text-zinc-700 sm:text-lg dark:text-zinc-300">
            Online clipboard: share text and files with a <span className="whitespace-nowrap">6-digit code</span>
          </span>
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No account needed. Everything is deleted after {CLIP_EXPIRY_MINUTES} minutes.
        </p>
      </div>

      <ClipboardApp limits={limits} />

      {/* Quick jumps to the explanations below; the content itself stays on the page. */}
      <nav aria-label="On this page" className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
        {[content.howItWorks, content.privacy, content.faq].map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="rounded text-zinc-600 underline underline-offset-4 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            {s.id === "faq" ? "FAQ" : s.title}
          </a>
        ))}
      </nav>

      <HomeContent content={content} />
    </div>
  );
}
