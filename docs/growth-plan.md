# Phase 2: growth plan

Goal: organic search traffic, then Google AdSense, at the lowest possible cost.
One step at a time; each step is reviewed before the next starts.

**Standing constraints**

- No paid tools or services. Ask before adding any npm dependency.
- No domain until Step 7. Until then the site must NOT be indexed.
- No ads until Step 9. No analytics, cookies, third-party scripts, fonts or images until then;
  the strict CSP stays strict.
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
- **3. Guide pages and trust pages**, split into three passes:
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
        Each guide now shows 3 related guides. *(Done 2026-11-21; awaiting review.)*
  - [ ] **3c.** Guides: sending files to a print shop; sharing files in a classroom; moving code
        snippets or logs from phone to computer; online clipboard vs emailing yourself or
        messaging apps; what an online clipboard is and how it works.
  (Topic list is the owner's plan and may change.)
- [ ] **4. Ad-ready code, switched OFF**: ad slot component behind an env flag (never on
      received-clip or download screens), drafted privacy text, EEA/UK consent plan, CSP plan.
- [ ] **5. Move hosting to Netlify (free)**: client-IP reading for rate limits (+ re-run the
      spoof test), cleanup schedule URL, env vars, docs; re-check CSP, proxy.ts and after().
- [ ] **6. Pre-launch quality pass**: speed, accessibility, mobile, broken links, spelling,
      full test run.

### Domain required

- [ ] **7. Buy the domain**: connect to Netlify, set `SITE_URL`, turn indexing on, www redirect,
      Google Search Console + Bing Webmaster Tools, submit the sitemap. Checklist in `docs/seo.md`.
- [ ] **8. Grow traffic**: check indexing, fix issues (mostly waiting).
- [ ] **9. AdSense**: apply, ads.txt, consent, update Privacy/Terms/CSP, turn ad slots on.

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
