import Link from "next/link";
import { absoluteUrl } from "@/lib/site";

export type Crumb = { name: string; path: string };

/** Visible breadcrumb trail. The last crumb is the current page (not a link). */
export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-zinc-600 dark:text-zinc-400">
      <ol className="flex flex-wrap items-center gap-1.5">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-1.5">
              {last ? (
                <span aria-current="page" className="text-zinc-800 dark:text-zinc-200">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link
                    href={c.path}
                    className="underline-offset-2 hover:underline focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                  >
                    {c.name}
                  </Link>
                  <span aria-hidden="true">›</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** schema.org BreadcrumbList for the same trail. URLs are absolute when SITE_URL is set. */
export function breadcrumbJsonLd(crumbs: Crumb[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => {
      const url = absoluteUrl(c.path);
      return { "@type": "ListItem", position: i + 1, name: c.name, ...(url ? { item: url } : {}) };
    }),
  };
}
