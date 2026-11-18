# Scheduling the cleanup job (pg_cron + pg_net)

> ⚠️ **DEPLOYMENT TIME ONLY (Step 8). Do not run this now.**
> The job calls your **deployed** URL. Supabase's servers cannot reach `localhost`,
> so running this before deployment just produces failed requests every 10 minutes.
> Until then, trigger cleanup manually (see "Testing" in Step 4) or rely on the
> lazy cleanup that runs after each new clip.

Vercel Hobby only allows cron jobs once a day, so the schedule lives in Supabase:
`pg_cron` fires every 10 minutes and `pg_net` sends an HTTP POST to
`/api/cron/cleanup` with the secret. The API route does the actual work (it must:
files can only be deleted through the Storage API, not SQL).

## Prerequisites

1. The app is deployed and `https://<your-app>.vercel.app/api/health` returns `{"ok":true}`.
2. `CRON_SECRET` is set in **Vercel → Project → Settings → Environment Variables**
   (same value as in your `.env.local`, or a new one; it just has to match step 2 below).
   Redeploy after adding it.

## 1. Enable the extensions

Dashboard: **Integrations → Cron → Enable**, and **Database → Extensions → `pg_net` → Enable**.
Or in the SQL Editor:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

## 2. Store the secret and URL in Supabase Vault

Never hardcode the secret in the job SQL: job definitions are stored in plain text in
`cron.job` and visible to anyone with database access.

**Recommended: use the dashboard** (keeps the secret out of SQL Editor history):
**Integrations → Vault → Secrets → Add new secret**, twice:

| Name                 | Value                                                     |
|----------------------|-----------------------------------------------------------|
| `cron_secret`        | your `CRON_SECRET` value                                  |
| `cleanup_url`        | `https://<your-app>.vercel.app/api/cron/cleanup`          |

SQL alternative (the value will appear in your SQL Editor history; delete the query afterwards):

```sql
select vault.create_secret('<paste CRON_SECRET here>', 'cron_secret', 'Bearer token for /api/cron/cleanup');
select vault.create_secret('https://<your-app>.vercel.app/api/cron/cleanup', 'cleanup_url', 'Cleanup endpoint');
```

To change a value later: edit it in the Vault UI, or `select vault.update_secret(id, '<new value>')`
using the id from `select id, name from vault.secrets;`. The job reads Vault on every run,
so no rescheduling is needed.

## 3. Schedule the job (every 10 minutes)

```sql
select cron.schedule(
  'cleanup-expired-clips',          -- job name (re-running with the same name updates it)
  '*/10 * * * *',                   -- every 10 minutes
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_url'),
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

## 4. Check it works

Wait ~10 minutes, then:

```sql
-- Did the job fire? (status should be 'succeeded'. This only means the request was queued.)
select jobid, status, return_message, start_time
from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'cleanup-expired-clips')
order by start_time desc
limit 5;

-- What did the endpoint answer? (expect status_code 200 and a body with totals)
select id, status_code, content, error_msg, created
from net._http_response
order by created desc
limit 5;
```

`status_code = 401` means the Vault `cron_secret` doesn't match Vercel's `CRON_SECRET`.
You can also watch the calls in **Vercel → Project → Logs**, filtered by `/api/cron/cleanup`.

## Pause / remove

```sql
select cron.unschedule('cleanup-expired-clips');
```

## Housekeeping

`cron.job_run_details` grows by ~144 rows/day. Optionally purge it weekly:

```sql
select cron.schedule(
  'purge-cron-history',
  '0 3 * * 0',  -- Sundays 03:00 UTC
  $$ delete from cron.job_run_details where end_time < now() - interval '7 days' $$
);
```
