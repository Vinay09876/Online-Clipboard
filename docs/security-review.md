# Security and abuse review (Growth Step 7b, 2026-11-23)

Scope: the live architecture as verified on 2026-11-23: Netlify Free (functions in Ohio) with
vinaycode.com on Netlify DNS, still `noindex` (SITE_URL = the netlify.app address); Vercel as
fallback; Supabase in Mumbai with `db/005` applied; ads off; no analytics.

## Findings

| # | Severity | Where | Finding | Why it matters | Done |
|---|---|---|---|---|---|
| F1 | **High** (availability) | every `/api/*` route on Netlify | A request flood (even one that only gets 429s) runs a function that waits ~0.7 s on the database. ~100-150k requests can use the month's 300 credits, and then **every project on the Netlify account pauses** until the next cycle | Anyone can take the site offline for weeks; indexing makes the site easier to find | **Partly fixed:** a client that is already refused now gets its 429 from memory, without a database trip (`lib/rateLimit.ts` remembered blocks; test). **Full fix needs an edge rule: Decision D2** |
| F2 | Medium | code guessing (all lookup endpoints) | 6-digit codes + 10 failures per 10 min per IP (IPv6 per /64). Fine against one attacker; weak against many IPs, especially IPv6 ranges (a /48 = 65,536 buckets) | Someone could read other people's clips while they're live | Quantified below; **Decision D1** |
| F3 | Low | 3 API routes | Error logs included the clip code (`[GET /api/clips/123456]`) | The code is the clip's key while it's live; logs are visible to the host | **Fixed** (codes removed; test checks all API log lines) |
| F4 | Low (monitoring) | clean-up schedule | If the schedule stops (unscheduled job, wrong secret, app or Supabase down), expired clips stay stored (never served) and nobody notices | Privacy promise ("deleted after expiry") silently breaks | **Fixed:** `GET /api/health/cleanup` → 503 `{"cleanup":"behind"}` when an expired clip is 30+ min overdue; add a free monitor (below) |
| F5 | Low, accepted | `POST /api/clips/[code]/complete` | Answers 409 for a not-ready file clip and 404 for unknown codes | Reveals that a pending upload exists. A guesser gains nothing over `GET` (both count against the same failed-lookup limit, and `GET` reveals more once ready); the creator's page needs the 409 | Documented; test pins the behaviour |
| F6 | Low, accepted | Supabase signed upload URLs | Valid for 2 hours (Supabase's fixed lifetime), longer than a clip lives | After expiry an upload to that path creates an orphan, which the sweep deletes; it can never be downloaded (no row, no download link) | None needed |
| F7 | Info | HSTS | Netlify already sends `Strict-Transport-Security: max-age=31536000` on its custom domains (verified). Our proxy adds `max-age=63072000` after the flip | Harmless (both mean "https only"); browsers use one | Noted; Decision D6 |

### Checked and fine (with evidence)

| Area | Result |
|---|---|
| Nonexistent vs expired vs not-ready code | **Identical** status (404), body and headers on `GET /api/clips/[code]` and `/download`; timing medians within noise when interleaved (e.g. 178 / 170 / 131 ms and 103 / 102 / 129 ms). Same single SQL query for all three. Test: `e2e/abuse.spec.ts` |
| Rate-limited response | 429 + generic body + `Retry-After`, same for every client; says nothing about codes |
| Caching | Every API response `Cache-Control: no-store` (`lib/http.ts`); pages `private, no-store` + CDN no-store |
| Code generator | `crypto.randomInt(0, 1_000_000)` (cryptographically secure), unique constraint in the database, collision retry (test:collisions); concurrent creates of the same code → one unique violation → retry |
| Service key in the browser | Scanned `.next/static` for the service key, IP salt and cron secret values and for key-like patterns: **0 hits**; the home page HTML too (test) |
| Logs | No log line contains codes, text, file names or IPs; database errors log code + message only, never PostgREST `details` (which can echo row data). Test |
| Files | See "Files" below |
| Error messages when limits hit | See "Graceful degradation" below |

### Routes reviewed

| Route | Who can call | Checks | IDOR? |
|---|---|---|---|
| `POST /api/clips` | anyone | per-IP create + file-create limits, body ≤ 1 MB, JSON, text ≤ 100,000 chars, file name/size validated, global caps; storage key = new random uuid | none: the client never names a row or path |
| `GET /api/clips/[code]` | anyone with the code | 6-digit format, failed-lookup limit, live + ready only; returns an allow-list (no id/path/ready) | the code *is* the credential (by design) |
| `POST /api/clips/[code]/complete` | anyone with the code | failed-lookup + per-IP limit; checks the real object size; can only mark ready (or delete if oversized) | worst case a guesser marks someone's pending upload ready early: harmless |
| `GET /api/clips/[code]/download` | anyone with the code | failed-lookup + per-IP limit, ready + live + has file, monthly budget; 60 s signed URL for that one object | path comes from the row, never from the client |
| `GET /api/health`, `/api/health/cleanup` | anyone | per-IP limit; answers yes/no only | n/a |
| `POST /api/cron/cleanup` | holder of `CRON_SECRET` | constant-time bearer check, fails closed if unset | n/a |
| Supabase tables/functions | service role only | RLS on with no policies, anon/authenticated revoked (verified when each migration was applied; re-check below) | the browser never talks to Supabase with a key |
| Storage bucket `clip-files` | private; signed URLs only | upload URL for exactly `<clip uuid>`, no overwrite; download URL 60 s | n/a |

**Re-check RLS and grants yourself (read-only, changes nothing).** Supabase → SQL Editor:
```sql
-- expect: every table rls = true, policies = 0, anon/auth = false
select c.relname as table, c.relrowsecurity as rls,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as policies,
       has_table_privilege('anon', c.oid, 'select') as anon, has_table_privilege('authenticated', c.oid, 'select') as auth
from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'r';
-- expect: anon = false for every function
select p.proname, has_function_privilege('anon', p.oid, 'execute') as anon
from pg_proc p where p.pronamespace = 'public'::regnamespace order by 1;
-- expect: public = false, file_size_limit = 26214400
select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'clip-files';
-- expect: no policy that lets anon read clip-files
select policyname, roles, cmd from pg_policies where schemaname = 'storage';
```

## 1. Code guessing, quantified

- Space: 1,000,000 codes. Live clips L ≤ `MAX_LIVE_CLIPS` = 200 (realistically 0-20 at first).
- One limit bucket (an IPv4 address or an IPv6 /64): 10 failed lookups per 10 minutes = **1,440 guesses/day**.
  `complete` and `download` failures count against the same bucket, so there's no side door.
- Chance per guess = L / 1,000,000.

| Attacker | Guesses/day | Expected clips found/day at L=20 | at L=200 |
|---|---|---|---|
| 1 IP | 1,440 | 0.03 | 0.29 |
| 256 buckets (an IPv6 /56, or 256 proxies) | 369,000 | 7 | 74 |
| 65,536 buckets (an IPv6 /48, cheap on some VPS hosts) | 94 million | **every live clip, within minutes** | every live clip |

Targeting *one specific* clip within its 30 minutes needs ~500,000 guesses on average ≈ 17,000
buckets. Untargeted fishing is the realistic threat. The site already tells people not to share
sensitive data, and clips last 30 minutes; the question is how much harder to make it.

## Decisions for me

**D1. Make code guessing harder** (needs `db/006` + code; nothing implemented)

| Option | Effect | Cost for users | Compatibility |
|---|---|---|---|
| a) Group IPv6 by **/56** instead of /64 | a /48 attacker drops from 65,536 to 256 buckets (×256 harder) | a few unrelated users on the same /56 could share a limit (rare: 10 failures/10 min is generous) | no change for links or codes |
| b) **Global failed-lookup ceiling**: when the whole site sees more than ~300 failed lookups in 10 min (normal traffic is far below), the per-IP allowance drops from 10 to 3 for the rest of that window | caps a many-IP attacker's yield to ~3 per bucket per window; normal users unaffected unless they mistype during an attack | someone mistyping 4 times during an attack waits until the window resets | none |
| c) **Long tokens in share links**: links become `/#t=<22 random characters>` (128 bits); the 6-digit code stays for typing; old `/#123456` links keep working | links can't be guessed; typed codes unchanged | none | fully compatible |
| d) 8-digit codes | ×100 harder for everything | 2 more digits to type | 6-digit codes expire within 30 min, so a switch is clean |

