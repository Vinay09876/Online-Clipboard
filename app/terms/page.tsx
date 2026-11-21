/*
 * TEMPLATE, NOT LEGAL ADVICE. These are plain-language terms written for a small free hobby
 * site. Review and adapt them (ideally with someone who knows the law where you operate,
 * e.g. India's IT Act / IT Rules) before sharing the site publicly. Keep every statement in
 * sync with what the code actually does. Privacy details live on /privacy.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { CLAIMS } from "@/content/claims";
import { LEGAL_LAST_UPDATED, OWNER } from "@/content/legal";
import { getSiteFacts, plural } from "@/lib/facts";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use", // → "Terms of use | Online Clipboard" via the layout template
  description: "The plain-language terms for using Online Clipboard: what you may share, how long clips last, and limits.",
  ...pageUrls("/terms", "Terms of use | Online Clipboard"),
};

export default function TermsPage() {
  const f = getSiteFacts();
  const minutes = plural(f.expiryMinutes, "minute", "minutes");

  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Terms of use", path: "/terms" },
      ]}
      title="Terms of use"
      lead="The short version, in plain language. By using Online Clipboard you agree to these terms."
      meta={`Last updated ${LEGAL_LAST_UPDATED}`}
    >
      <h2>What this is</h2>
      <p>
        Online Clipboard lets you share text or one file (up to {f.maxFileMb} MB) using a 6-digit code. It is a free,
        non-commercial hobby project run by {OWNER.name}.
      </p>

      <h2>What you may not share</h2>
      <ul>
        <li>Anything illegal where you or the recipient are.</li>
        <li>Malware, phishing, or anything meant to harm people or computers.</li>
        <li>Content that harasses, threatens or exploits anyone, or that you don&apos;t have the right to share.</li>
      </ul>
      <p>We may delete any clip and block access at any time.</p>

      <h2>Everything is deleted automatically</h2>
      <p>
        Each clip, including its file, expires {minutes} after it is created. After that the code stops working, and{" "}
        {CLAIMS.deletion}. There is no way to recover an expired clip, and no way to delete a clip early.
      </p>

      <h2>Your responsibility</h2>
      <p>
        {CLAIMS.encryption} Anyone who has (or guesses) a code can open that clip until it expires. Don&apos;t share passwords, ID documents, financial details or other sensitive material. What
        we store and for how long is explained in the <Link href="/privacy">Privacy policy</Link>.
      </p>

      <h2>No guarantees</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;, without any warranty. It may be slow, unavailable, paused when free
        limits are reached, or shut down at any time, and clips may be lost before they expire. Don&apos;t use it as the
        only copy of anything important. To the extent the law allows, we are not liable for any loss from using it.
      </p>

      <h2>Report abuse</h2>
      <p>
        If you find a clip that breaks these rules, use the <Link href="/contact">Contact page</Link> and include the
        6-digit code and what is wrong. Please don&apos;t forward the content itself if it is illegal.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms; the date at the top shows the latest version. These terms are governed by the law
        of {OWNER.governingLaw}.
      </p>
    </ContentPage>
  );
}
