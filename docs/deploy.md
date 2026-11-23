# Deploying Online Clipboard (Vercel Hobby + Supabase Free)

> **Netlify:** the app also runs on Netlify's free plan; see `docs/deploy-netlify.md`
> (Growth Step 5). Vercel stays live until the domain step. On Vercel, `HOSTING_PROVIDER` can
> stay unset (Vercel is detected via `VERCEL=1`) or be set to `vercel`.

A step-by-step guide. Do the steps in order. Dashboards change their wording now and
then; if a button isn't exactly where described, look for the closest match.

**Before you start**

- Vercel **Hobby is for non-commercial use only.** Keep this a personal / hobby project,
  with no ads, payments or business use, or move to a paid plan.
- Everything below stays on free tiers and the default `*.vercel.app` domain.
- Commands are for **Git Bash** on Windows, run in the project folder.

---

## 1. Prepare the Supabase project

You use **one** Supabase project ("Online Clipboard") for both local development and
production. Migrations `001`–`004` are already applied there. Steps:

1. **Re-check the setup** (takes 2 minutes). In the **SQL Editor**, open each file in
   `db/` and run only its verification queries at the bottom (marked `-- expect:`), one at
   a time. Running a whole file again is also safe: they're all written to run twice.
   Must-haves:
   - `clips`, `rate_limits`, `download_usage`: **RLS enabled, 0 policies**.
   - Table grants: only **service_role** has privileges (no `anon`, `authenticated`, `PUBLIC`).
   - Function grants: `anon = false`, `authenticated = false`, `service_role = true`.
   - Bucket `clip-files`: **public = false**, `file_size_limit = 26214400`.
   - **Storage**: the `clip-files` bucket must NOT show a "Public" badge.
2. **Write down the region.** *Project Settings → General* (or the host name in the
   **Connect** dialog, e.g. `aws-0-ap-south-1`). You need it in step 3.
3. **Create a separate key for Vercel.** *Project Settings → API Keys → Secret keys →
   Create new secret key*, name it `vercel-production` (starts with `sb_secret_`).
   Your local `.env.local` keeps its own key. Two keys for one project means either can be
   revoked without breaking the other: if your laptop's key ever leaks, delete just that
   one and production keeps running. (Only "Legacy API keys" shown? Then both use the
   `service_role` key; rotating it would affect both.)
4. **Copy the Project URL**: *Project Settings → Data API* (or *API*), e.g.
   `https://abcd.supabase.co`. Only the base URL, no `/rest/v1`.

> Never reuse your local `CRON_SECRET` or `IP_HASH_SALT` in Vercel. Generate new ones (step 2).

### Living with one database for dev and production

From the moment the site is live, **your laptop talks to the production database**.
`npm run dev` on your machine reads and writes the same `clips` table and bucket as the
real site. That's fine for a hobby project if you keep these habits:

- **Don't experiment with SQL on this project.** No ad-hoc `delete`/`update`, no schema
  changes outside a new numbered `db/00X_*.sql` file that you've read first.
- **Test scripts are safe to run, but not for free.** They create and delete only their own
  clips, files and counters, and the egress test subtracts exactly what it added. While
  they run they briefly count toward the shared caps (`test:security` holds ~30 clips for a
  minute or two, out of `MAX_LIVE_CLIPS` 200), and a full round uses a few MB of real
  download allowance. Run them before launch, or at quiet times, and not on every change.
- **For checking the live site, prefer `npm run smoke:prod`.** It creates just two tiny clips.
- **`npm run fixtures:cleanup` and `test:collisions`** are fine any time; they're tiny.
- **If you later get a second project**, point `.env.local` at it, run `001`–`004` there,
  and you're back to separate dev/prod with no code changes.

---

## 2. Create the Vercel project

1. Push your latest code to GitHub (`git push`).
2. https://vercel.com/new → **Import Git Repository** → pick your repo → **Import**.
   Framework preset: **Next.js** (auto-detected). Leave build settings at their defaults.
3. Open **Environment Variables** (on the import screen, or later in *Project → Settings →
   Environment Variables*). Add every variable below. For each one, choose the
   **Production** environment only. (If you also tick *Preview*, preview deployments
   of other branches would write to your production database.) Turn on **Sensitive**
   for the secret ones, so nobody can read them back from the dashboard.

