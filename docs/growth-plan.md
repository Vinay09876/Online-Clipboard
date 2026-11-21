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
      `docs/content-guidelines.md`. *(Done 2026-11-20; awaiting review.)*
- [ ] **3. Guide pages and trust pages**: guides hub + 10-15 original guides (topics approved by
      the owner), About, Contact, Privacy Policy; reusable page template; internal links.
      Add each public page to `lib/sitePages.ts`.
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
