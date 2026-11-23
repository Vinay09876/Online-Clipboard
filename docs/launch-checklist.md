# Launch checklist (before and during Growth Step 7: the domain)

Two parts: **A** must all be true before you buy and connect a domain; **B** is the Step 7
procedure itself, for whichever host you choose (Vercel or Netlify). Facts about other
services were checked on 2026-11-22; links are at the end of each section. Re-check prices
and menu names when you do it.

---

## A. Before Step 7: everything must be ✅

### Content and owner details
- [ ] **The three `[[ADD: …]]` placeholders are filled** (the build refuses a real domain otherwise):
  - `content/legal.ts` → `OWNER.name` (your name or pseudonym, as it should appear publicly)
  - `content/legal.ts` → `OWNER.governingLaw` (e.g. "India")
  - `app/about/page.tsx` → one or two sentences, in your own words, on why you built this
- [ ] `LEGAL_LAST_UPDATED` in `content/legal.ts` is today's date if Terms/Privacy changed.
- [ ] **`docs/verification-checklist.md` worked through**: every device claim tested on a real
  phone/computer, or softened/removed in the guide (then update the checklist quote too).
- [ ] Proofread: `npm run export:content` (with `npm start` running) writes all page text to
  `content-export/`. Read it once from start to end.
- [ ] Outbound links: `npm run check:links -- https://online-clipboard-rose.vercel.app` shows
  0 broken (links marked "check by hand" opened in a browser once).

### Live environment
- [ ] `CONTACT_EMAIL` and/or `ABUSE_CONTACT_EMAIL` are set **on the host you'll launch on**, and
  `/contact` shows the address (not the yellow placeholder note).
- [ ] `HOSTING_PROVIDER` is `vercel` or `netlify` on that host (Vercel is auto-detected).
- [ ] `db/005_fast_paths.sql` applied in Supabase; `npm run db:check` says "applied".
- [ ] **Clean-up job runs**: in Supabase SQL Editor,
  `select status_code, created from net._http_response order by created desc limit 6;`
  shows recent 200s.
- [ ] **Supabase usage** (Dashboard → Organization → Usage): database size, storage size and
  egress well inside the free plan; no "approaching limit" email.
- [ ] Netlify credits (if Netlify): **Usage & billing** shows plenty left for the month.

### Quality
- [ ] All tests green: `npm run typecheck`, `npm run lint`, `npm run build`, `npm run test:files`,
  `test:collisions`, `test:security`, `test:egress`, `test:e2e`, and `npm run test:browsers`.
- [ ] NVDA walkthrough done (`docs/accessibility.md`), and the real-phone checks from
  `docs/accessibility.md` → "Real devices".
- [ ] `npm run smoke:prod -- <current live URL>` → ALL PASSED (incl. the spoofing check).

### Decision
- [x] **Host chosen and written down** in `docs/growth-plan.md` (Step 7 entry): **Netlify Free**
  (2026-11-22; Vercel Pro isn't affordable), Vercel as temporary fallback. Background: Vercel Hobby is for non-commercial use only (ads in Step 9 are
  commercial); Netlify Free runs functions in Ohio, slower with a Mumbai database
  (`docs/deploy-netlify.md` §8).

---

## B. Step 7 procedure

> **Values for the flip (Netlify, 2026-11-23):**
> | Setting | Value |
> |---|---|
> | `SITE_URL` | `https://online-clipboard.vinaycode.com` |
> | `LEGACY_HOSTS` | `vinaycode.com,www.vinaycode.com,online-clipboard-tool.netlify.app,online-clipboard-rose.vercel.app` |
> | Clean-up URL (Vault `cleanup_url_netlify`, later `cleanup_url`) | `https://online-clipboard.vinaycode.com/api/cron/cleanup` |
> | Search Console | **Domain** property `vinaycode.com` (DNS TXT in Netlify DNS; covers the subdomain); sitemap `https://online-clipboard.vinaycode.com/sitemap.xml` |
> | Uptime monitors | `https://online-clipboard.vinaycode.com/api/health` (15 min) and `/api/health/cleanup` (30 min) |
> | ads.txt (Step 9) | served at `https://vinaycode.com/ads.txt` (root domain, never redirected) and on the subdomain |
> | Smoke test | `npm run smoke:prod -- --canonical https://online-clipboard.vinaycode.com --legacy https://vinaycode.com --legacy https://online-clipboard-tool.netlify.app` |
> Never point a job or monitor at `www.vinaycode.com` (Netlify redirects it, `/api` included).
>
> **Follow `docs/launch-day-netlify.md`** (Netlify Free is the final host;
> Vercel is the fallback, in its appendix). The notes below stay as the general reference.

