import { Breadcrumbs, breadcrumbJsonLd, type Crumb } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";

/**
 * Reusable article layout for text pages (Terms, Privacy, About, Contact, Guides hub, guides).
 * Server Component, no client JavaScript.
 *
 * Typography is applied to plain children (h2, h3, p, ul, ol, a, strong) via Tailwind
 * descendant selectors, so page content stays simple JSX.
 */
export const articleTypography = [
  "space-y-4 text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200",
  "[&_h2]:pt-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-zinc-900 dark:[&_h2]:text-zinc-50",
  "[&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-zinc-900 dark:[&_h3]:text-zinc-50",
  "[&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
  "[&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-zinc-900 dark:[&_strong]:text-zinc-50",
  "[&_a]:font-medium [&_a]:text-indigo-700 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-800",
  "dark:[&_a]:text-indigo-300 dark:hover:[&_a]:text-indigo-200",
  "[&_a:focus-visible]:rounded [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-2 [&_a:focus-visible]:outline-indigo-500",
].join(" ");

export function ContentPage({
  crumbs,
  title,
  lead,
  meta,
  extraJsonLd = [],
  children,
}: {
  crumbs: Crumb[];
  title: string;
  /** Short intro under the h1. */
  lead?: React.ReactNode;
  /** Small line under the lead (e.g. "Last updated …"). */
  meta?: React.ReactNode;
  extraJsonLd?: Array<Record<string, unknown>>;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-5 sm:pt-6">
      <JsonLd data={[...extraJsonLd, breadcrumbJsonLd(crumbs)]} />
      <Breadcrumbs crumbs={crumbs} />
      <article className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="space-y-2 border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {lead && <div className="text-base text-zinc-700 dark:text-zinc-300">{lead}</div>}
          {meta && <p className="text-xs text-zinc-600 dark:text-zinc-400">{meta}</p>}
        </header>
        <div className={`mt-5 ${articleTypography}`}>{children}</div>
      </article>
    </div>
  );
}
