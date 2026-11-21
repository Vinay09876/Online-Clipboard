/*
 * TEMPLATE, NOT LEGAL ADVICE. A plain-language privacy policy for a small free hobby site.
 * Review it (ideally with someone who knows data-protection law where you operate, and for
 * EEA/UK visitors) before sharing the site publicly. Every statement must stay true for the
 * current code. Ads and advertising cookies are mentioned ONLY while ads are active
 * (lib/ads.ts → adsActive); with ads off, nothing here may mention them.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { AdvertisingSection } from "@/components/AdvertisingSection";
import { ContentPage } from "@/components/ContentPage";
import { CLAIMS, trackingClaims } from "@/content/claims";
import { HOSTING, LEGAL_LAST_UPDATED, OWNER } from "@/content/legal";
import { getSiteFacts, plural } from "@/lib/facts";
import { adsActive } from "@/lib/ads";
import { pageUrls } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: trackingClaims(adsActive()).privacyMeta,
  ...pageUrls("/privacy", "Privacy policy | Online Clipboard"),
};

export default function PrivacyPage() {
  const f = getSiteFacts();
  const minutes = plural(f.expiryMinutes, "minute", "minutes");
  const ads = f.adsActive;

  return (
    <ContentPage
      crumbs={[
        { name: "Home", path: "/" },
        { name: "Privacy policy", path: "/privacy" },
      ]}
      title="Privacy policy"
      lead="What happens to your data when you use Online Clipboard, in plain language."
      meta={`Last updated ${LEGAL_LAST_UPDATED}`}
    >
      <h2>Who is responsible</h2>
      <p>
        Online Clipboard is run by {OWNER.name}. Questions about this policy go through the{" "}
        <Link href="/contact">Contact page</Link>.
      </p>

      <h2>What you send us</h2>
      <p>
        When you create a clip, we store the text and/or the one file you add, its file name and size, the 6-digit code,
        and when it was created and expires. {CLAIMS.encryption} Anyone with the code can open a clip until it expires,
        as often as they like.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>
          <strong>Clips:</strong> each clip expires {minutes} after it is created. Its code stops working at once, and{" "}
          {CLAIMS.deletion}. Uploads that were never finished are deleted too.
        </li>
        <li>
          <strong>Abuse protection:</strong> to limit spam and code guessing, we keep {CLAIMS.ipHash(f.rateLimitRetentionHours)}.
          Your raw IP address is never stored by the app.
        </li>
        <li>
          <strong>Download totals:</strong> we count how many bytes are downloaded per month in total, to stay within
          free hosting limits. This is one number per month and contains nothing about you.
        </li>
      </ul>

      <h2>What we don&apos;t collect</h2>
      <ul>
        <li>No accounts, names or email addresses (unless you email us).</li>
        {ads ? (
          <>
            <li>
              The site&apos;s own code doesn&apos;t set cookies. Google&apos;s ad code on the guide pages can,
              including cookies under this site&apos;s address, as described under <a href="#advertising">Advertising</a>.
              If you switch to the dark theme, that choice is saved in your
              browser&apos;s local storage on your device only; it is never sent to us.
            </li>
            <li>We don&apos;t run our own analytics tools or load third-party fonts.</li>
          </>
        ) : (
          <>
            <li>
              No cookies. If you switch to the dark theme, that choice is saved in your browser&apos;s local storage on
              your device only; it is never sent to us.
            </li>
            <li>No analytics, no tracking scripts, no third-party fonts or images.</li>
          </>
        )}
      </ul>

      {ads && <AdvertisingSection />}

      <h2>Service providers</h2>
      <p>
        The site is hosted by {HOSTING.web}, and clips are stored with {HOSTING.data} (database and file storage). They
        process data only to run the service. Like any web host, they may keep short-lived technical logs, which can
        include IP addresses; those logs are governed by their own policies.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Don&apos;t put anything sensitive in a clip. That is the most effective protection.</li>
        <li>
          There is no early-delete button. If you shared something by mistake, don&apos;t share the code further; the
          clip is removed automatically when it expires.
        </li>
        <li>
          For questions or removal requests about a specific clip, use the <Link href="/contact">Contact page</Link>{" "}
          and include the 6-digit code.
        </li>
      </ul>

      <h2>Changes</h2>
      <p>
        If this policy changes, the date at the top changes too. See also the <Link href="/terms">Terms of use</Link>.
      </p>
    </ContentPage>
  );
}
