import { ADVERTISING } from "@/content/claims";

/**
 * "Advertising" section for /privacy and /terms. Rendered by those pages ONLY while ads are
 * active (lib/ads.ts → adsActive). Wording lives in content/claims.ts (ADVERTISING).
 */
export function AdvertisingSection({ extra }: { extra?: string }) {
  const ext = { rel: "noopener noreferrer" };
  return (
    <>
      <h2 id="advertising">Advertising</h2>
      <p>
        {ADVERTISING.where}
        {extra ? ` ${extra}` : ""}
      </p>
      <p>
        {ADVERTISING.cookies} Google explains this in{" "}
        <a href={ADVERTISING.explanation.href} {...ext}>
          {ADVERTISING.explanation.text}
        </a>
        .
      </p>
      <p>
        You can opt out of personalised advertising in{" "}
        <a href={ADVERTISING.optOut.href} {...ext}>
          {ADVERTISING.optOut.text}
        </a>
        , and opt out of some third-party vendors&apos; cookies for personalised advertising at{" "}
        <a href={ADVERTISING.optOutVendors.href} {...ext}>
          {ADVERTISING.optOutVendors.text}
        </a>
        . You may still see ads that are not personalised.
      </p>
      <p>{ADVERTISING.consent}</p>
    </>
  );
}
