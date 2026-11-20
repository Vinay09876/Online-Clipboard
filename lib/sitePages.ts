/**
 * The ONE list of public, indexable pages. The sitemap is built from it.
 * Later steps (content, guides, About/Contact/Privacy) add their pages here.
 *
 * Don't list: API routes, error pages, or anything that shows a received clip.
 */
export type SitePage = {
  /** Path starting with "/". */
  path: string;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
  /** 0.0–1.0, relative importance within this site. */
  priority: number;
};

export const SITE_PAGES: readonly SitePage[] = [
  { path: "/", changeFrequency: "weekly", priority: 1.0 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
];
