# Phase 2: growth plan

Goal: organic search traffic, then Google AdSense, at the lowest possible cost.
One step at a time; each step is reviewed before the next starts.

**Standing constraints**

- No paid tools or services. Ask before adding any npm dependency.
- No domain until Step 7. Until then the site must NOT be indexed.
- No ads until Step 9. No analytics, cookies, third-party scripts, fonts or images until then;
  the strict CSP stays strict. (Step 4 adds ad code that stays OFF until `ADS_ENABLED=true` on
  the real domain; with ads off the site is byte-for-byte as before. See `docs/ads-plan.md`.)
- No Vercel-only features (hosting moves to Netlify's free plan in Step 5).
- API routes change only for real bugs, and every such change is reported.
- After every step: typecheck, lint, build and all test suites pass
  (`test:files`, `test:collisions`, `test:security`, `test:egress`, `test:e2e`).

## Steps

### No domain needed

- [x] **1. SEO foundation in code**: `SITE_URL` + indexing switch, metadata, icons, manifest,
      Open Graph image, robots.txt, sitemap, JSON-LD, landmarks, Lighthouse baseline, tests, docs.
      See `docs/seo.md`. *(Done 2026-11-20; reviewed, committed and deployed.)*
- [x] **2. Home page content**: explanatory content below the tool (what it is, how it works,
      FAQ, privacy points) and FAQ structured data. Copy in `content/home.ts`; rules in
      `docs/content-guidelines.md`. *(Done 2026-11-20; reviewed, committed and deployed.)*
- [x] **3. Guide pages and trust pages**, split into three passes. *(Complete 2026-11-21.)*
  - [x] **3a.** Trust pages (/terms and /privacy split, /about, /contact), guide system
        (registry, layout, hub, Article + BreadcrumbList JSON-LD), placeholder guard, and 3 guides:
        (1) How to copy and paste text between your phone and computer,
        (2) How to send a file from your phone to a PC without a cable,
        (3) Is an online clipboard safe? What you should never share.
        *(Done 2026-11-21; reviewed and committed. Owner must fill the [[ADD]] placeholders and
        test the device steps on real phones before launch.)*
  - [x] **3b.** Copy fixes (encryption, IP hashing, deletion timing, browser support, examples;
        shared wording in `content/claims.ts`), `primaryQuery` + no-overlap test, and 4 guides:
        (4) How to send files that are too big for email,
        (5) How to use a shared or public computer safely,
        (6) How to transfer photos from an iPhone to a Windows PC,
        (7) How to transfer photos from an Android phone to a computer.
        Each guide now shows 3 related guides. *(Done 2026-11-21; reviewed and committed.)*
  - [x] **3c.** Guides 1-3 brought to 700+ words; 5 guides: (8) send a document to a print shop,
        (9) share files in a classroom, (10) code snippets, logs or config text from phone to computer,
        (11) online clipboard vs emailing yourself vs messaging apps, (12) what an online clipboard is.
        /guides grouped into 4 categories (`category` field). `docs/verification-checklist.md`
        lists every claim to test on real devices. *(Done 2026-11-21; awaiting review.)*
  (Topic list is the owner's plan and may change.)
- [x] **4. Ad-ready code, switched OFF**: `lib/ads.ts` decides (`ADS_ENABLED` + indexable +
      `ADSENSE_CLIENT_ID`); `<AdSlot>` on guides (2) and the hub (1) only, never the tool,
      legal or error pages; ads.txt + verification meta tag; CSP and referrer changes only on
      ad pages while active; ads-aware privacy/terms wording; consent plan (Google CMP); build
      guard; `e2e/ads.spec.ts`. Plan and Step 9 checklist: `docs/ads-plan.md`.
      *(Done 2026-11-21; awaiting review.)*
- [x] **5. Move hosting to Netlify (free)**: *(Done 2026-11-22. Netlify live at
      online-clipboard-tool.netlify.app, smoke test ALL PASSED incl. the spoof check, Netlify
      cron job returns 200. Vercel stays the main site until Step 7: Netlify Free runs functions
      in Ohio, so DB calls to Mumbai make clip creation ~3 s vs ~0.25 s on Vercel. Netlify's
      free-plan badge script stays blocked by the CSP: one harmless console error.)*
      Code and docs done 2026-11-21:
      `HOSTING_PROVIDER` + `lib/clientIp.ts` (x-nf-client-connection-ip on Netlify), edge-safe
      `proxy.ts`, CDN no-store on pages, clean-up time budget (`lib/cleanupJob.ts`),
      `netlify.toml`, smoke test for any URL, `docs/deploy-netlify.md`. **Owner:** import the
      repo on Netlify, set env vars, deploy, run `npm run smoke:prod` (incl. the spoof check),
      add the second cron job. Vercel stays live until Step 7.
- [x] **6. Pre-launch quality pass**: *(Done 2026-11-22; awaiting review.)* Fewer database
      round trips (`db/005_fast_paths.sql`, the owner applies it; the app works with or without
      it), speed measured (`docs/performance.md`), axe + keyboard tests and an NVDA script
      (`docs/accessibility.md`), Firefox/WebKit/iPhone runs (`npm run test:browsers`), content
      tests, `check:links`, `export:content`, `load:test`, `db:check`, audits, Netlify pause steps,
      `docs/launch-checklist.md` (everything before and during Step 7).

### Domain required

- [ ] **7. Domain: vinaycode.com**: code and docs done 2026-11-22 (awaiting review), inert
      until `SITE_URL=https://vinaycode.com`: www → apex and `LEGACY_HOSTS` → 301 (pages only,
      never `/api/*`), every other host noindex, HSTS on the domain, `smoke:prod --canonical`.
      **Decision 2026-11-22: Netlify Free is the final host** (Vercel = temporary fallback).
      **Owner:** follow `docs/launch-day-netlify.md` (deploy latest code to Netlify, measure,
      connect vinaycode.com via Porkbun DNS while still noindex, the flip, clean-up URL,
      Search Console, Bing, monitor, retire Vercel, rollback).
- [ ] **8. Grow traffic**: check indexing, fix issues (mostly waiting).
- [ ] **9. AdSense**: follow `docs/ads-plan.md` §5 (sign up, verify with the meta tag or
      ads.txt, Auto ads OFF, create 3 ad units, publish the European regulations message), then
      set `ADS_ENABLED=true` + slot IDs and run the launch checklist (§7). Verify the CSP on
      the live site (Report-Only first if needed).

## Log

- **Step 1** (2026-11-20): see the Step 1 section in `docs/seo.md` for what was built.
- **Step 2** (2026-11-20): home page sections below the tool (How it works, What you can share,
  Common uses, Privacy and security, FAQ with 11 questions, closing line), FAQPage JSON-LD
  generated from the same data. Note: Google retired FAQ rich results in 2026, so the FAQ
  markup has no visible effect in Google; it's kept because it's harmless and matches the page.
  Spacing above the tool tightened so the tool stays above the fold at 1280×720.
- **Step 3a** (2026-11-21): /terms and /privacy split; /about, /contact (email only); guide
  registry in `content/guides/index.ts` (metadata) + `content/guides/bodies.tsx` (bodies);
  /guides hub and /guides/[slug]; header nav (Guides, About, Contact) and footer nav (Home,
  Guides, About, Contact, Terms, Privacy); `npm run build` runs a placeholder guard
  (`scripts/check-placeholders.ts`) that blocks indexable builds with owner placeholders left.
- **Step 3b** (2026-11-21): claims about encryption, IP hashing, deletion timing and browser
  support now come from one file (`content/claims.ts`) used by every page. Deletion timing
  ("within about 10 minutes after expiry") depends on the pg_cron job in
  `docs/cleanup-scheduling.md` actually running in production. Guide registry gained
  `primaryQuery`; a test rejects empty or duplicate primary queries and requires 3 related guides.
- **Step 3c** (2026-11-21): 12 guides in 4 hub categories, all 700+ words. New permanent tests:
  no sentence shared between guides (except `content/claims.ts` wording), and every quote in
  `docs/verification-checklist.md` must appear on its guide page (70 guide quotes). Step 3 complete.
- **Step 4** (2026-11-21): ad-ready code, OFF by default. One decision function
  (`adsActive()` in `lib/ads.ts`); placements enumerated in code (guide after intro, guide
  before related, hub between categories; max 2 per page); manual units only, lazy-requested,
  labelled "Advertisements", reserved 280 px; AdSense script with the CSP nonce only on pages
  with a slot; `/ads.txt` (404 when unset) and the `google-adsense-account` meta tag, both only
  with a client ID on an indexable domain; CSP widened (scheme sources, no domains) and
  referrer policy relaxed only on ad pages while active; "no cookies / no analytics" claims
  switch off and an Advertising section appears on /privacy and /terms when active. Build guard
  extended. Tests: `e2e/ads.spec.ts` (default, real domain without ads, ads active with a fake
  publisher ID, temporary host and kill switch with ad flags).
- **Step 5** (2026-11-21, code): provider-neutral hosting. Client IP by `HOSTING_PROVIDER`
  (vercel: x-real-ip; netlify: x-nf-client-connection-ip only; local: X-Forwarded-For,
  spoofable, dev/tests only), auto-detected when unset. `proxy.ts` uses only web APIs (Netlify
  runs it as an Edge Function). Pages send `CDN-Cache-Control` / `Netlify-CDN-Cache-Control:
  no-store`. Clean-up job extracted to `lib/cleanupJob.ts` with a ~20 s budget (fits Vercel 30 s,
  Netlify 60 s, pg_net 30 s). `netlify.toml` (Node 22, docs-only pushes skip the build).
  `smoke:prod` works for any URL: nonce freshness, proxy/page indexing agreement, unknown guide
  404, ads.txt 404, multi-header spoof check, response times. Netlify Free runs functions in
  Ohio (region change needs Pro); Supabase is in Mumbai: measure, decide at Step 7.
- **Step 6** (2026-11-22): API checks combined into single Postgres functions (005, tested on a
  throwaway local Postgres: 32 checks); routes fall back to the old calls until 005 is applied.
  Pages: live mobile LCP 1.0-1.5 s, CLS 0; CDN caching rejected (it can't keep the nonce CSP
  strict). axe: one contrast fix (404 page). WebKit run found a real bug (text typed before
  hydration ignored), fixed with a regression test. Known: iPhone 13 fold (~46 px), accented
  download names in Playwright WebKit; real-device checks listed in `docs/accessibility.md`.
- **Step 7** (2026-11-22, code): `decideHost()` in `lib/site.ts` + proxy: inert unless SITE_URL is
  a real https domain; localhost always untouched (tests, `next start`). New env `LEGACY_HOSTS`
  (validated). HSTS `max-age=63072000` only on the canonical host (Vercel already sends it on
  custom domains; Netlify doesn't). Tests: redirects, API never redirected, noindex elsewhere,
  absolute JSON-LD, inert on temporary/no-site/kill-switch servers. Runbook `docs/launch-day-netlify.md` (was `launch-day.md`),
  Step 8 routine `docs/growth-monitoring.md`.
- **Step 7, Netlify decision** (2026-11-22): runbook rewritten for Netlify
  (`docs/launch-day-netlify.md`, Vercel as appendix). Found and fixed a Netlify-only React
  hydration error (#418): Netlify injects a comment into `<head>` and its badge script after
  `</html>`; an inline guard script removes them before React starts (reproduced in a test).
  Test that vinaycode.com stays noindex while SITE_URL is the netlify.app address. Credits
  re-checked (300 free, alerts at 50/75/100 %, Personal $9 = 1,000, region still Pro-only),
  monthly routine and a visitor estimate in `docs/deploy-netlify.md` §7. Speed options in
  `docs/performance.md` (recommended if needed: database in us-east-2 next to Netlify).
