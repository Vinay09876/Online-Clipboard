# Launch day: online-clipboard.vinaycode.com on Netlify (Free plan)

**Decisions:** Netlify Free is the final live host (2026-11-22). The canonical address is
**`https://online-clipboard.vinaycode.com`** (with the hyphen), Netlify's **primary domain**.
`vinaycode.com` is a **domain alias** on the same Netlify project. Vercel is a temporary fallback,
retired after a stable week (section h).

**State on 2026-11-23 (verified):** the latest code runs on Netlify; vinaycode.com uses **Netlify
DNS** (nameservers moved from Porkbun); both names have HTTPS; everything is still **noindex**
because `SITE_URL` is the netlify.app address. Sections a-d are done; **e ("the flip")** is next,
after the Step 7c changes are deployed (section 0).

## Words you'll meet (one sentence each)

- **Domain**: the name you rent, here `vinaycode.com` (from Porkbun, the **registrar**).
- **Subdomain**: a name in front of it, here `online-clipboard.vinaycode.com`; you can make as many as you like.
- **DNS**: the internet's phone book; it tells browsers which server answers for a name.
- **Nameservers**: the servers that hold that phone book; for vinaycode.com they are now **Netlify's** (Netlify DNS), so records are managed in Netlify, not Porkbun.
- **DNS record / TXT record**: one line in the phone book; a TXT line holds text, e.g. Google's ownership proof.
- **Primary domain**: the address Netlify treats as the main one (`online-clipboard.vinaycode.com`).
- **Domain alias**: another name that serves the same site (`vinaycode.com`); Netlify does **not** redirect aliases by itself, our code does.
- **HTTPS certificate**: the padlock; Netlify gets it from Let's Encrypt automatically.
- **301 redirect**: "moved permanently"; browsers and Google follow it to the new address.
- **noindex**: a label that tells search engines "don't list this page".
- **Canonical**: the one official address of a page that search engines should list.

## How the names behave (verified 2026-11-23, plus our code after the flip)

