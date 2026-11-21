import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { GUIDE_BODIES } from "@/content/guides/bodies";
import { GUIDES, getGuide, guidePath } from "@/content/guides/index";
import { getSiteFacts } from "@/lib/facts";
import { adPageMetadata } from "@/lib/ads";
import { pageUrls } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/guides/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.title,
    description: guide.description,
    ...pageUrls(guidePath(guide.slug), guide.title),
    ...adPageMetadata(),
  };
}

export default async function GuidePage({ params }: PageProps<"/guides/[slug]">) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const render = guide && GUIDE_BODIES[guide.slug];
  if (!guide || !render) notFound();

  const related = guide.related.map((s) => GUIDES.find((g) => g.slug === s)).filter((g) => g !== undefined);
  const { body, notRightFor, sources } = render(getSiteFacts());

  return <GuideLayout guide={guide} related={related} body={body} notRightFor={notRightFor} sources={sources} />;
}
