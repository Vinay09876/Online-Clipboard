import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { GUIDES, guidePath } from "@/content/guides/index";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Practical, honest guides for moving text and files between phones and computers, and for using an online clipboard safely.",
  ...pageUrls("/guides", "Guides | Online Clipboard"),
};

export default function GuidesHub() {
  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Guides", path: "/guides" },
      ]}
      title="Guides"
      lead="Practical answers for moving text and files between your devices, including when a different tool is the better choice."
    >
      <ul className="!list-none !space-y-4 !pl-0">
        {GUIDES.map((g) => (
          <li key={g.slug} className="!pl-0">
            <article className="rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
              <h2 className="!pt-0 !text-lg">
                <Link href={guidePath(g.slug)} className="!no-underline hover:!underline">
                  {g.title}
                </Link>
              </h2>
              <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">{g.description}</p>
            </article>
          </li>
        ))}
      </ul>
    </ContentPage>
  );
}