| Request | Today (before the flip) | After the flip |
|---|---|---|
| `https://online-clipboard.vinaycode.com/...` | served, noindex | **served, indexable** |
| `https://vinaycode.com/guides` | served, noindex (Netlify doesn't redirect aliases) | **301 → online-clipboard.vinaycode.com/guides** (our code, `LEGACY_HOSTS`) |
| `https://www.vinaycode.com/...` | **301 by Netlify** → online-clipboard.vinaycode.com (every path, `/api` too) | same (Netlify); our code would also 301 it as a backup |
| `http://...` | 301 → https (Netlify) | same |
| `https://online-clipboard-tool.netlify.app/guides` | served, noindex | **301 → online-clipboard.vinaycode.com** (our code) |
| Deploy previews / other `*.netlify.app` names | noindex | noindex |
| **`/api/*` on vinaycode.com, the netlify.app name** | served | **served, never redirected by our code** |
| `vinaycode.com/ads.txt` | 404 (no AdSense yet) | served on the bare domain itself, never redirected (AdSense reads it there) |

**www.vinaycode.com:** you don't need to add it as an alias: Netlify already answers it and
301s it to the primary domain. Because that Netlify redirect also applies to `/api`, **never
point a job or monitor at `www.`**.

---

## 0. Deploy the Step 7b/7c changes (YOU, 15 credits)

1. Optional but recommended first: apply `db/006_lookup_ceiling.sql` (Supabase → SQL Editor →
   paste → Run; additive, see `docs/security-review.md` D1). The app works with or without it.
2. `git push`. Netlify builds (one production deploy = 15 credits).
3. Run the **D2 test plan** in `docs/security-review.md` (edge rate limit) and
   `npm run smoke:prod -- https://online-clipboard.vinaycode.com --skip-spoof-test`.
   It must end with ALL PASSED (still noindex: the host isn't canonical yet).

## a-c. Done

Latest code deployed, measured, and the domain connected with HTTPS (Netlify DNS). Environment
variables on Netlify are as listed in `docs/deploy-netlify.md` §3 plus `HOSTING_PROVIDER=netlify`.

## d. Check it is NOT indexable yet (YOU, 1 min, any time before the flip)

1. Open `https://online-clipboard.vinaycode.com/robots.txt` → `Disallow: /`, no `Sitemap:` line.
2. Open `https://online-clipboard.vinaycode.com`, **Ctrl+U**, **Ctrl+F** `noindex` →
   `<meta name="robots" content="noindex, nofollow"/>`.
3. Git Bash: `curl -sI https://online-clipboard.vinaycode.com/ | grep -i x-robots` → `noindex, nofollow`.

## e. The flip: make online-clipboard.vinaycode.com the real site (YOU)

1. Netlify → **Project configuration → Environment variables**:
   - `SITE_URL` → `https://online-clipboard.vinaycode.com` (no slash at the end)
   - `LEGACY_HOSTS` → `vinaycode.com,www.vinaycode.com,online-clipboard-tool.netlify.app,online-clipboard-rose.vercel.app`
   - `ALLOW_INDEXING` stays unset.
2. **Deploys → Trigger deploy → Deploy project** (15 credits). A "BUILD BLOCKED" message means a
   placeholder or the contact email is missing.
3. Verify (each must end with **ALL PASSED**):
   ```bash
   npm run smoke:prod -- --canonical https://online-clipboard.vinaycode.com --legacy https://vinaycode.com --legacy https://online-clipboard-tool.netlify.app
   ```
   It checks https, http→https, www→canonical, the bare domain and the netlify.app name → 301 to
   the canonical address, `/api/*` **not** redirected on any of them, canonical/robots/sitemap,
   HSTS, and the IP-spoofing check (it locks your IP out of code lookups for ~10 minutes).

## f. Clean-up job: move it without ever stopping (YOU, Supabase)

`/api/*` is never redirected by our code, and Netlify serves the alias and the netlify.app name
without redirecting, so every old cleanup URL keeps working while you switch. **Don't use `www.`**
(Netlify redirects it, and the job can't follow redirects).

**f1. Now (works before or after the flip):**
1. Supabase → **Integrations → Vault → Secrets** → `cleanup_url_netlify` → value
   `https://online-clipboard.vinaycode.com/api/cron/cleanup` → Save.
2. If `select jobname from cron.job;` doesn't list `cleanup-expired-clips-netlify`, recreate it with
   the SQL in `docs/deploy-netlify.md` §6 step 2 (runs at :05, :15, …).
3. After 15 minutes:
   ```sql
   select status_code, left(content, 80) as body, created
   from net._http_response order by created desc limit 6;
   ```
   Rows at **:x5** must be **200** (`401` = Netlify's `CRON_SECRET` ≠ Vault's `cron_secret`).

**f2. When retiring Vercel (section h):**
1. Vault → `cleanup_url` → `https://online-clipboard.vinaycode.com/api/cron/cleanup` → Save.
2. Next **:x0** run → 200.
3. Only then: `select cron.unschedule('cleanup-expired-clips-netlify');`

At every moment at least one job with a verified 200 is running.

## g. Search engines and monitors (YOU, after the flip)

1. **Google Search Console** ([search.google.com/search-console](https://search.google.com/search-console)):
   **Add property → Domain** → `vinaycode.com` (a Domain property covers **all subdomains**,
   including online-clipboard.vinaycode.com, and http/https). Copy the
   `google-site-verification=…` value → Netlify → **Domains → vinaycode.com → DNS settings →
   Add new record**: Type `TXT`, Name `@` (or empty), Value the copied text → Save → back in Search
   Console **Verify** (wait 15-60 min if it fails). **Never delete that record.**
   - **Sitemaps** → submit the full URL `https://online-clipboard.vinaycode.com/sitemap.xml`.
   - **URL inspection** → Request indexing for `https://online-clipboard.vinaycode.com/`,
     `/guides`, and your 3 most important guides.
2. **Bing Webmaster Tools** ([bing.com/webmasters](https://www.bing.com/webmasters)) → **Import** from
   Search Console → select vinaycode.com.
3. **Uptime monitors** (UptimeRobot, free), both on the canonical address:
   - `https://online-clipboard.vinaycode.com/api/health`, keyword `"ok":true`, every **15 min**.
   - `https://online-clipboard.vinaycode.com/api/health/cleanup`, every **30 min**; "down" (503)
     means the clean-up is 30+ minutes behind (`docs/security-review.md` §5).
   Each check is a function call (credits: roughly 8-12 + 3 a month).
4. From now on: `docs/growth-monitoring.md` (weekly) and the credit check in
   `docs/deploy-netlify.md` §7 (monthly).

**AdSense later (Step 9):** for a site on a subdomain, ad crawlers read `ads.txt` on the **root
domain**: `https://vinaycode.com/ads.txt`. Our app serves it there itself (never redirected) once
`ADSENSE_CLIENT_ID` is set, and also on the subdomain. If vinaycode.com ever hosts a different
site, that site must serve the line (or a `subdomain=online-clipboard.vinaycode.com` entry).
Sources: [Ads.txt FAQs](https://support.google.com/adsense/answer/9785052),
[IAB ads.txt 1.1](https://iabtechlab.com/wp-content/uploads/2022/04/Ads.txt-1.1.pdf).

## h. Retire Vercel (YOU, after one stable week)

1. Vercel → Environment Variables: `SITE_URL=https://online-clipboard.vinaycode.com`,
   `LEGACY_HOSTS=online-clipboard-rose.vercel.app` → **Redeploy**. Every page on the vercel.app
   address then 301s to the canonical address; its API still answers.
   Check: `curl -sI https://online-clipboard-rose.vercel.app/guides` → `301`,
   `location: https://online-clipboard.vinaycode.com/guides`.
2. Move the clean-up job (f2). Remove monitors that still point at vercel.app.
3. Vercel → Settings → **Git → Disconnect** (no more builds there). **Don't delete the project**
   for a few months: the redirects live in its last deployment.

## i. Rollback

| Situation | Do this |
|---|---|
| Something looks wrong after the flip | Netlify env `ALLOW_INDEXING=false` → Trigger deploy: every page noindex at once, redirects keep working. Remove it later. |
| Undo the flip, stay on Netlify | `SITE_URL` back to `https://online-clipboard-tool.netlify.app`, delete `LEGACY_HOSTS`, Trigger deploy. |
| Netlify down, too slow or out of credits ("Site not available") | Vercel runs the same code. 1) Vercel → **Settings → Domains → Add** `online-clipboard.vinaycode.com` and note the record it wants (a CNAME). 2) Netlify DNS → vinaycode.com → change the `online-clipboard` record to Vercel's value (or move nameservers back to Porkbun and add it there). 3) Vercel env: `SITE_URL=https://online-clipboard.vinaycode.com`, `LEGACY_HOSTS=online-clipboard-rose.vercel.app`, Redeploy. 4) Clean-up URLs already use the canonical name, so they follow DNS. 5) `npm run smoke:prod -- --canonical https://online-clipboard.vinaycode.com`. Not confirmed: whether Netlify DNS keeps answering while the account is paused. If it doesn't, move the nameservers back to Porkbun (Porkbun → Domain Management → vinaycode.com → **Authoritative Nameservers** → Porkbun's defaults) and add the records there. |

---

## Appendix: Vercel as the live host (fallback only)

Vercel → **Settings → Domains → Add** `online-clipboard.vinaycode.com`, add the CNAME Vercel shows in
the DNS where vinaycode.com is managed, wait for **Valid Configuration**, then
`SITE_URL=https://online-clipboard.vinaycode.com`, `LEGACY_HOSTS=online-clipboard-rose.vercel.app`
(plus `vinaycode.com` if the bare domain also points to Vercel), Redeploy, and run the section e smoke
test. Source: [Vercel: add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
