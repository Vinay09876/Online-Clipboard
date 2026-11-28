import Link from "next/link";
import type { ReactNode } from "react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ContentPage } from "@/components/ContentPage";
import type { Source } from "@/content/guides/bodies";
import { guidePath, type GuideMeta } from "@/content/guides/index";
import { SHARE_IMAGE, SITE_NAME, absoluteUrl } from "@/lib/site";

const formatDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** schema.org Article for a guide. Author and publisher are the site (no personal name yet). */
export function articleJsonLd(guide: GuideMeta): Record<string, unknown> {
  const url = absoluteUrl(guidePath(guide.slug));
  const image = absoluteUrl(SHARE_IMAGE.url);
  const logo = absoluteUrl("/icon-512.png");
  const site = { "@type": "Organization", name: SITE_NAME, ...(absoluteUrl("/") ? { url: absoluteUrl("/") } : {}) };
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.datePublished,
    dateModified: guide.dateModified,
    inLanguage: "en",
    author: site,
    publisher: { ...site, ...(logo ? { logo: { "@type": "ImageObject", url: logo } } : {}) },
    ...(url ? { mainEntityOfPage: { "@type": "WebPage", "@id": url }, url } : {}),
    ...(image ? { image } : {}),
  };
}

/**
 * Shared structure for every guide: breadcrumbs, one h1, summary, last-updated date, body,
 * the required "When this tool is not the right choice" section, official sources, related
 * guides and a calm link back to the tool. Server Component.
 *
 * Ad placements (lib/ads.ts; render nothing unless ads are active): one after the intro
 * ("In short" + date), one after the article and its sources, before "Related guides".
 */
export function GuideLayout({
  guide,
  related,
  body,
  notRightFor,
  sources,
}: {
  guide: GuideMeta;
  related: GuideMeta[];
  body: ReactNode;
  notRightFor: ReactNode;
  sources: Source[];
}) {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
        { name: guide.title, path: guidePath(guide.slug) },
      ]}
      title={guide.title}
      lead={
        <div className="rounded-xl bg-indigo-50 p-4 text-[15px] text-zinc-800 dark:bg-indigo-950/40 dark:text-zinc-200">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-indigo-800 dark:text-indigo-300">
            In short
          </p>
          <p>{guide.summary}</p>
        </div>
      }
      meta={
        <>
          Last updated <time dateTime={guide.dateModified}>{formatDate(guide.dateModified)}</time>
        </>
      }
      extraJsonLd={[articleJsonLd(guide)]}
    >
      <AdSlot placement="guide-after-intro" />

      {body}

      <h2 id="not-the-right-choice">When this tool is not the right choice</h2>
      {notRightFor}

      {/* Off for guides where promoting the tool would be wrong (e.g. Wi-Fi passwords). */}
      {guide.toolLink !== false && (
        <p className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
          Want to try it? <Link href="/">Open {SITE_NAME}</Link>. No account needed.
        </p>
      )}

      {sources.length > 0 && (
        <>
          <h2>Official help pages</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Device features and menu names change between versions. These official pages have the current details.
          </p>
          <ul className="text-sm">
            {sources.map((s) => (
              <li key={s.href}>
                <a href={s.href} rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </>
      )}

      <AdSlot placement="guide-before-related" />

      <h2>Related guides</h2>
      <ul>
        {related.map((r) => (
          <li key={r.slug}>
            <Link href={guidePath(r.slug)}>{r.title}</Link>
          </li>
        ))}
        <li>
          <Link href="/guides">All guides</Link>
        </li>
      </ul>
    </ContentPage>
  );
}
