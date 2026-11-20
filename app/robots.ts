import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { INDEXABLE, SITE_ORIGIN } from "@/lib/site";

/**
 * /robots.txt
 *  - not indexable (no SITE_URL, temporary host, or ALLOW_INDEXING=false): disallow everything,
 *    no sitemap line
 *  - indexable: allow the site, keep crawlers out of /api/, point to the sitemap
 * Read per request (connection()), so it follows the running server's env.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();

  if (!INDEXABLE || !SITE_ORIGIN) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: "/api/" },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
