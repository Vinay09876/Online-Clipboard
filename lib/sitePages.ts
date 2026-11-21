/**
 * The ONE list of public, indexable pages. The sitemap is built from it.
 * Static pages are listed here; guides come from the guide registry automatically.
 *
 * Don't list: API routes, error pages, or anything that shows a received clip.
 */
import { GUIDES, guidePath } from "../content/guides/index";

export type SitePage = {
  /** Path starting with "/". */
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** 0.0–1.0, relative importance within this site. */
  priority: number;
  /** YYYY-MM-DD, when known (guides). */
  lastModified?: string;
};

const STATIC_PAGES: SitePage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/guides", changeFrequency: "weekly", priority: 0.8 },
  { path: "/about", changeFrequency: "yearly", priority: 0.4 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];

export const SITE_PAGES: readonly SitePage[] = [
  ...STATIC_PAGES,
  ...GUIDES.map((g) => ({
    path: guidePath(g.slug),
    changeFrequency: "monthly" as const,
    priority: 0.7,
    lastModified: g.dateModified,
  })),
];
