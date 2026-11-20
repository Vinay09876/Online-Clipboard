import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { INDEXABLE, absoluteUrl } from "@/lib/site";
import { SITE_PAGES } from "@/lib/sitePages";

/**
 * /sitemap.xml, built from the single page list in lib/sitePages.ts.
 * Not indexable → an empty sitemap (and robots.txt doesn't mention it).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  if (!INDEXABLE) return [];

  return SITE_PAGES.map((p) => ({
    url: absoluteUrl(p.path)!,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }));
}