Generate fresh random values in Git Bash (run once per secret, use each output once):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Name | Secret? | Production value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | No (it's in the page's CSP anyway) | Project URL from step 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes, Sensitive** | the new `vercel-production` key from step 1.3 |
| `CRON_SECRET` | **Yes, Sensitive** | **new** random value (command above). You'll also put it in Supabase Vault in step 4. |
| `IP_HASH_SALT` | **Yes, Sensitive** | **new** random value (command above) |
| `ABUSE_CONTACT_EMAIL` | No (shown publicly on /contact) | an address you actually read, e.g. a dedicated Gmail |
| `CONTACT_EMAIL` | No (shown publicly on /contact) | optional general address; falls back to `ABUSE_CONTACT_EMAIL`. On a real domain the build fails unless one of them is set. |
| `SITE_URL` | No | your site's address, e.g. `https://<your-project>.vercel.app` (correct share previews; a temporary host is never indexed). Your real domain from Step 7 of `docs/growth-plan.md`. See `docs/seo.md`. |
| `ALLOW_INDEXING` | No | leave empty. `false` = never let search engines index the site (kill switch). |
| `LEGACY_HOSTS` | No | leave empty until the domain step. Comma-separated old host names (e.g. `online-clipboard-rose.vercel.app`) whose pages redirect to `SITE_URL` once it is a real domain. See `docs/launch-day-netlify.md`. |
| `HOSTING_PROVIDER` | No on Vercel (auto-detected) | `vercel`. Decides which header carries the real visitor IP for rate limiting. **Required on Netlify** (`netlify`). |
| `ADS_ENABLED` | No | leave empty until Growth Step 9. `true` shows ads on guide pages only, and only on an indexable real domain. See `docs/ads-plan.md`. |
| `ADSENSE_CLIENT_ID` | No | leave empty until Step 9. `ca-pub-` + 16 digits. On a real domain it adds the AdSense verification meta tag and `/ads.txt`. |
| `ADSENSE_SLOT_GUIDE_AFTER_INTRO`, `ADSENSE_SLOT_GUIDE_BEFORE_RELATED`, `ADSENSE_SLOT_GUIDES_HUB` | No | leave empty until Step 9. Numeric ad unit IDs from AdSense. |
| `CLIP_EXPIRY_MINUTES` | No | `30` |
| `MAX_FILE_SIZE_MB` | No | `25` (must not exceed the bucket limit of 25 MB) |
| `MAX_LIVE_CLIPS` | No | `200` |
| `MAX_TOTAL_STORAGE_MB` | No | `800` (free storage is 1 GB) |
| `MAX_MONTHLY_DOWNLOAD_MB` | No | `4000` (free egress is 5 GB/month) |
| `RATE_LIMIT_LOOKUP_FAILURES` | No | `10` (see step 7 before changing) |

Optional, defaults are fine: `RATE_LIMIT_WINDOW_SECONDS` (600), `RATE_LIMIT_CREATES` (20),
`RATE_LIMIT_FILE_CREATES` (5), `RATE_LIMIT_FILE_OPS` (30), `RATE_LIMIT_HEALTH` (30).

