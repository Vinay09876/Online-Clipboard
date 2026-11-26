import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ContentPage } from "@/components/ContentPage";
import { GUIDES, GUIDE_CATEGORIES, guidePath } from "@/content/guides/index";
import { adPageMetadata } from "@/lib/ads";
import { SITE_NAME, pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical, honest guides for moving text, files and photos between phones and computers, and for using an online clipboard safely.",
  ...pageUrls("/guides", `Guides | ${SITE_NAME}`),
  ...adPageMetadata(),
};

/** The hub's single ad placement comes after this many category groups (renders nothing while ads are off). */
const AD_AFTER_GROUP = 2;

/** Guides grouped by category (registry order within each group). */
export default function GuidesHub() {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
      ]}
      title="Guides"
      lead="Practical answers for moving text, files and photos between your devices, including when a different tool is the better choice."
    >
      {GUIDE_CATEGORIES.map((cat, i) => {
        const guides = GUIDES.filter((g) => g.category === cat.id);
        if (guides.length === 0) return null;
        return (
          <Fragment key={cat.id}>
            <section id={cat.id} aria-labelledby={`${cat.id}-heading`} className="scroll-mt-6 space-y-3 pt-2">
              <h2 id={`${cat.id}-heading`}>{cat.title}</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{cat.description}</p>
              <ul className="!list-none !space-y-3 !pl-0">
                {guides.map((g) => (
                  <li key={g.slug} className="!pl-0">
                    <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                      <h3 className="!pt-0">
                        <Link href={guidePath(g.slug)} className="!no-underline hover:!underline">
                          {g.title}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{g.description}</p>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
            {/* Between two groups (never after the last one), away from the cards' links by the slot's margin. */}
            {i + 1 === AD_AFTER_GROUP && i + 1 < GUIDE_CATEGORIES.length && <AdSlot placement="guides-hub" />}
          </Fragment>
        );
      })}
    </ContentPage>
  );
}
