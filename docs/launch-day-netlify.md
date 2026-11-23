# Launch day: vinaycode.com on Netlify (Free plan)

**Decision (2026-11-22):** Netlify Free is the final live host. Vercel is only a temporary
fallback until the move is stable, then it is retired (section h).

Do the sections **in order**. Each says what "done" looks like. Nothing here is indexable by
Google until **section e ("the flip")**, which you do later, after the security review.
Menu names were checked on 2026-11-22 against Netlify's and Porkbun's help pages (links in
each section); if a label differs slightly, look for the closest match.

## Words you'll meet (one sentence each)

- **Domain**: the name people type, here `vinaycode.com`.
- **Registrar**: the company you rent the domain from (Porkbun).
- **DNS**: the internet's phone book; it tells browsers which server answers for your domain.
- **DNS record**: one line in that phone book: a **type**, a **host** (which name) and an **answer** (where to send it).
- **Apex / root domain**: the bare `vinaycode.com` without `www.`; in Porkbun's "Host" field it is left **empty**.
- **A record**: points a name at a server's numeric address (an IP such as `75.2.60.5`).
- **ALIAS record**: like a CNAME but allowed on the bare domain; Porkbun resolves it to the target's IP for you.
- **CNAME record**: points a name at another *name* (e.g. `www` → `online-clipboard-tool.netlify.app`).
- **TXT record**: a line of text in DNS, used to prove to Google that you own the domain.
- **AAAA record**: like an A record but for the newer IPv6 addresses (Netlify's apex doesn't use them).
- **Nameservers**: the servers that hold your phone book; Porkbun's by default.
- **TTL**: how long other computers may remember a record before asking again (the default is fine).
- **Propagation**: the time (minutes, sometimes hours) until a DNS change is seen everywhere.
- **HTTPS certificate**: what makes the padlock appear; Netlify gets one for free from Let's Encrypt once DNS is right.
- **Primary domain**: the address Netlify treats as the main one (`vinaycode.com`).
- **301 redirect**: "moved permanently"; browsers and Google follow it to the new address.
- **noindex**: a label that tells search engines "don't list this page".

---

## a. Bring Netlify up to date (YOU, ~15 min, costs 15 credits)

The Netlify copy runs older code (Step 5). The latest code (Steps 6-7) includes the faster
database paths, the early-typing fix and the Netlify hydration fix.

