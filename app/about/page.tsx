import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { CLAIMS } from "@/content/claims";
import { OWNER } from "@/content/legal";
import { fmt, getSiteFacts, plural } from "@/lib/facts";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "What Online Clipboard is, why it exists, how it works, and what it deliberately does not do: no accounts, no tracking.",
  ...pageUrls("/about", "About | Online Clipboard"),
};

export default function AboutPage() {
  const f = getSiteFacts();
  const minutes = plural(f.expiryMinutes, "minute", "minutes");

  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "About", path: "/about" },
      ]}
      title="About Online Clipboard"
      lead="A small, free tool for moving text and files between devices with a 6-digit code."
    >
      <h2>What it is</h2>
      <p>
        Online Clipboard is a website for quick hand-offs: a link from your phone to your laptop, a document to a
        library computer, a long address to the person next to you. You paste text or add one file, get a code, and
        open it on the other device. No app, no account.
      </p>

      <h2>Who runs it, and why</h2>
      <p>Online Clipboard is a non-commercial hobby project run by {OWNER.name}.</p>
      <p>[[ADD: one or two sentences, in your own words, about why you built this and who it is for]]</p>

      <h2>How it works</h2>
      <ol>
        <li>Your browser sends the text and/or file over HTTPS. Files go straight to storage through a one-time upload link.</li>
        <li>The server picks a random 6-digit code that isn&apos;t in use and stores the clip under it.</li>
        <li>Whoever enters the code (or opens the link) gets the text, and a short-lived download link for the file.</li>
        <li>
          After {minutes} the code stops working, and {CLAIMS.deletion}.
        </li>
      </ol>

      <h2>What it does not do</h2>
      <ul>
        <li>No accounts and no sign-up.</li>
        <li>No cookies, no analytics, no tracking scripts.</li>
        <li>No end-to-end encryption. {CLAIMS.encryption}</li>
        <li>No permanent storage, no file previews, no early delete button, no public API.</li>
      </ul>

      <h2>Honest limits</h2>
      <ul>
        <li>
          One file per clip, up to {f.maxFileMb} MB, and text up to {fmt(f.maxTextLength)} characters.
        </li>
        <li>Every clip expires {minutes} after it is created.</li>
        <li>
          A 6-digit code can be guessed by someone determined, slowly: after {plural(f.lookupFailures, "wrong code", "wrong codes")}{" "}
          from one connection, lookups pause for up to {plural(f.rateWindowMinutes, "minute", "minutes")}. That&apos;s why
          it isn&apos;t meant for sensitive data. More in{" "}
          <Link href="/guides/is-an-online-clipboard-safe">Is an online clipboard safe?</Link>
        </li>
        <li>It runs on free hosting plans, so it can pause briefly if monthly limits are reached.</li>
      </ul>

      <h2>More</h2>
      <p>
        Read the <Link href="/guides">guides</Link>, the <Link href="/privacy">Privacy policy</Link> and the{" "}
        <Link href="/terms">Terms of use</Link>, or get in touch through the <Link href="/contact">Contact page</Link>.
      </p>
    </ContentPage>
  );
}
