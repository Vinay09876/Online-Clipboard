# Ads plan (Google AdSense)

Status: **code ready, switched OFF** (Growth Step 4). Ads are switched on in Step 9, after the
real domain exists (Step 7) and has some search traffic (Step 8).

With the default configuration nothing about ads is visible, loaded, requested or mentioned:
no ad markup, no Google script, no Google domain in the CSP, no verification meta tag,
`/ads.txt` is a 404, and every page keeps its "no cookies, no analytics" wording.
`e2e/ads.spec.ts` checks all of this on every test run.

Everything here is based on Google's help pages (checked 2026-11-21). Links are in
[Sources](#sources). Re-check them before Step 9: AdSense rules and screens change.

---

## 1. How the switch works

One function decides everything: `adsActive()` in `lib/ads.ts`.

```
ads are active  =  ADS_ENABLED=true
               AND the site is indexable (real https domain, not *.vercel.app / *.netlify.app /
                   localhost / an IP, and ALLOW_INDEXING is not "false"; see lib/site.ts)
               AND ADSENSE_CLIENT_ID is set and valid
```

| Env var | Format | Purpose |
| --- | --- | --- |
| `ADS_ENABLED` | `true` / `false` / empty (= off) | the switch |
| `ADSENSE_CLIENT_ID` | `ca-pub-` + 16 digits | your publisher ID. On an indexable domain it also turns on the verification meta tag and `/ads.txt`, **even while `ADS_ENABLED` is off** (so you can get verified first) |
| `ADSENSE_SLOT_GUIDE_AFTER_INTRO` | digits | ad unit ID: guide pages, after the "In short" intro |
| `ADSENSE_SLOT_GUIDE_BEFORE_RELATED` | digits | ad unit ID: guide pages, before "Related guides" |
| `ADSENSE_SLOT_GUIDES_HUB` | digits | ad unit ID: /guides, between two category groups |

A placement without an ad unit ID renders nothing.

Safety nets:

- **Malformed values** (e.g. `ADS_ENABLED=yes`, a client ID without `ca-pub-`) fail the build on
  any host (`scripts/check-placeholders.ts`, the `prebuild` step) and are reported as
  "Invalid environment configuration" errors by the server (`lib/config.ts`).
- **On an indexable domain**, `ADS_ENABLED=true` without `ADSENSE_CLIENT_ID` or without at least
  one ad unit ID fails the build with a clear message.
- **Temporary hosts and the kill switch** never show ads, the meta tag or ads.txt, whatever the
  ad settings say.

## 2. Rules, and why

| Rule | Why |
| --- | --- |
| Ads only on the guides and the /guides hub | These pages are our own written content. Google doesn't allow ads on screens without publisher content, and header/footer/links don't count as content. |
| **Never** on the home page / the tool, received clips, downloads | Clips are user-generated content. Publishers are responsible for user content on every page that has ad code, and we don't moderate clips (they expire in minutes). Keeping ad code off the tool removes that risk completely. |
| Never on /terms, /privacy, /about, /contact, 404 and error pages, API routes | Low-value / no publisher content. Google also says policy pages should not load consent-requiring scripts such as ad tags. |
| At most 2 ads per page (guides 2, hub 1) | Content first; keeps pages fast. Enforced in `lib/ads.ts` (throws at load if a page type gets a third placement) and by tests. |
| Labelled "Advertisements" | AdSense allows only "Advertisements" or "Sponsored Links" as labels. (The Step 4 spec said "Advertisement"; Google's policy wording is the plural.) |
| Spacing: 40 px margin, own bordered box, reserved 280 px height | Google warns that ads near links, buttons and navigation cause accidental clicks; reserved height avoids layout shift. A test measures ≥ 32 px to the nearest link/button. |
| Manual ad units only, **Auto ads OFF** | Auto ads would place ads anywhere, including the tool. Code can't fully prevent that: the same AdSense script also runs Auto ads if they are on in the account. So Auto ads must be off in AdSense (§5). |
| The AdSense script only on pages with a slot | Rendered by `<AdSlot>` itself (React puts it in `<head>` once). Pages without a slot never load it. |
| Lazy ad requests | Each ad unit is requested when it comes within ~600 px of the viewport. |

Placements are enumerated in `lib/ads.ts` (`AD_PLACEMENTS`). `<AdSlot placement="…">` accepts
only those names, and a test fails if any file other than `components/guides/GuideLayout.tsx`
and `app/guides/page.tsx` uses it, or if any tool, legal or error page contains ad code.

**Known limit:** after a visitor opens a guide (the script loads) and then clicks through to the
home page *without a full reload*, the already-loaded script stays in memory. No ad units exist
there, so manual ads can't appear, but **Auto ads, if accidentally on, could.** Another reason
Auto ads must stay off.

## 3. Consent (EEA, UK, Switzerland)

- Google requires a **Google-certified consent management platform (CMP) integrated with the IAB
  TCF** to serve ads to visitors in the EEA and UK (since 16 January 2024) and Switzerland (since
  31 July 2024). Without one, those visitors get only limited or non-personalised ads, or none.
- **Our approach: Google's own CMP**, free, inside AdSense under **Privacy & messaging →
  European regulations**. It is delivered by the same AdSense script, so no extra code or CSP
  change is needed. Because the script only runs on guide pages and the hub, the consent message
  appears there, where ads are.
- Google adds a **consent revocation link** ("privacy settings") automatically to pages that show
  its European message, so visitors can change their choice.
- Optional: Google's CMP can also show US state privacy messages (Privacy & messaging → US
  state regulations). Decide in Step 9.
- The consent message needs cross-origin referrers. The site default is `no-referrer`, so
  **while ads are active, ad pages only** use `Referrer-Policy: strict-origin-when-cross-origin`
  (header from `proxy.ts` and the `<meta name="referrer">` from the page metadata). Google
  documents that value as sufficient.
- The privacy policy URL goes into the message's "Learn more" (Privacy & messaging asks for it):
  `https://<your-domain>/privacy`.

## 4. What changes on the site when ads are active

| What | Where |
| --- | --- |
| Ad slots (2 per guide, 1 on the hub), script with CSP nonce | `components/ads/AdSlot.tsx`, `AdUnit.tsx` |
| `<meta name="google-adsense-account" content="ca-pub-…">` on every page (only needs the client ID, see §1) | `app/layout.tsx` (metadata `other`) |
| `/ads.txt`: `google.com, pub-…, DIRECT, f08c47fec0942fa0` (only needs the client ID) | `app/ads.txt/route.ts` |
| CSP additions on ad pages (below) | `proxy.ts` |
| Referrer policy on ad pages (above) | `proxy.ts`, `adPageMetadata()` |
| "No cookies / no analytics" wording removed from home, /about, /privacy, the safety guide; Advertising section on /privacy and /terms | `content/claims.ts` (`trackingClaims`, `ADVERTISING`), `components/AdvertisingSection.tsx` |

### CSP additions

Google supports **only** a nonce-based "strict" CSP for AdSense and publishes **no domain
allowlist** (its domains change over time). So no domains are added; scheme sources are, and
only on ad pages while ads are active. Every other page keeps today's policy byte for byte.

| Directive | Added | Why |
| --- | --- | --- |
| `script-src` | `'unsafe-inline' 'unsafe-eval' https: http:` | Exactly the extra sources in Google's documented `script-src`. With a nonce + `'strict-dynamic'`, current browsers ignore `'unsafe-inline'`, `https:` and `http:` (old-browser fallbacks). `'unsafe-eval'` is **not** ignored; Google lists it without saying why, so we keep it. |
| `frame-src` | `https:` | Ads and the consent message render in iframes. Our `default-src 'self'` would otherwise block them. |
| `img-src` | `https:` | Ad images and measurement pixels. |
| `connect-src` | `https:` | Ad and consent requests. |
| `style-src`, `font-src` | `https:` | Stylesheets/fonts the ad or consent code may add. |
| unchanged | `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` | Google's example uses `base-uri 'none'`; ours is already as strict as needed. |

Known hosts at the time of writing, for reading reports only (do **not** turn into an
allowlist): `pagead2.googlesyndication.com` (library), `googleads.g.doubleclick.net`,
`tpc.googlesyndication.com` (ad frames), `fundingchoicesmessages.google.com` (consent message).

Not verified yet (Step 9): whether `frame-src/img-src/connect-src/style-src/font-src https:` is
enough in practice, and whether `Permissions-Policy: autoplay=()` (next.config.ts) blocks some
video ads. Google recommends testing first with `Content-Security-Policy-Report-Only`.

## 5. Step 9: set up AdSense, in order

1. **Prerequisites:** real domain live (Step 7), indexable, all `[[ADD: …]]` placeholders filled,
   contact email set, guides finished. The build guard already blocks a real domain otherwise.
2. **Sign up** at adsense.google.com with the site's domain.
3. **Verify ownership.** In AdSense → Sites, choose **"Meta tag"** (or "Ads.txt snippet"). Set
   only `ADSENSE_CLIENT_ID=ca-pub-…` in Netlify (leave `ADS_ENABLED` empty), redeploy, then check:
   - view-source of any page shows `<meta name="google-adsense-account" content="ca-pub-…">`
   - `https://<domain>/ads.txt` shows the one line.
   Then click **Verify** and **Request review**. Ads serve only once the site shows **"Ready"**.
4. **While under review**, in AdSense:
   - **Ads → By site → (your site) → Auto ads: OFF.** Save. Also check that "Ad formats"
     (anchor, vignette, side rail) are off; they are Auto ads.
   - **Ads → By ad unit → Display ads:** create 3 responsive display units, named
     `guide-after-intro`, `guide-before-related`, `guides-hub`. Copy each unit's numeric
     `data-ad-slot` into the matching `ADSENSE_SLOT_*` variable. Ignore the rest of the code
     (the site renders it).
   - **Privacy & messaging → European regulations:** create and **publish** a message for the
     site (Google's certified CMP), add the privacy policy URL, consider "Maximize message
     coverage". Optionally a US state regulations message.
   - **Brand safety → Blocking controls:** review sensitive categories.
5. **Approved ("Ready")**: set `ADS_ENABLED=true` and the 3 slot IDs, redeploy.
6. Run the **launch checklist** (§7).

Settings to re-check after any AdSense change: Auto ads still OFF; overlay formats still off;
"Optimize existing ad units" off (it lets Google change your units); the European message
published.

## 6. Applying: what the reviewer will see

- Home page: the tool and its explanation, no ads (fine: you choose where ads go).
- 12 guides of 700+ words, hub, About, Contact, Privacy, Terms.
- Common rejection reasons to avoid: "low value content", "site down or unavailable",
  navigation problems. Make sure every guide is finished and links work.

## 7. Launch checklist (Step 9)

- [ ] AdSense site status "Ready"; Auto ads OFF; overlay formats off
- [ ] European regulations message published; revocation link appears on a guide (test from an
      EU location or with a VPN)
- [ ] `/ads.txt` returns the one line; AdSense → Sites shows ads.txt "Authorized"
- [ ] A guide shows 2 labelled slots; /guides shows 1; home, tool, /privacy, /terms, /about,
      /contact, 404 show none (view-source: no `adsbygoogle` on those pages)
- [ ] Browser console on a guide: no CSP violations (otherwise first try
      `Content-Security-Policy-Report-Only`, adjust, then enforce)
- [ ] /privacy and /terms show the Advertising section; nowhere says "no cookies" or "no analytics"
- [ ] Privacy text reviewed against the current AdSense "Required content" page
- [ ] Lighthouse on a guide: performance still acceptable
- [ ] `LEGAL_LAST_UPDATED` (content/legal.ts) set to the launch date

## 8. Rollback

Set `ADS_ENABLED=false` (or delete it) and **redeploy**. Slots, script, CSP additions, referrer
change and ad wording disappear on the next deployment; pages return to "no cookies, no
analytics". The meta tag and ads.txt stay while `ADSENSE_CLIENT_ID` is set (harmless); delete it
too to remove every trace. In an emergency, `ALLOW_INDEXING=false` also turns ads off (it
makes the site non-indexable), but it de-indexes the site, so prefer `ADS_ENABLED=false`.

## Sources

- CSP: [Integrate the AdSense ad code with a CSP](https://support.google.com/adsense/answer/16283098)
- Consent: [Consent management requirements (EEA, UK, Switzerland)](https://support.google.com/adsense/answer/13554116),
  [Set up and manage your CMP](https://support.google.com/adsense/answer/7670013),
  [How the Google CMP works](https://support.google.com/adsense/answer/16918505),
  [About European regulations messages](https://support.google.com/adsense/answer/10961068),
  [Troubleshooting European regulations messages](https://support.google.com/adsense/answer/14660912),
  [Consent revocation link](https://support.google.com/adsense/answer/10959060)
- Ownership: [Add a new site](https://support.google.com/adsense/answer/12169212),
  [Connect your site to AdSense](https://support.google.com/adsense/answer/7584263)
- ads.txt: [Ads.txt guide](https://support.google.com/adsense/answer/12171612),
  [Ads.txt FAQs](https://support.google.com/adsense/answer/9785052),
  [Ensure ads.txt can be crawled](https://support.google.com/adsense/answer/7679060)
- Policies: [User-generated content](https://support.google.com/adsense/answer/1355699),
  [Google Publisher Policies](https://support.google.com/adsense/answer/10502938),
  [Publisher Policies and Restrictions](https://support.google.com/adsense/answer/10008391),
  [Required content (privacy policy)](https://support.google.com/adsense/answer/1348695)
- Placement: [Ad placement policies](https://support.google.com/adsense/answer/1346295),
  [Confirmed Click](https://support.google.com/adsense/answer/10025624),
  [Auto ads settings](https://support.google.com/adsense/answer/9305577)