1. **Turn automatic builds back on:** Netlify → project **online-clipboard-tool** → **Project
   configuration → Developer settings → Continuous deployment → Build settings → Configure** →
   **Build status: Active builds** → **Save**. (Netlify doesn't build at once.)
2. **Check the environment variables** (**Project configuration → Environment variables**).
   It must have exactly these (values as set in Step 5, `docs/deploy-netlify.md` §3):

   | Variable | Value now | Secret? |
   |---|---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase URL | no |
   | `SUPABASE_SERVICE_ROLE_KEY` | service role key | **yes** |
   | `CRON_SECRET` | same as Supabase Vault `cron_secret` | **yes** |
   | `IP_HASH_SALT` | same as before | **yes** |
   | `HOSTING_PROVIDER` | `netlify` | no |
   | `SITE_URL` | `https://online-clipboard-tool.netlify.app` (**keeps the site noindex until the flip**) | no |
   | `ABUSE_CONTACT_EMAIL` (and `CONTACT_EMAIL` if you use it) | your public address | no |
   | `CLIP_EXPIRY_MINUTES`, `MAX_FILE_SIZE_MB` | `30`, `25` | no |
   | `MAX_LIVE_CLIPS`, `MAX_TOTAL_STORAGE_MB`, `MAX_MONTHLY_DOWNLOAD_MB` | `200`, `800`, `4000` | no |

   Leave **unset**: `ALLOW_INDEXING`, `LEGACY_HOSTS` (set in section e), all `ADS_*`/`ADSENSE_*`.
3. **Deploy the latest code:** in Git Bash, `git push` (sends Steps 6 and 7 to GitHub). Netlify
   and Vercel both build. On Netlify this is **one production deploy = 15 credits**.
   (If the push already happened, use **Deploys → Trigger deploy → Deploy project**.)
4. Open the deploy log. **Done when** it shows **Published** and `@netlify/plugin-nextjs` is
   **5.16.6 or newer**.

## b. Test Netlify and compare with Vercel (YOU, ~10 min)

Use a **normal internet connection** (not a hotspot that is busy downloading). In Git Bash:

```bash
npm run db:check                                                       # must say "applied"
npm run smoke:prod -- https://online-clipboard-tool.netlify.app        # full run, incl. the spoofing check
npm run smoke:prod -- https://online-clipboard-rose.vercel.app --skip-spoof-test
npm run smoke:prod -- https://online-clipboard-tool.netlify.app --skip-spoof-test
```

The Netlify run must end with **ALL PASSED** (one WARN about Netlify's badge script is expected).
Paste me the "Response times" blocks. Compare the **median** of `POST /api/clips (create)`,
`GET /api/clips/<code> (fetch)` and `GET .../download (link)`, using the **second** Netlify run
(the first includes cold starts and the spoof check).

**Decision rule** (Netlify medians, measured from India on a normal connection):

| Netlify create median | Netlify open median | What to do |
|---|---|---|
| ≤ 1.5 s | ≤ 1.0 s | **Go.** Continue with section c. |
| 1.5-3 s | 1.0-2 s | **Go, but plan the speed fix** (see `docs/performance.md`, "Further speed options"): it's usable, not great. |
| > 3 s | > 2 s | **Stop and tell me.** Something isn't using the fast path (check `npm run db:check`), or the region gap is too big. |

(Vercel will stay faster from India: its functions are in Mumbai next to the database; Netlify
Free's are in Ohio and can't be moved on the free plan.)

## c. Connect vinaycode.com to Netlify (YOU, ~20 min + waiting)

### Which DNS option? Recommended: **keep Porkbun's DNS** and add two records.

| | Keep Porkbun DNS (**recommended**) | Move to Netlify DNS (change nameservers) |
|---|---|---|
| What you change | 2 records at Porkbun | the domain's nameservers, then everything lives at Netlify |
| How fast it works | minutes to ~1 hour | often hours, up to 24-48 h |
| Rollback to Vercel | edit 2 records | move nameservers back or recreate records at Netlify |
| Email/TXT records later | stay at Porkbun, one place | must be recreated at Netlify |

Porkbun supports **ALIAS** records on the bare domain, which is what Netlify recommends for
external DNS, so you lose nothing by staying with Porkbun.

### c1. Add the domain in Netlify
1. Netlify → your project → **Domain management** → **Add a domain** → enter `vinaycode.com` →
   **Verify** → **Add domain** (Netlify may ask "Add domain you already own": yes).
2. Netlify adds `www.vinaycode.com` automatically. In the list, open **Options** next to
   `vinaycode.com` → **Set as primary domain** (so `www` redirects to it).
3. Both show **"Awaiting External DNS"** / "Check DNS configuration". Click it: Netlify shows the
   records it wants. **Write down exactly what it shows.** Typically:
   - bare domain: an **ALIAS** (or ANAME/flattened CNAME) to `apex-loadbalancer.netlify.com`,
     or, if you can't use ALIAS, an **A** record to `75.2.60.5`
   - `www`: a **CNAME** to `online-clipboard-tool.netlify.app`

### c2. Records at Porkbun
1. porkbun.com → **Account → Domain Management** → find `vinaycode.com` → click **DNS** under the
   name (or **Details** → pencil icon next to **DNS RECORDS**).
2. **Delete the parking records first.** At the bottom, every record whose answer is
   `pixie.porkbun.com` (usually an `ALIAS` with an empty host and a `CNAME` with host `*`):
   click its **trash can**. Also delete any other `A`, `AAAA`, `ALIAS` or `CNAME` with an empty
   host or host `www`. (Leave `MX`/`TXT` records alone if you add email later.)
3. **Add the bare-domain record** (form at the top):
   **Type** `ALIAS - CNAME flattening record` · **Host** *(empty)* · **Answer** `apex-loadbalancer.netlify.com`
   (or whatever Netlify showed) · TTL default → **Add**.
   *If you prefer an A record:* **Type** `A`, Host empty, Answer `75.2.60.5`; keep **only one** A record.
4. **Add the www record:** **Type** `CNAME` · **Host** `www` · **Answer** `online-clipboard-tool.netlify.app` → **Add**.
5. "Conflict" error = a default record is still there: delete it and add again.

Sources: [Netlify: external DNS](https://docs.netlify.com/manage/domains/configure-domains/configure-external-dns/),
[Porkbun: add DNS records](https://kb.porkbun.com/article/231-how-to-add-dns-records-on-porkbun).

### c3. Wait for HTTPS
1. Netlify → **Domain management** → both domains turn from "Awaiting External DNS" to a
   check mark (refresh now and then; minutes to an hour, rarely longer).
2. **Domain management → HTTPS** → **Verify DNS configuration**. Netlify provisions the
   Let's Encrypt certificate automatically; the section then shows the certificate with
   `vinaycode.com, www.vinaycode.com`. This can take up to 24 h after DNS is right.
3. **Done when** `https://vinaycode.com` opens with a padlock and shows the site.
   Source: [Netlify: HTTPS](https://docs.netlify.com/manage/domains/secure-domains-with-https/https-ssl/).

## d. Check the domain is NOT indexable yet (YOU, 2 min)

`SITE_URL` still says the netlify.app address, so every page on vinaycode.com is labelled
**noindex** (an automated test checks this: `e2e/seo.spec.ts`, "connected before the flip").
Check by hand:

1. Open `https://vinaycode.com/robots.txt` → it shows `Disallow: /` and **no** `Sitemap:` line.
2. Open `https://vinaycode.com`, press **Ctrl+U** (view source), **Ctrl+F** → `noindex` →
   you find `<meta name="robots" content="noindex, nofollow"/>`.
3. Optional, Git Bash: `curl -sI https://vinaycode.com/ | grep -i x-robots` →
   `x-robots-tag: noindex, nofollow`.

If any of these is missing, **stop** and tell me.

## e. The flip: make vinaycode.com the real site (YOU, later, after the security review)

1. Netlify → **Environment variables**:
   - `SITE_URL` → `https://vinaycode.com` (no slash at the end)
   - add `LEGACY_HOSTS` → `online-clipboard-tool.netlify.app`
   - `ALLOW_INDEXING` stays unset.
2. **Deploys → Trigger deploy → Deploy project** (15 credits). If the build fails with
   "BUILD BLOCKED", a placeholder or the contact email is missing.
3. Verify:
   ```bash
   npm run smoke:prod -- --canonical https://vinaycode.com --legacy https://online-clipboard-tool.netlify.app
   ```
   **ALL PASSED** means: https works, http→https, www→vinaycode.com, the netlify.app pages
   301 to vinaycode.com, `/api/*` is **not** redirected anywhere, canonical/robots/sitemap
   are right, HSTS is sent, and the spoofing check holds.

## f. Clean-up job: move it without ever stopping (YOU, Supabase)

Facts that make this safe: `/api/*` is **never** redirected (our code), Netlify does **not**
redirect its netlify.app address by itself, and the job is harmless to run twice (it only
deletes expired things).

Current state: job `cleanup-expired-clips` (at :00, :10, …) calls the URL in Vault secret
`cleanup_url` (the vercel.app address); job `cleanup-expired-clips-netlify` (at :05, :15, …)
calls `cleanup_url_netlify` (if you unscheduled it while Netlify was paused, step f1 recreates it).

**f1. Right after c3 (HTTPS works; before or after the flip, both fine):**
1. Supabase → **Integrations → Vault → Secrets** → `cleanup_url_netlify` → edit the value to
   `https://vinaycode.com/api/cron/cleanup` → Save.
2. If the Netlify job no longer exists (`select jobname from cron.job;` doesn't list it),
   run the `cron.schedule('cleanup-expired-clips-netlify', '5-59/10 * * * *', …)` SQL from
   `docs/deploy-netlify.md` §6 step 2.
3. Wait 15 minutes, then:
   ```sql
   select status_code, left(content, 80) as body, created
   from net._http_response order by created desc limit 6;
   ```
   Rows at **:x5** times = the vinaycode.com job → must be **200**. Rows at **:x0** = the
   Vercel job, still 200. (`401` = Netlify's `CRON_SECRET` ≠ Vault `cron_secret`.)

**f2. When retiring Vercel (section h), one job left:**
1. Vault → `cleanup_url` → `https://vinaycode.com/api/cron/cleanup` → Save.
2. Next :x0 run → 200 (same query).
3. Only then: `select cron.unschedule('cleanup-expired-clips-netlify');`
   (Now one job, at :00/:10/…, calls vinaycode.com.)

At every moment at least one job with a verified 200 is running.

## g. Search engines and monitoring (YOU, after the flip)

1. **Google Search Console:** [search.google.com/search-console](https://search.google.com/search-console)
   → **Add property → Domain** → `vinaycode.com` → copy the `google-site-verification=…` value →
   Porkbun DNS → **Add**: Type `TXT`, Host *empty*, Answer the value → back in Search Console
   **Verify** (wait 15-60 min if it fails). **Never delete that TXT record.**
   Then **Sitemaps** → `sitemap.xml` → Submit. **URL inspection** → Request indexing for
   `https://vinaycode.com/`, `/guides`, and the 3 guides you care about most.
2. **Bing Webmaster Tools:** [bing.com/webmasters](https://www.bing.com/webmasters) → **Import**
   from Google Search Console → select vinaycode.com.
3. **Uptime monitor** (UptimeRobot, free): **HTTP(s)** monitor on
   `https://vinaycode.com/api/health`, keyword `"ok":true`, interval **15 minutes** (each check is
   a function call that costs Netlify credits: roughly 8-12 credits/month at 15 min, 25-36 at 5 min).
4. From now on: the weekly routine in `docs/growth-monitoring.md` and the monthly credit check
   in `docs/deploy-netlify.md` §7.

## h. Retire Vercel (YOU, after one stable week on vinaycode.com)

Stable week = no downtime alerts, smoke test passing, credits on track.

1. **Make the old vercel.app address redirect:** Vercel → Settings → Environment Variables →
   `SITE_URL` = `https://vinaycode.com`, `LEGACY_HOSTS` = `online-clipboard-rose.vercel.app` →
   Deployments → **Redeploy**. Now every *page* on `online-clipboard-rose.vercel.app` 301s to
   vinaycode.com (old links and bookmarks keep working); its API still answers.
   Check: `curl -sI https://online-clipboard-rose.vercel.app/guides` → `301` and
   `location: https://vinaycode.com/guides`.
2. Move the clean-up job (section f2).
3. Delete or edit any uptime monitor still pointing at vercel.app.
4. **Stop Vercel deploys** so pushes don't build there any more: Vercel → Settings → **Git** →
   **Disconnect** the repository. The last deployment keeps serving the redirects.
5. **Don't delete the Vercel project** for at least a few months: deleting it would turn the
   old address into an error page instead of a redirect.

## i. Rollback to Vercel

| Situation | Do this |
|---|---|
| Something looks wrong after the flip; keep Google away while you fix it | Netlify env `ALLOW_INDEXING=false` → Trigger deploy. Every page becomes noindex; redirects keep working. Remove it later. |
| Netlify is down, too slow, or out of credits (site shows "Site not available") | Vercel still runs the same code. 1) Vercel → **Settings → Domains → Add** `vinaycode.com` (+ www) and note its records. 2) Porkbun: replace the ALIAS/A and www CNAME with Vercel's values. 3) Vercel env: `SITE_URL=https://vinaycode.com`, `LEGACY_HOSTS=online-clipboard-rose.vercel.app` (if not already), Redeploy. 4) Clean-up URLs already say vinaycode.com, so they follow the DNS. 5) `npm run smoke:prod -- --canonical https://vinaycode.com`. |
| Undo the flip but stay on Netlify | Netlify `SITE_URL` back to the netlify.app address, delete `LEGACY_HOSTS`, Trigger deploy. vinaycode.com stays connected but noindex. |

Keep Vercel's project and environment variables until you are sure (section h step 5).

---

## Appendix: Vercel as the live host (fallback only)

Same idea, Vercel's dashboard: **Settings → Domains → Add** `vinaycode.com` (choose "redirect
www to vinaycode.com"), copy the records Vercel shows (typically an `A` record such as
`76.76.21.21` for the bare domain and a project-specific `CNAME` for `www`) into Porkbun after
deleting the parking records, wait for **Valid Configuration**, then set `SITE_URL=https://vinaycode.com`
and `LEGACY_HOSTS=online-clipboard-rose.vercel.app`, Redeploy, and run
`npm run smoke:prod -- --canonical https://vinaycode.com --legacy https://online-clipboard-rose.vercel.app`.
Clean-up URL, Search Console, Bing and the monitor are the same as above.
Sources: [Vercel: add a domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