**Recommendation: a + b now** (one small migration, invisible to normal users), **c later** if
you want links to be unguessable; skip d unless abuse shows up in practice.

**D2. Edge rate limit on Netlify (fixes F1)**: Netlify's free plan allows **2 code-based rate-limit
rules** in `netlify.toml`, enforced at the edge before any function runs
([docs](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)). Proposal: one
rule on `/api/*`, e.g. **60 requests per minute per IP**. A normal visit uses ~2-6 API calls; the
uptime monitors 4 per hour. Over the limit, Netlify answers 429 itself (its own page, not our JSON;
the app already shows "Too many attempts" for any 429). Trade-offs: needs a real-deploy test (it
interacts with Netlify's Next.js adapter), costs one production deploy (15 credits); it limits
per IP, so it doesn't stop a many-IP flood, but makes floods from one source nearly free.
**Recommendation: yes, before the flip.** I'll write the rule and a smoke-test check after your OK.

**D3. Executable or script files**: what can and can't be enforced:

| Control | Status |
|---|---|
| Size limit | **Enforced** by the bucket (25 MB) and again on `complete` (real size) |
| File name | **Sanitised** server-side (no paths, control characters or bidi tricks); storage key is a uuid |
| Served as download | **Enforced**: `Content-Disposition: attachment` with the original name |
| Rendering in the browser | **Can't happen**: Supabase serves even HTML as `text/plain` with `nosniff` (verified), from `*.supabase.co`, never our domain, so a file can't run script on vinaycode.com |
| Content / MIME type | **Can't be enforced** by us: the browser uploads straight to Supabase. The bucket's `allowed_mime_types` only checks the *declared* type, which the uploader chooses |
| Malware scanning | **Not possible** for free: the server never sees the bytes |

Options: (i) leave as is; (ii) **a warning on the receiver's side** for risky extensions
(`.exe .msi .bat .cmd .ps1 .vbs .js .jar .apk .scr .com .dll .sh`): "This is a program or
script. Only open it if you trust the sender." (iii) block those extensions at create time:
trivially bypassed by renaming or zipping, and it frustrates legitimate users (our own guide
covers sending code and logs). **Recommendation: (ii)**, no blocking.

**D4. "Delete now" button**: design below; needs `db/006` + code + copy changes (Terms, Privacy,
FAQ and a guide currently say "there is no early-delete button"). **Recommendation: yes**, it's a
real privacy improvement.

**D5. Analytics: report only.** Recommendation: **wait until Step 9**. Details below.

**D6. HSTS duplicate after the flip** (F7): keep ours (harmless and also covers the Vercel
fallback) or remove it on Netlify. **Recommendation: keep.**

## 4. Files: see D3 (above)

## 5. Clean-up reliability and alerting

Failure modes and what happens:

| Failure | Effect | Recovery |
|---|---|---|
| Storage delete fails for a batch | those rows are kept | retried next run (10 min) |
| Row delete fails after files are gone | expired rows remain (never served) | next run: removing already-missing files succeeds, rows deleted |
| Two jobs or two runs at once | double work only | harmless (idempotent) |
| Run longer than the budget | stops at ~20 s, rest next run | `lib/cleanupJob.ts` (tested) |
| Orphaned files (upload after a row was deleted, crash between steps) | object without a row | orphan sweep in each run deletes them after a while |
| **Schedule stopped** (job removed, wrong `CRON_SECRET`, app down, Supabase paused) | expired content stays stored; codes still never work after expiry | **now detected**: `/api/health/cleanup` |

**Set up the alert (YOU, 3 min, free):** UptimeRobot → New monitor → HTTP(s) →
`https://online-clipboard.vinaycode.com/api/health/cleanup`, interval
**30 minutes** (~3 Netlify credits/month), alert when it is **down** (any non-200). It goes "down"
when an expired clip is 30+ minutes overdue, i.e. at least 3 missed runs. No migration needed.

## 6. "Delete now" button: design (not implemented; waits for D4)

**Behaviour**
- Creating a clip also returns `deleteToken`: 32 random bytes (256 bits), base64url.
- The database stores only `sha256(token)` (hex) in a new nullable column. Old clips have none
  and can't be deleted early (they expire within 30 minutes anyway).
- The sender's page keeps the token **in memory only** (React state): never in the URL, never in
  localStorage. Reloading the page loses it (then the clip simply expires).
- The sender sees **"Delete now"** (secondary, red outline) under the code → confirm dialog
  ("Delete this clip now? The code stops working immediately, also for anyone who already
  has it.") → success shows "Deleted" with focus moved and an announcement.
- The receiver never sees the button and never gets the token.

**API**: `POST /api/clips/[code]/delete`, body `{ "token": "…" }` (in the body, so it never
appears in URLs or logs).
- 204 when deleted; **404 for "no such clip" and for "wrong token" alike** (no leak).
- Rate limit: new bucket `delete`, 20 per 10 min per IP; every 404 also counts as a failed
  lookup (so it can't be used to probe codes).
- Deletes the row first (atomic, token checked in SQL), then the file. If the file delete fails,
  the orphan sweep removes it.

**Migration `db/006_delete_token.sql` (proposal; additive; do not apply yet)**
```sql
alter table public.clips add column if not exists delete_token_hash text;
do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.clips'::regclass and conname = 'clips_delete_token_hash_format') then
    alter table public.clips add constraint clips_delete_token_hash_format
      check (delete_token_hash is null or delete_token_hash ~ '^[0-9a-f]{64}$');
  end if;
end $$;

-- Insert with a token hash: a NEW function name, so code that still calls clip_insert_with_code keeps working.
create or replace function public.clip_insert_with_code2(
  p_id uuid, p_code text, p_text text, p_file_path text, p_file_name text, p_file_size bigint,
  p_ready boolean, p_expires_at timestamptz, p_delete_token_hash text)
returns table (inserted boolean, out_expires_at timestamptz, freed_paths text[])
language plpgsql volatile security invoker set search_path = '' as $$
begin
  with d as (delete from public.clips c where c.code = p_code and c.expires_at <= now() returning c.file_path)
  select coalesce(array_agg(d.file_path) filter (where d.file_path is not null), '{}') into freed_paths from d;
  begin
    insert into public.clips as ins (id, code, text_content, file_path, file_name, file_size, ready, expires_at, delete_token_hash)
    values (p_id, p_code, p_text, p_file_path, p_file_name, p_file_size, p_ready, p_expires_at, p_delete_token_hash)
    returning ins.expires_at into out_expires_at;
    inserted := true;
  exception when unique_violation then inserted := false;
  end;
  return next;
end; $$;

-- Delete only with the matching token hash (the hash comparison is not timing-sensitive).
create or replace function public.clip_delete_with_token(p_code text, p_token_hash text)
returns table (deleted boolean, out_file_path text)
language sql volatile security invoker set search_path = '' as $$
  with d as (
    delete from public.clips c
    where c.code = p_code and p_token_hash is not null and c.delete_token_hash = p_token_hash
    returning c.file_path)
  select count(*) > 0, max(d.file_path) from d;
$$;

revoke all on function public.clip_insert_with_code2(uuid, text, text, text, text, bigint, boolean, timestamptz, text) from public, anon, authenticated;
revoke all on function public.clip_delete_with_token(text, text) from public, anon, authenticated;
grant execute on function public.clip_insert_with_code2(uuid, text, text, text, text, bigint, boolean, timestamptz, text) to service_role;
grant execute on function public.clip_delete_with_token(text, text) to service_role;
notify pgrst, 'reload schema';
```
Impact: one nullable column (existing rows get NULL, no rewrite of data), two new functions; RLS and
grants unchanged; safe to apply before the code (nothing uses it yet). Order: apply 006 → deploy.

**Tests to add with it**: create returns a token and stores only its hash; wrong token → 404
(same body as unknown code) and counts as a failed lookup; right token → 204, then `GET` → 404 and
the storage object is gone; second delete → 404; rate limit after 20; the token never appears in
`localStorage`, the URL or logs; the receiver's page has no button; keyboard + screen-reader
announcement (axe).

## 7. Graceful degradation (verified in code)

| Limit reached | What the visitor sees |
|---|---|
| Our caps (`MAX_LIVE_CLIPS`, storage) | "The service is busy or full right now. Please try again in a few minutes." (503) |
| Monthly download budget | "Downloads are paused until next month: this free service has used its monthly download allowance. Text clips still work." |
| Per-IP limits | "Too many attempts" with a live countdown |
| Supabase paused or down | create: "busy or full" (503); open: "Something went wrong on our side. Please try again." (500); health 503 → monitor alert |
| Supabase's own free-tier storage (1 GB) / egress (5 GB) | kept out of reach by our lower caps (800 MB live storage, 4,000 MB downloads/month) |
| Upload fails or is cut off | specific upload messages (canceled, too large, network, timeout) with retry |
| **Netlify credits used up** | **Netlify's own "Site not available" page; we can't change it.** Fallback: move DNS to Vercel (`docs/launch-day-netlify.md` §i). D2 makes this much less likely |

No gaps in our own messages were found.

## 8. Analytics (report only; nothing added)

- **Free, already there:** Google Search Console (queries, impressions, clicks, pages, countries,
  devices) and Bing Webmaster Tools; Netlify's own request/usage numbers in **Usage & billing**;
  Supabase's database/storage/egress usage.
- **Without personal data, our own:** daily aggregate counters in the database (clips created,
  files sent, downloads): no IPs, no cookies, no IDs. Would need a tiny migration and one line in
  the Privacy policy ("we count how many clips are created each day, as totals only").
- **Cookie-free hosted tools** (e.g. GoatCounter, Plausible, Cloudflare Web Analytics): need a
  third-party script (CSP change), a Privacy policy section naming the provider, and some are paid
  or non-commercial only.
- **Recommendation: wait until Step 9.** Search Console answers the questions that matter now
  (what people search, which pages show up). Revisit together with the ads wording, so the
  Privacy policy changes once.

## Decisions taken (Step 7c, 2026-11-23)

| Decision | Outcome | Status |
|---|---|---|
| **D1** guessing | **Yes.** IPv6 grouped by **/56** (code, active on deploy). **Global failed-lookup ceiling**: above 300 site-wide failures in a 10-min window, 3 per client instead of 10 (`db/006_lookup_ceiling.sql`, additive; active once applied; until then the app uses the 005 functions, so no ceiling). Settings `RATE_LIMIT_GLOBAL_LOOKUP_FAILURES` / `RATE_LIMIT_LOOKUP_FAILURES_STRICT` | Code + tests done; **006 waits for your approval** |
| **D2** edge rate limit | **Yes.** `netlify.toml`: 100 requests/min per IP (per domain) on `/api/*` | Code done; **needs the deploy test below** |
| **D3** risky files | **Yes, warning only.** Receivers of `.exe .msi .bat .cmd .com .scr .pif .cpl .dll .reg .lnk .ps1 .psm1 .vbs .vbe .js .jse .wsf .wsh .hta .jar .apk .sh .dmg .pkg .app` see: "This is a program or script file (.exe). Opening it can change or harm your device. Only open it if you know and trust the person who sent it." No blocking; archives aren't flagged | Done (`lib/fileRisk.ts`, `ReceivePanel`; tests incl. axe) |
| **D4** delete-now button | Approved in principle, **after launch**. Design and `db/006` *proposal* below stay as they are (the proposal will be renumbered `007`, since `006` is now the lookup ceiling). Terms/Privacy/FAQ unchanged | Not implemented |
| **D5** analytics | Wait until Step 9 | — |
| **D6** HSTS | Keep ours | — |

### D1 migration impact (`db/006_lookup_ceiling.sql`)
- Adds 4 functions (`lookup_fail_allowance`, `clip_lookup_v2`, `clip_complete_gate_v2`,
  `clip_download_gate_v2`); changes no table, row or existing function; idempotent; service-role only.
- After it: each failed lookup writes 1 extra counter row update (the site-wide counter: one
  `rate_limits` row per 10-min window under a fixed hashed key, removed by the normal clean-up).
- Tested on a throwaway Postgres (`db/test/006_lookup_ceiling.test.sql`, 20 checks incl. "005
  functions unchanged" and "anon can't execute"). The live e2e test for it skips itself until 006 is applied.
- Order: apply → (already deployed code picks it up within 5 minutes) or deploy → apply; both fine.

### D2 test plan (after the deploy)
Run from Git Bash on your normal connection; each step says what passes.
1. **Site still works:** `npm run smoke:prod -- https://online-clipboard.vinaycode.com --skip-spoof-test`
   → ALL PASSED (creates, opens, file upload/download through `/api/*`).
2. **The limit triggers** (uses `/api/clips/abc`, a cheap 400, and locks *your* IP's API access for about a minute):
   ```bash
   for i in $(seq 1 130); do curl -s -o /dev/null -w "%{http_code}
" https://online-clipboard.vinaycode.com/api/clips/abc; done | sort | uniq -c
   ```
   → roughly 100 × `400` then the rest `429` (Netlify may need up to ~10 s to start blocking, so a
   few extra 400s are normal). If you only see `400`s: the rule isn't active (tell me).
3. **Pages are not limited:** right after step 2, open `https://online-clipboard.vinaycode.com/guides`
   in the browser → loads normally. After a minute, `curl -s https://online-clipboard.vinaycode.com/api/health` → `{"ok":true}`.
4. **Clean-up and monitors unaffected:** next :x5 run in `net._http_response` → 200; both
   UptimeRobot monitors stay green over the next hour.
5. **App message:** during step 2's lockout, open the site, Receive tab, type any code → "Too
   many attempts" with a countdown (the edge 429 has no `Retry-After`, so the app shows 60 s).

**If step 1 fails** (API broken by the rule): Netlify → **Deploys** → the previous deploy →
**Publish deploy** (no credits), then tell me. The docs don't say how this rule interacts with the
Next.js adapter, which is why it needs this real-deploy check.
Not confirmed by Netlify's docs: whether limited requests still count as web requests for credits
(they don't run any function, so they cost no compute).

## Verdict

**NOT READY for the flip yet. What's missing, in order:**
1. Deploy Steps 7b/7c (`git push`, 15 credits).
2. Run the **D2 test plan** above; all 5 steps pass (or the rule is rolled back and you accept F1).
3. Set up the two uptime monitors (`/api/health`, `/api/health/cleanup`).
4. Recommended, not blocking: apply `db/006_lookup_ceiling.sql` (D1 ceiling).

Then the flip (`docs/launch-day-netlify.md` section e) is ready to go. Everything else reviewed is ready.
