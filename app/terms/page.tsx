/*
 * TEMPLATE — NOT LEGAL ADVICE. Review and adapt this page (ideally with someone who
 * knows the law where you operate, e.g. India's IT Act / IT Rules) before sharing the
 * site publicly. Keep it in sync with what the code actually does.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ABUSE_CONTACT_EMAIL, CLIP_EXPIRY_MINUTES, MAX_FILE_SIZE_MB, RATE_LIMIT_WINDOW_SECONDS } from "@/lib/config";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & privacy", // → "Terms & privacy | Online Clipboard" via the layout template
  description: "Plain-language terms of use and privacy notes for Online Clipboard.",
  ...pageUrls("/terms", "Terms & privacy | Online Clipboard"),
};

export default function TermsPage() {
  // Rate-limit counters are deleted after about an hour (or one window, if longer).
  const rateLimitHours = Math.max(1, Math.ceil(RATE_LIMIT_WINDOW_SECONDS / 3600));

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:py-10">
      <article className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 text-sm leading-relaxed sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Terms &amp; privacy</h1>
          <p className="text-zinc-600 dark:text-zinc-400">The short version, in plain language.</p>
        </header>

        <Section title="What this is">
          <p>
            Online Clipboard lets you share text or one file (up to {MAX_FILE_SIZE_MB} MB) using a 6-digit code. It is a
            free, non-commercial hobby project.
          </p>
        </Section>

        <Section title="What you may not share">
          <ul className="list-disc space-y-1 pl-5">
            <li>Anything illegal where you or the recipient are.</li>
            <li>Malware, phishing, or anything meant to harm people or computers.</li>
            <li>Content that harasses, threatens or exploits anyone, or that you don&apos;t have the right to share.</li>
          </ul>
          <p>We may delete any clip and block access at any time.</p>
        </Section>

        <Section title="Everything is deleted automatically">
          <p>
            Each clip, including its file, expires {CLIP_EXPIRY_MINUTES} minutes after it is created. After that the code
            stops working and the text and file are deleted by an automatic clean-up job, usually within minutes.
          </p>
        </Section>

        <Section title="Not end-to-end encrypted">
          <p>
            Text and files are sent over HTTPS, but they are stored on our servers in a readable form until they expire.
            <strong className="font-semibold"> Do not share passwords, ID documents, financial details or other sensitive
            material.</strong> Anyone who has (or guesses) the code can open the clip until it expires.
          </p>
        </Section>

        <Section title="What we keep about you">
          <ul className="list-disc space-y-1 pl-5">
            <li>No accounts, no cookies, no analytics, no ads, no tracking scripts.</li>
            <li>
              To stop abuse, we keep a <em>hashed</em> (scrambled, non-reversible) form of your IP address together with a
              request counter. These counters are deleted after about {rateLimitHours} hour{rateLimitHours > 1 ? "s" : ""}.
              Your raw IP address is never stored by the app.
            </li>
            <li>
              The site runs on Vercel (hosting) and Supabase (database and file storage). Like any web host, they may keep
              short-lived technical logs, which can include IP addresses.
            </li>
          </ul>
        </Section>

        <Section title="No guarantees">
          <p>
            The service is provided &ldquo;as is&rdquo;, without any warranty. It may be slow, unavailable, paused when free
            limits are reached, or shut down at any time, and clips may be lost before they expire. Don&apos;t use it as
            the only copy of anything important. To the extent the law allows, we are not liable for any loss from using
            it.
          </p>
        </Section>

        <Section title="Report abuse">
          <AbuseContact email={ABUSE_CONTACT_EMAIL} />
        </Section>

        <p className="pt-2">
          <Link
            href="/"
            className="font-medium text-indigo-700 underline underline-offset-2 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-indigo-300"
          >
            ← Back to Online Clipboard
          </Link>
        </p>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold">{title}</h2>
      {children}
    </section>
  );
}

/** Email comes from ABUSE_CONTACT_EMAIL (server config), passed in as a prop. */
function AbuseContact({ email }: { email: string | null }) {
  if (!email) {
    return (
      <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        [Placeholder] An abuse contact has not been configured yet. The site owner must set ABUSE_CONTACT_EMAIL before
        launch.
      </p>
    );
  }
  return (
    <p>
      If you find a clip that breaks these rules, email{" "}
      <a
        href={`mailto:${email}?subject=${encodeURIComponent("Abuse report")}`}
        className="font-medium text-indigo-700 underline underline-offset-2 dark:text-indigo-300"
      >
        {email}
      </a>{" "}
      with the 6-digit code and what is wrong. Please don&apos;t forward the content itself if it is illegal.
    </p>
  );
}
