import { headers } from "next/headers";
import { AD_PLACEMENTS, adScriptUrl, adSlotId, adsenseAccountId, type AdPlacement } from "@/lib/ads";
import { AdUnit } from "./AdUnit";

/**
 * One manual AdSense ad unit at an approved placement (lib/ads.ts → AD_PLACEMENTS).
 *
 * Renders NOTHING unless ads are active (lib/ads.ts → adsActive) and this placement has an
 * ad unit ID. When it renders:
 *   - a container labelled "Advertisements" (one of the two labels AdSense allows),
 *   - a reserved minimum height, so the page doesn't jump when the ad arrives,
 *   - spacing above and below, away from links, buttons and navigation,
 *   - the AdSense library <script>, with this request's CSP nonce. React hoists it into
 *     <head> and de-duplicates it, so it appears once, and only on pages that have a slot,
 *   - the ad unit itself (<AdUnit>), requested only when it comes near the viewport.
 * Never use it outside components/guides/GuideLayout.tsx and app/guides/page.tsx
 * (enforced by e2e/ads.spec.ts).
 */
export async function AdSlot({ placement }: { placement: AdPlacement }) {
  const slot = adSlotId(placement);
  const client = adsenseAccountId();
  if (!slot || !client) return null;

  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { minHeight } = AD_PLACEMENTS[placement];

  return (
    <aside
      aria-label="Advertisements"
      data-ad-placement={placement}
      className="!my-10 rounded-xl border border-zinc-200 px-2 pb-3 pt-2 dark:border-zinc-800"
      style={{ minHeight }}
    >
      <p className="!mb-2 text-center text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        Advertisements
      </p>
      <script async src={adScriptUrl(client)} crossOrigin="anonymous" nonce={nonce} />
      <AdUnit client={client} slot={slot} />
    </aside>
  );
}
