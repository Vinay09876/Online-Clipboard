# Launch day: vinaycode.com on Vercel

An exact, ordered runbook. Do the steps in order; each one says what "done" looks like.
Budget about 2 hours, mostly waiting for DNS. Vercel stays the live host; the Netlify test site
keeps its `*.netlify.app` address and stays hidden from search engines (noindex).

Menu names were checked on 2026-11-22 ([Porkbun DNS help](https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun),
[Vercel domains](https://vercel.com/docs/domains/working-with-domains/add-a-domain)). If a label
differs slightly on screen, look for the closest match.

## Words you'll meet (one sentence each)

- **Domain**: the name people type, here `vinaycode.com`.
- **Registrar**: the company you rent the domain from (Porkbun).
- **DNS**: the internet's phone book; it tells browsers which server answers for your domain.
- **DNS record**: one line in that phone book (type + host + value).
- **A record**: points a name straight at a server's numeric address (an IP like `76.76.21.21`).
- **CNAME record**: points a name at another *name* (e.g. `www` → a Vercel address).
- **ALIAS record**: Porkbun's special record that acts like a CNAME on the bare domain; Porkbun adds one by default for its parking page.
- **Apex / root domain**: the bare `vinaycode.com`, without `www.`; in Porkbun's "Host" field it is left **empty**.
- **TTL**: how long other computers may remember a record before asking again (the default is fine).
- **TXT record**: a line of text in DNS, used here to prove to Google that you own the domain.
- **Propagation**: the time (minutes, sometimes hours) until DNS changes are seen everywhere.
- **HTTPS certificate**: what makes the padlock appear; Vercel creates it automatically once DNS is right.
- **Redirect (301)**: "this page has moved permanently"; browsers and Google follow it to the new address.

---

## 0. Before you start (must all be true)

- [x] The **three `[[ADD: …]]` texts are filled** (done in the Step 6 commit: name, governing
      law, "why I built this"). The build guard refuses a real domain if one ever comes back.
- [ ] `LEGAL_LAST_UPDATED` in `content/legal.ts` is the date the Terms/Privacy text last changed
      (the owner name was added on 2026-11-22).
- [ ] The Step 7 code is pushed and live on Vercel. It changes nothing until step 4.
- [ ] In Vercel → Settings → Environment Variables, `ABUSE_CONTACT_EMAIL` (or `CONTACT_EMAIL`) is set.
- [ ] `npm run smoke:prod -- https://online-clipboard-rose.vercel.app --skip-spoof-test` → ALL PASSED.

## 1. Buy the domain at Porkbun (YOU)

1. porkbun.com → search `vinaycode.com` → add to cart → check out.
2. Porkbun includes **WHOIS privacy** (hides your name/address from public lookups) for free;
   make sure it's on: **Domain Management → Details** next to the domain → **WHOIS Privacy: On**.
3. Same place: turn on **Auto Renew**. In your Porkbun account, turn on **two-factor login**.

**Done when:** `vinaycode.com` is listed in Porkbun → Domain Management.

## 2. Add the domain in Vercel (YOU)

1. vercel.com → your project → **Settings → Domains → Add Domain**.
2. Type `vinaycode.com` → **Add**. If Vercel offers **"Add www.vinaycode.com and redirect it to
   vinaycode.com"** (or similar), choose that. (Our code also redirects www → vinaycode.com,
   so either way works.) If it doesn't offer it, add `www.vinaycode.com` too.
3. Vercel now shows both domains with **"Invalid Configuration"** and the records it wants,
   typically:
   - for `vinaycode.com`: **Type A**, **Name `@`**, **Value** an IP such as `76.76.21.21`
   - for `www.vinaycode.com`: **Type CNAME**, **Name `www`**, **Value** something like `cname.vercel-dns-0.com` or a project-specific `…vercel-dns-….com`
   **Copy the exact values Vercel shows you** (don't copy them from this page: they can differ per project).

## 3. DNS records at Porkbun (YOU)

1. porkbun.com → **Account → Domain Management** → find `vinaycode.com` → click **DNS** (under
   the domain name). (Or **Details** → the pencil icon next to **DNS RECORDS**.)
2. **Delete Porkbun's defaults first.** At the bottom you'll see existing records, usually an
   `ALIAS` with an empty host and a `CNAME` with host `*`, both pointing to `pixie.porkbun.com`
   (Porkbun's parking page). Click the **trash can** on each record that points to
   `pixie.porkbun.com`, and on any other `A`, `AAAA`, `ALIAS` record with an empty host or a
   `www` record. (Leave `MX`/`TXT` records alone if you set up email.)
3. **Add the A record** (top form):
   - **Type:** `A - Address record`
   - **Host:** leave **empty** (that means the bare `vinaycode.com`)
   - **Answer:** the IP Vercel showed (e.g. `76.76.21.21`)
   - **TTL:** leave the default (600) → **Add**
4. **Add the CNAME record:**
   - **Type:** `CNAME - Canonical name record`
   - **Host:** `www`
   - **Answer:** the value Vercel showed for www
   - **TTL:** default → **Add**
5. If Porkbun says "conflict", a default record is still there: delete it (step 2) and add again.

**Done when:** back in Vercel → Settings → Domains, both domains show **Valid Configuration**
(blue/green check). That takes minutes, sometimes a few hours. Refresh now and then. Vercel then
issues the HTTPS certificate by itself.

**Check:** open `https://vinaycode.com` in a browser: the site loads with a padlock.
(It is still hidden from Google: that's step 4.)

## 4. Switch the site to the domain (YOU)

1. Vercel → **Settings → Environment Variables**:
   - Edit **`SITE_URL`** → `https://vinaycode.com` (no slash at the end) → Save.
   - Add **`LEGACY_HOSTS`** → `online-clipboard-rose.vercel.app` → Save.
   - Make sure **`ALLOW_INDEXING`** is empty or absent.
2. **Deployments** → the latest Production deployment → **⋯ → Redeploy** → Redeploy.
3. Watch the build. If it fails with **"BUILD BLOCKED … placeholders"**, a placeholder or the
   contact email is missing (step 0). Fix, push, it redeploys.

**What happens now:** `vinaycode.com` is indexable (robots.txt, sitemap, canonical URLs);
`www.vinaycode.com` and `online-clipboard-rose.vercel.app` pages redirect (301) to
`vinaycode.com`; any other `*.vercel.app` address (preview deployments) answers with
"noindex". **`/api/…` is never redirected**, on any address.

## 5. Check it (YOU, 2 minutes)

```bash
npm run smoke:prod -- --canonical https://vinaycode.com --legacy https://online-clipboard-rose.vercel.app
```

Must end with **ALL PASSED**. It checks https, http→https, www→vinaycode.com, the old address,
canonical/robots/sitemap, HSTS, the API not being redirected, and the rate-limit spoofing check.
(It locks your own IP out of code lookups for 10 minutes at the end; that's expected.)

## 6. Point the clean-up job at the new domain (YOU, Supabase)

Order matters only a little, because **the old URL keeps working** (`/api/…` is never
redirected), so the clean-up never stops:

1. Step 5 showed `https://vinaycode.com/api/cron/cleanup … → 401`. That means the endpoint is ready.
2. Supabase → **Integrations → Vault → Secrets** → `cleanup_url` → edit the value to
   `https://vinaycode.com/api/cron/cleanup` → Save. (The job reads it on every run; nothing else to change.)
3. After 10-15 minutes, SQL Editor:
   ```sql
   select status_code, created from net._http_response order by created desc limit 4;
   ```
   Newest rows: **200**. If you see 401, the Vault `cron_secret` doesn't match Vercel's `CRON_SECRET`.
4. The extra Netlify job (`cleanup-expired-clips-netlify`) can stay or be removed to save Netlify
   credits: `select cron.unschedule('cleanup-expired-clips-netlify');`

## 7. Google Search Console (YOU)

1. [search.google.com/search-console](https://search.google.com/search-console) → **Add property** →
   choose **Domain** (left box) → `vinaycode.com` → **Continue**.
2. Google shows a TXT value starting with `google-site-verification=`. **Copy** it.
3. Porkbun → DNS for vinaycode.com → **Add**: **Type** `TXT`, **Host** empty, **Answer** the
   copied value → **Add**.
4. Back in Search Console → **Verify**. If it fails, wait 15-60 minutes and try again.
   **Never delete this TXT record** (verification would expire).
5. **Sitemaps** (left menu) → enter `sitemap.xml` → **Submit**. Status should become "Success".
6. **URL inspection** (search bar at the top): paste each URL, wait, click **Request indexing**:
   - `https://vinaycode.com/`
   - `https://vinaycode.com/guides`
   - `https://vinaycode.com/guides/copy-paste-text-between-phone-and-computer`
   - `https://vinaycode.com/guides/send-file-from-phone-to-pc-without-cable`
   - `https://vinaycode.com/guides/is-an-online-clipboard-safe`
   (Google allows only a few requests a day; the sitemap covers the rest.)

Source: [Verify your site ownership](https://support.google.com/webmasters/answer/9008080).

## 8. Bing Webmaster Tools (YOU, 2 minutes)

[bing.com/webmasters](https://www.bing.com/webmasters) → sign in → **Import** (from Google
Search Console) → allow access → select `vinaycode.com` → Import. It is verified automatically
and picks up the sitemap. Source: [Bing: import from Search Console](https://blogs.bing.com/webmaster/2019/9/Import-sites-from-Search-Console-to-Bing-Webmaster-Tools/).

## 9. Uptime monitor (YOU, 5 minutes)

As in `docs/deploy.md` §5, but with the new address: UptimeRobot (free) → **New monitor →
HTTP(s)** → URL `https://vinaycode.com/api/health` → every **5 minutes** → optional keyword
`"ok":true`. If you already have one for the vercel.app address, just edit its URL. (The old URL
also keeps working, since the API is never redirected.)

## 10. Final check and note (YOU)

1. Phone and computer: open `https://vinaycode.com`, send a text and a file both ways.
2. Run the step 5 smoke test once more.
3. In `docs/growth-plan.md`, tick Step 7 with today's date. Step 8 starts:
   `docs/growth-monitoring.md`.

---

## Rollback

| Problem | Do this |
|---|---|
| Anything looks wrong after step 4 and you want Google to stay away | Vercel → env **`ALLOW_INDEXING=false`** → Redeploy. Every page becomes noindex at once; redirects keep working. Remove it again after fixing. |
| Undo the switch completely | Set `SITE_URL` back to `https://online-clipboard-rose.vercel.app`, delete `LEGACY_HOSTS`, Redeploy. Redirects stop and the vercel.app address works as before. In Vault, set `cleanup_url` back to the vercel.app URL. |
| The domain doesn't load at all (DNS) | Nothing is lost: `online-clipboard-rose.vercel.app` keeps working throughout. Recheck the Porkbun records against what Vercel shows; delete leftover `pixie.porkbun.com` records. |
| A bad deploy | Vercel → Deployments → the last good one → **⋯ → Promote to Production** (`docs/deploy.md` §8). |