### B1. Choose and buy the domain (YOU)
1. **Name:** short, easy to say and type, no hyphens or numbers. `.com` if available.
2. **Trademarks:** don't use or imitate a brand (Google, Apple, Dropbox, WhatsApp, existing
   clipboard apps…). Search the name in [WIPO Global Brand Database](https://branddb.wipo.int/),
   [IP India public search](https://tmrsearch.ipindia.gov.in/) and a normal web search before buying.
3. **Registrar:** pick one with **free WHOIS privacy/redaction** and a **fair renewal price**.
   Compare the *renewal* price, not the first-year offer. Options people use: Cloudflare
   Registrar (sells at cost, but requires Cloudflare DNS), Porkbun, Namecheap.
4. Turn on **auto-renew** and **two-factor login** at the registrar; use an email you'll
   keep for years.

### B2. Connect the domain: Vercel
1. Vercel → project → **Settings → Domains → Add** → enter `www.yourdomain.com`; also add
   `yourdomain.com` and choose **Redirect to www.yourdomain.com** (Vercel recommends www as
   primary).
2. At your registrar's DNS, add exactly what Vercel shows. Usually:
   - `A` record, host `@`, value **as shown in Vercel** (commonly `76.76.21.21`)
   - `CNAME` record, host `www`, value **as shown in Vercel** (project-specific, e.g. `…vercel-dns-0….com`)
   - Remove any other `A`/`AAAA` records on `@`.
3. Wait until Vercel shows **Valid Configuration** (minutes to 48 h). HTTPS certificates are automatic.

Sources: [Vercel: add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain),
[A records](https://vercel.com/kb/guide/use-domain-vercel-a-records),
[redirecting domains](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).

### B2'. Connect the domain: Netlify
1. Netlify → project → **Domain management → Add a domain** → `www.yourdomain.com` (primary)
   and `yourdomain.com` (Netlify redirects it to the primary).
2. At your registrar's DNS (external DNS):
   - Apex `@`: an `ALIAS`/`ANAME`/flattened `CNAME` to `apex-loadbalancer.netlify.com` if your
     DNS supports it; otherwise an `A` record to `75.2.60.5` (only **one** A record on `@`).
   - `www`: `CNAME` to `online-clipboard-tool.netlify.app`.
   - Remove `AAAA` records on `@` (Netlify's load balancer has no IPv6).
3. **Domain management → HTTPS → Verify DNS configuration**; the certificate is issued
   automatically (up to 24-48 h).

Sources: [Netlify: configure external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/),
[HTTPS](https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/).

### B3. Turn the site on for search engines (YOU, on the chosen host)
1. Environment variable **`SITE_URL=https://www.yourdomain.com`** (the primary, no slash at
   the end). Leave **`ALLOW_INDEXING` empty**. That's all: the site becomes indexable
   (robots.txt, sitemap, canonical URLs, `index` meta tag).
2. Redeploy. The build **fails on purpose** if a placeholder or the contact email is missing.
3. Supabase Vault: update `cleanup_url` to `https://www.yourdomain.com/api/cron/cleanup` (the
   job reads it every run). Remove the second Netlify job if you no longer need it.
4. Check: `https://www.yourdomain.com/robots.txt` shows `Allow: /` and a `Sitemap:` line;
   `https://yourdomain.com` redirects to `https://www.yourdomain.com`; `http://` redirects to `https://`.

### B4. Google Search Console (YOU)
1. [search.google.com/search-console](https://search.google.com/search-console) → **Add property →
   Domain** → `yourdomain.com`.
2. Copy the `google-site-verification=…` **TXT** record → add it at your DNS host (name `@`) →
   wait, then **Verify**. Keep the record forever (removing it ends the verification).
3. **Sitemaps** → submit `https://www.yourdomain.com/sitemap.xml`.
4. **URL Inspection** on the home page → **Request indexing**.

Source: [Verify your site ownership](https://support.google.com/webmasters/answer/9008080).

### B5. Bing Webmaster Tools (YOU, 2 minutes)
[bing.com/webmasters](https://www.bing.com/webmasters) → **Import** from Google Search Console
→ select the site. It is verified automatically and gets the sitemap.
Source: [Bing: import from Search Console](https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/).

### B6. Uptime monitor (YOU)
Set up the free monitor from `docs/deploy.md` §5 for `https://www.yourdomain.com/api/health`
every 5 minutes, expecting `{"ok":true}`. On Netlify every check is a function call
(roughly 15-25 credits a month at 5-minute intervals); use 10-15 minutes there if credits are tight.

### B7. Final live verification (YOU)
```bash
npm run smoke:prod -- https://www.yourdomain.com
```
Must end with **ALL PASSED** (it checks that the proxy and pages agree the site is indexable).
Then open the site on your phone and computer, send a text and a file both ways, and record
the date in `docs/growth-plan.md` (Step 7).

### Rollback
- Something wrong after connecting: set `ALLOW_INDEXING=false` and redeploy (pages become
  noindex at once), fix, then remove it again.
- Wrong host: point DNS back (records above); the old `*.vercel.app` / `*.netlify.app`
  addresses keep working throughout.