4. Click **Deploy**. When it's done, open `https://<your-project>.vercel.app/api/health`.
   It must show `{"ok":true}`.
   - `{"ok":false}`: open *Project → Logs*, filter for `[health]`. The real reason is
     logged there (usually a wrong URL or key, or a migration that wasn't run).
5. **Any time you change an environment variable**, redeploy: *Deployments* → latest →
   **⋯ → Redeploy**. Variables are read when the app is built and started.

---

## 3. Put the Vercel functions next to the database

Every request goes Vercel function → Supabase, often 3-5 times. If they're on different
continents, each trip adds ~150-250 ms.

1. **Supabase region:** *Project Settings → General* shows the region. Or click
   **Connect** on the project page: the host name contains it, e.g. `aws-0-ap-south-1`.
2. **Vercel region:** *Project → Settings → Functions → Function Region*. Pick the match:

   | Supabase (AWS) region | Vercel region |
   |---|---|
   | `ap-south-1` Mumbai | `bom1` Mumbai |
   | `ap-southeast-1` Singapore | `sin1` Singapore |
   | `us-east-1` N. Virginia | `iad1` Washington, D.C. (Vercel's default) |
   | `eu-central-1` Frankfurt | `fra1` Frankfurt |
   | `eu-west-2` London | `lhr1` London |

3. **Save**, then **Redeploy** (step 2.5).
4. Check: open the latest deployment → **Functions** (or *Logs*, click a request). It shows
   the region the function ran in.

---

## 4. Schedule the clean-up job

Follow **`docs/cleanup-scheduling.md`** in your Supabase project:

1. **Integrations → Cron → Enable**, and **Database → Extensions → `pg_net` → Enable**.
2. **Integrations → Vault → Add new secret**, twice:
   - `cron_secret` = the same `CRON_SECRET` you set in Vercel
   - `cleanup_url` = `https://<your-project>.vercel.app/api/cron/cleanup`
3. **SQL Editor:** run the `cron.schedule('cleanup-expired-clips', '*/10 * * * *', …)`
   block from section 3 of that doc.

**Confirm it runs** (wait ~15 minutes, then in the SQL Editor):

```sql
-- the job fired: status 'succeeded'
select status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'cleanup-expired-clips')
order by start_time desc limit 5;

-- the endpoint answered: status_code 200 and a JSON body with totals
select status_code, content, created from net._http_response order by created desc limit 5;
```

`status_code 401` means the Vault `cron_secret` doesn't match Vercel's `CRON_SECRET`.

**Confirm clips and files really disappear:**

1. On the live site, send a small text clip **and** a small file clip. Note the codes.
2. In the SQL Editor:
   ```sql
   select code, file_path, expires_at from clips order by created_at desc limit 5;
   ```
   Both rows are there. The file is visible under *Storage → clip-files*.
3. About 45 minutes later (30-minute expiry + up to 10 minutes until the job runs), run the
   query again. Both rows are gone, and the file is gone from *Storage → clip-files*.
4. Health check for the job at any time. This should stay at (or near) 0:
   ```sql
   select count(*) as expired_but_not_deleted from clips where expires_at < now() - interval '15 minutes';
   ```

---

## 5. Optional: free uptime monitor (also helps against auto-pause)

Free Supabase projects are **paused after about a week of inactivity**. A monitor that
calls `/api/health` every 5 minutes keeps traffic flowing (it queries the database and
storage) and emails you when the site is down.

1. Create a free account at https://uptimerobot.com (or a similar free monitor; check its
   free-plan terms).
2. **New monitor → HTTP(s)**. URL: `https://<your-project>.vercel.app/api/health`.
   Interval: **5 minutes**. Optionally add a keyword check for `"ok":true`.
3. **Stay under the health rate limit:** `/api/health` allows 30 requests per 10 minutes
   **per IP**. One check every 5 minutes is 2 per 10 minutes, far below the limit. Don't
   set intervals under 1 minute, and don't run many monitors from the same machine.
   If a monitor sees `429`, it is polling too often.
4. **Verify that it really prevents pausing.** Supabase decides what counts as "activity",
   and the rule can change. Check Supabase's current docs on project pausing, and look at
   the dashboard after 8-10 days: the project must still be **Active**, not *Paused*. If it
   pauses anyway: *Dashboard → project → Restore*. Your data is kept.

The clean-up job (pg_cron) runs inside the database. Don't rely on it alone to count as
activity.

---

## 6. What to watch

| Where | What | Free limit | What happens at the limit |
|---|---|---|---|
| Supabase → *Organization → Usage* | **Storage size** | 1 GB | Supabase restricts the project until usage drops or you upgrade. The app stops at `MAX_TOTAL_STORAGE_MB` (800) first: new file clips get "service is full". |
| Supabase → *Usage* | **Egress** (data out) | 5 GB / month | Same kind of restriction. The app pauses **file downloads** at `MAX_MONTHLY_DOWNLOAD_MB` (4000) until the 1st of next month (UTC). Text keeps working. |
| Supabase → *Usage* | **Database size** | 500 MB | Database may become read-only. Unlikely: 200 clips × 100 KB text is ~20 MB, and old rate-limit rows are deleted every 10 minutes. |
| Supabase → *Table Editor → download_usage* | MB handed out this month | your own setting | `select month, round(bytes/1048576.0) as mb from download_usage order by month desc;` |
| Vercel → *Usage* (account/team) | Function invocations, duration, data transfer | see https://vercel.com/docs/limits | On Hobby, Vercel may pause the project until the next cycle. |
| Vercel → *Project → Logs* | `[capacity]`, `[egress]`, `[rateLimit]`, `[cron/cleanup]` lines | — | Warnings tell you when caps are being hit. |

Supabase emails the organization owner as limits get close. Make sure that email reaches you.

---

## 7. Before sharing the URL publicly

- [ ] **Terms reviewed.** `/terms` is a template (see the comment at the top of
      `app/terms/page.tsx`). Read it, adapt it, ideally get it checked.
- [ ] **`ABUSE_CONTACT_EMAIL` (or `CONTACT_EMAIL`) set**, and `/contact` shows it (not the yellow note).
- [ ] **Every `[[ADD: …]]` placeholder replaced** (About, Terms, Privacy). `npm run check:placeholders` lists them; a build on a real domain fails while any remain.
- [ ] **Secrets set in Vercel and fresh**: `SUPABASE_SERVICE_ROLE_KEY` (a production key),
      `CRON_SECRET` (same value in Vault), `IP_HASH_SALT`. `npm run scan:secrets` passes.
- [ ] **`npm run smoke:prod -- https://<your-project>.vercel.app` passes**, including the
      **IP spoofing check**. That check proves nobody can bypass the rate limit by faking
      `X-Forwarded-For`. It locks your own IP out of lookups for 10 minutes.
- [ ] **Clean-up job confirmed** (step 4).
- [ ] **Tested on real phones**, ideally one Android + one iPhone, on mobile data and on Wi-Fi:
      send text, send a file, receive by typing, receive by link, download, copy buttons.
- [ ] **Limits tuned.** Read this about the failed-lookup limit:

  **Shared IPs.** Mobile networks in India (Jio, Airtel, Vi) put many customers behind
  the same public IP (carrier-grade NAT). Colleges and offices do too. The failed-lookup
  limit (10 per 10 minutes) is **per IP**, so strangers on the same carrier IP share
  one budget. If real users report "Too many attempts" without having mistyped much,
  loosen it: in Vercel set `RATE_LIMIT_LOOKUP_FAILURES=30` (and maybe
  `RATE_LIMIT_CREATES=40`), then redeploy.

  **The trade-off.** Codes are 6 digits (1,000,000 possibilities). With `L` failed
  guesses allowed per 10 minutes and `N` live clips, one attacker IP finds about
  `L × 144 × N / 1,000,000` clips per day. With the defaults (L = 10, N = 200) that's
  about **0.3 per day per IP**; with L = 30, about 0.9. That's why the UI and terms tell
  people not to share sensitive data. Shorter expiry and a lower `MAX_LIVE_CLIPS` also
  reduce it.

---

## 8. Rollback

**Code:** Vercel → *Project → Deployments* → find the last good deployment → **⋯ →
Promote to Production** (or **Instant Rollback** on the production deployment). It
takes seconds. Then fix the bug in git and push; the next push deploys normally.

**Environment variables:** change them back in *Settings → Environment Variables*, then
redeploy.

**Ads:** set `ADS_ENABLED=false` (or delete it) and redeploy. Details in `docs/ads-plan.md` §8.

**Database:** rollbacks don't undo SQL. The migrations only ever add things, and the old
code ignores the extra tables, functions and columns. So rolling the code back one step
is safe without touching the database.

---

## If a secret was committed

`npm run scan:secrets` searches every commit. If it reports something:

1. **Rotate first.** Removing a secret from git doesn't un-leak it.
   - Supabase key: *Project Settings → API Keys* → create a new secret key → update it
     in Vercel → redeploy → **delete the old key**.
   - `CRON_SECRET`: new value in Vercel **and** in Supabase Vault (`cron_secret`) → redeploy.
   - `IP_HASH_SALT`: new value in Vercel → redeploy (rate-limit counters just restart).
2. **Then clean history** (optional once rotated): install `git filter-repo`, remove the
   file or replace the value, and `git push --force` to every branch. Anyone with a clone
   still has the old copy, and GitHub may keep cached views. Rotation is what actually
   protects you.
