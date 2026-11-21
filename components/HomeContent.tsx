import Link from "next/link";
import type { HomeContent as Content, Paragraph } from "@/content/home";
import { HowItWorksIllustration } from "./HowItWorksIllustration";

/**
 * Explanatory sections below the tool (Server Component, no client JS).
 * All copy comes from content/home.ts; numbers there come from server config.
 */

function Text({ paragraph }: { paragraph: Paragraph }) {
  return (
    <>
      {paragraph.map((seg, i) =>
        typeof seg === "string" ? (
          seg
        ) : seg.href.startsWith("/") ? (
          <Link key={i} href={seg.href} className={inlineLink}>
            {seg.text}
          </Link>
        ) : (
          <a key={i} href={seg.href} className={inlineLink}>
            {seg.text}
          </a>
        ),
      )}
    </>
  );
}

const inlineLink =
  "font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-800 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300 dark:hover:text-indigo-200";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const headingId = `${id}-heading`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-6 space-y-4">
      <h2 id={headingId} className="text-xl font-bold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

const muted = "text-zinc-700 dark:text-zinc-300";

export function HomeContent({ content }: { content: Content }) {
  const { howItWorks, whatYouCanShare, commonUses, privacy, faq, closing } = content;

  return (
    <div className="mt-14 space-y-12 text-[15px] leading-relaxed">
      <Section id={howItWorks.id} title={howItWorks.title}>
        <p className={muted}>{howItWorks.intro}</p>
        <HowItWorksIllustration />
        <ol className="grid gap-4 sm:grid-cols-3">
          {howItWorks.steps.map((s, i) => (
            <li key={s.title} className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="flex items-center gap-2 font-semibold">
                <span
                  aria-hidden="true"
                  className="inline-flex size-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white"
                >
                  {i + 1}
                </span>
                <span>
                  <span className="sr-only">Step {i + 1}: </span>
                  {s.title}
                </span>
              </p>
              <p className={`mt-2 text-sm ${muted}`}>{s.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section id={whatYouCanShare.id} title={whatYouCanShare.title}>
        <dl className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {whatYouCanShare.items.map((item) => (
            <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[8rem_1fr] sm:gap-4">
              <dt className="font-semibold">{item.label}</dt>
              <dd className={muted}>{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className={`text-sm ${muted}`}>{whatYouCanShare.note}</p>
      </Section>

      <Section id={commonUses.id} title={commonUses.title}>
        <p className={muted}>{commonUses.intro}</p>
        <ul className="space-y-3">
          {commonUses.items.map((u) => (
            <li key={u.title} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 size-1.5 shrink-0 rounded-full bg-indigo-600" />
              <p className={muted}>
                <strong className="font-semibold text-zinc-900 dark:text-zinc-100">{u.title}.</strong> {u.text}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id={privacy.id} title={privacy.title}>
        <p className={muted}>{privacy.intro}</p>
        <ul className="space-y-4">
          {privacy.points.map((p) => (
            <li key={p.title}>
              <p className="font-semibold">{p.title}</p>
              <p className={`mt-1 ${muted}`}>
                <Text paragraph={p.text} />
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id={faq.id} title={faq.title}>
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
          {faq.items.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-4 py-3 font-semibold hover:bg-zinc-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-800/60 [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <svg
                  aria-hidden="true"
                  focusable="false"
                  viewBox="0 0 24 24"
                  className="size-5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </summary>
              <div className={`space-y-2 px-4 pb-4 ${muted}`}>
                {item.answer.map((para, i) => (
                  <p key={i}>
                    <Text paragraph={para} />
                  </p>
                ))}
              </div>
            </details>
          ))}
        </div>
      </Section>

      <p className={`border-t border-zinc-200 pt-6 text-center text-sm dark:border-zinc-800 ${muted}`}>
        <Text paragraph={closing} />
      </p>
    </div>
  );
}
