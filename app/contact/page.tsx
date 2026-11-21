import type { Metadata } from "next";
import Link from "next/link";
import { ContentPage } from "@/components/ContentPage";
import { getSiteFacts } from "@/lib/facts";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "How to reach Online Clipboard: abuse reports, removal requests and questions. Email only, no forms.",
  ...pageUrls("/contact", "Contact | Online Clipboard"),
};

/**
 * Email only: no form, no backend. Address from CONTACT_EMAIL, falling back to
 * ABUSE_CONTACT_EMAIL (read on the server, lib/config.ts).
 */
export default function ContactPage() {
  const { contactEmail, abuseEmail } = getSiteFacts();

  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Contact", path: "/contact" },
      ]}
      title="Contact"
      lead="Online Clipboard is a small, non-commercial project. Email is the only way to reach us."
    >
      <h2>Email</h2>
      {contactEmail ? (
        <p>
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
        </p>
      ) : (
        <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
          A contact address has not been configured yet. (Site owner: set CONTACT_EMAIL or ABUSE_CONTACT_EMAIL.)
        </p>
      )}
      {abuseEmail && contactEmail && abuseEmail !== contactEmail && (
        <p>
          For abuse reports specifically: <a href={`mailto:${abuseEmail}?subject=Abuse%20report`}>{abuseEmail}</a>
        </p>
      )}

      <h2>What to contact us about</h2>
      <ul>
        <li>
          <strong>Abuse reports:</strong> a clip with illegal, harmful or phishing content. Include the 6-digit code and
          what is wrong. Please don&apos;t forward the content itself if it is illegal.
        </li>
        <li>
          <strong>Removal requests:</strong> a clip you want taken down before it expires. Include the code.
        </li>
        <li>
          <strong>Questions and problems:</strong> something not working, or a question the{" "}
          <Link href="/#faq">FAQ</Link> doesn&apos;t answer. Say which device and browser you use.
        </li>
      </ul>

      <h2>Good to know</h2>
      <ul>
        <li>
          Clips expire on their own, so by the time an email is read, a clip may already be gone. We can&apos;t recover
          expired clips.
        </li>
        <li>Never email passwords or private documents. We will never ask for them.</li>
        <li>
          How we handle data is in the <Link href="/privacy">Privacy policy</Link>; the rules are in the{" "}
          <Link href="/terms">Terms of use</Link>.
        </li>
      </ul>
    </ContentPage>
  );
}
