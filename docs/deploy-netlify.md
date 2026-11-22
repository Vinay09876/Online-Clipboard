# Deploying on Netlify (Free plan), next to Vercel

Growth Step 5. Goal: the same app, same Supabase project, running on Netlify's free plan,
while the Vercel deployment **stays live and unchanged** until the domain step (Step 7).
Both deployments use the same database, so clips created on one can be opened on the other.

Why move at all: Vercel's Hobby plan is for non-commercial use only, and the site will show
ads later (Step 9). Netlify's Free plan has no such restriction.

What you do by hand is marked **YOU**. Menu names are from Netlify's docs as of November
2026; if a label differs slightly on screen, look for the closest match.

---

## 0. Facts that shape this setup (checked 2026-11-21)

| Topic | What Netlify does | What it means here |
|---|---|---|
| Next.js | Netlify's OpenNext adapter (`@netlify/plugin-nextjs`) is installed automatically, supports Next.js 13.5+, and lists App Router, route handlers, `after()`, Cache Components, rewrites and middleware as fully supported. | No adapter in `package.json`, no pinning (Netlify recommends not pinning). |
| `proxy.ts` (middleware) | Runs as a Netlify **Edge Function** (Deno), not plain Node. No filesystem, no C++ add-ons. | `proxy.ts` and everything it imports now use only web-standard APIs (no `Buffer`, no `node:net`). A test enforces it. |
| Function limits | 60 s synchronous limit (fixed), 1024 MB memory (Free plan can't change it). | The clean-up job budgets ~20 s (`lib/cleanupJob.ts`), so it fits Vercel's 30 s and Netlify's 60 s. |
| Function region | New projects run in **`cmh`, US East (Ohio)**. Changing the region is a **Pro/Enterprise** feature. | Your Supabase is in **Mumbai**, so each database call travels Ohio ↔ Mumbai. See §8. |
| Client IP | Netlify sets `x-nf-client-connection-ip` (the header Netlify support names as the supported one). Netlify does not document overwriting `X-Forwarded-For`. | `HOSTING_PROVIDER=netlify` reads only `x-nf-client-connection-ip` and ignores the rest. The smoke test proves it can't be faked (§5). |
| Page caching | Netlify's CDN does not cache dynamic responses unless told to (`Netlify-CDN-Cache-Control`). | Pages also send `Netlify-CDN-Cache-Control: no-store` and `CDN-Cache-Control: no-store`, so a nonce is never reused. Tested locally and by the smoke test. |
| Credits | Free = 300 credits/month, hard limit. Production deploy 15, compute 10 per GB-hour, bandwidth 20 per GB, 2 per 10,000 requests. Deploy Previews and branch deploys 0. | §7. Every push to `main` costs 15 credits. |

Sources: [Next.js on Netlify](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/),
[Functions configuration](https://docs.netlify.com/build/functions/configuration/),
[Functions API (`context.ip`)](https://docs.netlify.com/build/functions/api/),
[Credit-based plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/),
[Caching](https://docs.netlify.com/build/caching/caching-overview/),
[Ignore builds](https://docs.netlify.com/build/configure-builds/ignore-builds/),
[Stop builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/),
[Netlify support on the client-IP header](https://answers.netlify.com/t/is-the-client-ip-header-going-to-be-supported-long-term/11203).

---

## 1. Before you start (YOU, 5 minutes)

1. Make sure the Step 5 commit is **pushed to GitHub** (`main`). Netlify builds from GitHub.
2. Have these at hand (copy them into a private note, never into chat or a public place):
   - From **Vercel → your project → Settings → Environment Variables**: click each variable
     to reveal its value. You need the values listed in §3.
   - Or from your local `.env.local` (same values, if you used the same ones on Vercel).
3. Check your **Vercel region** while you're there: **Settings → Functions → Function
   Region** should be **Mumbai (`bom1`)**, next to your Supabase (`ap-south-1`). That's what
   `docs/deploy.md` §3 set up. Note what it says; you'll compare speeds later.

## 2. Import the repository (YOU)

1. Log in at **app.netlify.com**.
2. **Add new project** (button, top right of the Projects list) → **Import an existing project**.
3. **Deploy with GitHub** → authorise Netlify if asked → choose **only this repository** when
   GitHub asks which repositories Netlify may access.
4. Pick the **online-clipboard** repository.
5. On the configuration screen:
   - **Branch to deploy:** `main`
   - **Base directory:** leave empty
   - **Build command:** `npm run build` (pre-filled from `netlify.toml`)
   - **Publish directory:** `.next` (pre-filled from `netlify.toml`)
   - **Project name:** e.g. `online-clipboard-<something>`. It becomes
     `https://<project-name>.netlify.app`. Write the full URL down.
6. **Don't click Deploy yet.** Click **Add environment variables** on this screen (or, if
   the screen doesn't offer it, deploy once, let it fail or succeed, then do §3 and redeploy).

## 3. Environment variables (YOU)

Where: on the import screen (**Add environment variables**), or later in **Project
configuration → Environment variables → Add a variable → Add a single variable**.
For each one: keep **Scopes: All scopes** and the **same value for all deploy contexts**.
Secrets: if Netlify offers **"Contains secret values"**, tick it (it may need a paid plan; the
value stays private either way, it just isn't masked as strictly).

| Variable | Value | Secret? | Copy from |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` | no | Vercel, or Supabase → Project Settings → Data API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | the service role key | **YES** | Vercel, or Supabase → Project Settings → API Keys → `service_role` (secret) |
| `CRON_SECRET` | same as on Vercel | **YES** | Vercel (must match the Vault secret `cron_secret`, §6) |
| `IP_HASH_SALT` | same as on Vercel | **YES** | Vercel. Same value → one visitor has one counter, whichever host they use |
| `HOSTING_PROVIDER` | `netlify` | no | type it. **Required**: it tells rate limiting which IP header to trust |
| `SITE_URL` | `https://<project-name>.netlify.app` | no | the URL from §2.5. A temporary host, so the site stays **noindex** |
| `ALLOW_INDEXING` | leave **unset** | no | (`false` = kill switch; not needed on a temporary host) |
| `ABUSE_CONTACT_EMAIL` | same as on Vercel | no (public) | Vercel |
| `CONTACT_EMAIL` | same as on Vercel, if set | no (public) | Vercel |
| `CLIP_EXPIRY_MINUTES` | same as on Vercel (e.g. `30`) | no | Vercel |
| `MAX_FILE_SIZE_MB` | same as on Vercel (e.g. `25`) | no | Vercel |
| `MAX_LIVE_CLIPS` | same as on Vercel (e.g. `200`) | no | Vercel. Global caps: **must match**, both hosts share one database |
| `MAX_TOTAL_STORAGE_MB` | same as on Vercel (e.g. `800`) | no | Vercel |
| `MAX_MONTHLY_DOWNLOAD_MB` | same as on Vercel (e.g. `4000`) | no | Vercel |
| `RATE_LIMIT_*` | only if you set any on Vercel; otherwise leave unset | no | Vercel |

Do **not** add: `ADS_ENABLED`, `ADSENSE_*` (Step 9), any `VERCEL_*` variable, or
`NODE_VERSION` (it's in `netlify.toml`). Don't use "Import from a .env file" with a file pulled
from Vercel: it would bring Vercel's own variables along.

## 4. Deploy (YOU)

1. Click **Deploy** (import screen) or **Deploys → Trigger deploy → Deploy project**.
2. Watch the log (**Deploys → the running deploy**). It takes a few minutes. A good build shows:
   - `Placeholder check: … Indexing is off (… is a temporary host) …` (the guard passes)
   - `@netlify/plugin-nextjs` being used. Note its version: it must be **5.16.6 or newer**
     (Netlify's November 2026 Next.js security note).
   - **Deploy succeeded** / **Published**.
3. If the build fails, copy the last ~40 lines of the log and send them to me (they contain no
   secrets unless you printed some).

## 5. Verify (YOU run one command, ~2 minutes)

From the project folder in Git Bash:

```bash
npm run smoke:prod -- https://<project-name>.netlify.app
```

It must end with **ALL PASSED**. It checks health, a text clip, a file clip (direct upload to
Supabase and back), security headers and CSP, a fresh nonce per request (no CDN caching),
noindex on the temporary host, that the proxy sees the same settings as the pages, unknown
guides → 404, `/ads.txt` → 404, and finally the **IP-spoofing check** (it sends 11+ failed
lookups, each with different fake `X-Forwarded-For`, `X-Real-IP`,
`X-Nf-Client-Connection-Ip`, `Client-IP`, … headers; they must still hit the limit).

The spoofing check locks **your own IP** out of code lookups for up to 10 minutes. Sending
clips still works.

Then run it once against Vercel too (wait 10 minutes after the first run, or add
`--skip-spoof-test`), and compare the **Response times** block at the end:

```bash
npm run smoke:prod -- https://online-clipboard-rose.vercel.app --skip-spoof-test
```

Also click through the site in a browser (home, send a text, open it on your phone, a guide,
the dark theme). Open DevTools (F12) → Console on a few pages: there must be no red CSP errors.

**If the spoofing check FAILS on Netlify:** don't switch to Netlify. Check `HOSTING_PROVIDER`
is exactly `netlify` and redeploy. If it still fails, tell me: it would mean Netlify passes a
client-supplied `x-nf-client-connection-ip` through, and we need another approach.

**If "proxy and page agree on indexing" FAILS:** the proxy (an Edge Function) can't read
`SITE_URL`. Check the variable's scopes are **All scopes**, redeploy, and tell me if it persists.
(On a temporary host it's harmless today, but on the real domain it would de-index the site.)

## 6. The clean-up job (YOU, in Supabase, ~5 minutes)

The job lives in Supabase (`docs/cleanup-scheduling.md`) and calls ONE URL stored in Vault.
While both hosts are live, keep the Vercel job as it is and **add a second job for Netlify**,
offset by 5 minutes so the two never run at the same moment. (Running both is safe: the clean-up
is idempotent. It just does the work twice.)

1. Supabase → **Integrations → Vault → Secrets → Add new secret**:
   - Name `cleanup_url_netlify`, value `https://<project-name>.netlify.app/api/cron/cleanup`
2. Supabase → **SQL Editor**, run:

```sql
select cron.schedule(
  'cleanup-expired-clips-netlify',
  '5-59/10 * * * *',                -- every 10 minutes, at :05, :15, :25, …
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_url_netlify'),
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
```

3. **Verify** after ~15 minutes:

```sql
select j.jobname, d.status, d.start_time
from cron.job_run_details d join cron.job j using (jobid)
where j.jobname like 'cleanup-expired-clips%'
order by d.start_time desc limit 6;

select status_code, left(content, 200) as body, error_msg, created
from net._http_response order by created desc limit 6;
```

   Expect `succeeded` for both jobs and `status_code` 200 with a JSON body such as
   `{"deletedClips":0,…,"sweepSkipped":false}`. `401` = the Netlify `CRON_SECRET` doesn't
   match Vault's `cron_secret`. On Netlify you can also see the calls in **Logs → Functions**.

4. **Later, when you switch for good** (Step 7): point the original job at Netlify and remove
   the extra one:

```sql
-- after updating the Vault secret 'cleanup_url' to the Netlify (or domain) URL:
select cron.unschedule('cleanup-expired-clips-netlify');
```

   **To stop the Netlify job** at any time: `select cron.unschedule('cleanup-expired-clips-netlify');`

## 7. Credits: watch them, don't waste them

**Where to look:** Netlify → your **team** (top-left) → **Usage & billing** (or **Billing →
Usage**). It shows credits used this cycle by category, and the reset date. Netlify emails you
at 50 %, 75 % and 100 %.

**When they run out:** **every project on the account is paused** and visitors see "Site not
available" until the next billing cycle. On the Free plan you can only wait or upgrade (no
top-ups). Vercel keeps working, which is why it stays live until the domain step.

**Rough monthly budget for this app** (Netlify rates above; 1 GB function memory):

| Item | Estimate | Credits |
|---|---|---|
| Clean-up job: 4,320 calls × ~1-2 s (Ohio ↔ Mumbai) | ~1.2-2.4 GB-hours | 12-24 |
| Production deploys | 15 each | **10 deploys = 150** |
| Visitors: 1,000 page views (~15 requests, ~300 KB, ~0.3 s server time each) | 15k requests, 0.3 GB, 0.1 GB-h | ~10 |
| File transfers | go directly between the browser and Supabase | 0 |

Deploys are the big one. To keep them down:

1. **Push less often to `main`.** Commit as much as you like locally; push when a step is
   reviewed. Each push = one production deploy = 15 credits, on Netlify **and** a deploy on
   Vercel.
2. **Docs-only pushes don't build:** `netlify.toml` has an `ignore` command that skips the
   build when only `docs/` or `*.md` files changed.
3. **Only `main` deploys:** **Project configuration → Developer settings → Branches and deploy
   contexts → Configure** → **Branch deploys: None** ("Deploy only the production branch") and
   **Deploy Previews: None** → **Save**.
4. **Pause automatic builds while Vercel is the live site** (see "Pausing Netlify" below).
5. **Rollbacks are free:** publishing an older deploy (§9) costs no credits.
6. Don't add a second uptime monitor for Netlify until it is the main host.

### Pausing Netlify while Vercel is live (saves credits)

From Netlify's [Stop or activate builds](https://docs.netlify.com/build/configure-builds/stop-or-activate-builds/)
page (checked 2026-11-22):

**Pause (YOU):**
1. Netlify → your project → **Project configuration → Developer settings → Continuous
   deployment → Build settings → Configure**.
2. **Build status: Stopped builds** → **Save**.

While stopped, Netlify **never builds**: not on pushes, build hooks, API requests or the
"Trigger deploy" button. The last published deploy **keeps serving**
`online-clipboard-tool.netlify.app`, so it still works but no longer gets updates.

3. Also pause the Netlify clean-up job, which is the other steady credit cost (about 12-24
   credits a month). In Supabase → SQL Editor:
   ```sql
   select cron.unschedule('cleanup-expired-clips-netlify');
   ```
   (The Vercel job keeps cleaning the shared database, so nothing piles up.)

**Resume (YOU):**
1. Same place → **Build status: Active builds** → **Save** (or the **Activate builds**
   button on the project overview or Deploys page). Netlify does **not** build right away.
2. **Deploys → Trigger deploy → Deploy project** to bring Netlify up to date with `main`.
   That costs 15 credits.
3. Re-create the clean-up job with the SQL in §6 (step 2), if you want it.

**Lighter alternative:** **Deploys → Lock to stop auto publishing**. Netlify still *builds*
every push, but doesn't publish it. Netlify's docs don't say whether those unpublished builds
count as production deploys for credits. Use **Stopped
builds** to save credits.

## 8. Region and speed (Free plan: Ohio)

Netlify Free runs functions in **US East (Ohio)** and the region can't be changed without Pro.
Your Supabase is in **Mumbai**. Every page or API call that touches the database makes
several Ohio ↔ Mumbai round trips (~200-250 ms each), so creating a clip on Netlify will
likely take **~1-1.5 s** instead of ~0.3-0.5 s on Vercel (Mumbai ↔ Mumbai). Pages that don't
touch the database (home, guides) are not affected much.

What to do:
1. **Now:** measure with the smoke test against both hosts (§5) and send me the two
   "Response times" blocks.
2. **Decide at the domain step**, based on where visitors come from (Search Console will tell
   you by then):
   - Mostly India: Netlify Free can't put functions near Mumbai. Accept the slower creates,
     or pay for Netlify Pro (region `bom`/Mumbai, if offered then), or choose another host.
   - Mostly US/Europe or mixed (likely for an English site): move the database next to
     Netlify instead: a new free Supabase project in **us-east-2 (Ohio)**, run the SQL
     migrations, recreate the bucket and cron job, switch the env vars. Clips expire in
     minutes, so nothing needs migrating. That's a separate step; don't do it now.

## 9. Rollback

- **Vercel is untouched** and stays the live site until Step 7. Nothing to roll back there.
- **A bad Netlify deploy:** **Deploys** → click the last good deploy → **Publish deploy**. Instant,
  no credits.
- **Stop Netlify completely:** stop builds (§7.4), unschedule the Netlify cron job (§6), and
  optionally **Project configuration → General → Danger zone → Delete project**.
- **Code:** the Step 5 changes keep Vercel working (Vercel is detected automatically via
  `VERCEL=1`). If something misbehaves on Vercel, revert the commit and push, or roll back
  in Vercel (`docs/deploy.md` §8).
