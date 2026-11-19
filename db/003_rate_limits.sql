-- =====================================================================
-- 003_rate_limits.sql  —  Rate-limit counters + usage totals (Step 6)
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- Run this BEFORE starting the Step 6 code.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Counter table: one row per (client key, fixed time window).
--    key = "<bucket>:<HMAC of client IP>". Raw IPs are never stored.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key          text        not null,
  window_start timestamptz not null,
  count        integer     not null default 0,
  primary key (key, window_start)
);

-- Cleanup deletes by window_start.
create index if not exists rate_limits_window_start_idx
  on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;   -- no policies

revoke all on table public.rate_limits from public, anon, authenticated;
grant select, insert, update, delete on table public.rate_limits to service_role;


-- ---------------------------------------------------------------------
-- 2. rate_limit_hit: atomically +1 for the current window, return the new count.
--    Windows are aligned to the epoch (e.g. every 600 s), so every server
--    instance agrees on the window boundaries.
-- ---------------------------------------------------------------------
create or replace function public.rate_limit_hit(p_key text, p_window_seconds integer)
returns table (hits integer, reset_at timestamptz)
language sql
volatile
security invoker
set search_path = ''
as $$
  insert into public.rate_limits as rl (key, window_start, count)
  values (
    p_key,
    to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds),
    1
  )
  on conflict (key, window_start) do update set count = rl.count + 1
  returning rl.count, rl.window_start + make_interval(secs => p_window_seconds);
$$;


-- ---------------------------------------------------------------------
-- 3. rate_limit_peek: current count for the current window, WITHOUT incrementing.
--    Returns hits = 0 if there is no row yet.
-- ---------------------------------------------------------------------
create or replace function public.rate_limit_peek(p_key text, p_window_seconds integer)
returns table (hits integer, reset_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  with w as (
    select to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds) as ws
  )
  select
    coalesce((select rl.count from public.rate_limits rl where rl.key = p_key and rl.window_start = w.ws), 0),
    w.ws + make_interval(secs => p_window_seconds)
  from w;
$$;


-- ---------------------------------------------------------------------
-- 4. clip_usage: live clips (unexpired, INCLUDING pending uploads) and the sum
--    of their file sizes, for the global caps. One round trip.
-- ---------------------------------------------------------------------
create or replace function public.clip_usage()
returns table (live_clips bigint, live_bytes bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select count(*), coalesce(sum(c.file_size), 0)::bigint
  from public.clips c
  where c.expires_at > now();
$$;


-- ---------------------------------------------------------------------
-- 5. Function privileges. Postgres lets PUBLIC execute new functions by
--    default, and Supabase also grants anon/authenticated; remove all of
--    that and allow only service_role.
-- ---------------------------------------------------------------------
revoke all on function public.rate_limit_hit(text, integer)  from public, anon, authenticated;
revoke all on function public.rate_limit_peek(text, integer) from public, anon, authenticated;
revoke all on function public.clip_usage()                   from public, anon, authenticated;

grant execute on function public.rate_limit_hit(text, integer)  to service_role;
grant execute on function public.rate_limit_peek(text, integer) to service_role;
grant execute on function public.clip_usage()                   to service_role;


-- =====================================================================
-- Verification — run after the script. Each line shows what to expect.
-- =====================================================================

-- expect: rls_enabled = true, policy_count = 0
select c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'rate_limits') as policy_count
from pg_class c where c.oid = 'public.rate_limits'::regclass;

-- expect: exactly one row, service_role | DELETE, INSERT, SELECT, UPDATE
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'rate_limits'
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by grantee;

-- expect: 3 rows, every one: anon=false, authenticated=false, public=false, service_role=true
select p.proname,
       has_function_privilege('anon',          p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               where a.grantee = 0 and a.privilege_type = 'EXECUTE')  as public,
       has_function_privilege('service_role',  p.oid, 'execute') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('rate_limit_hit', 'rate_limit_peek', 'clip_usage')
order by p.proname;

-- expect: hits 1, then 2, then peek shows 2; the test row is removed at the end
select * from public.rate_limit_hit('verify:test', 600);
select * from public.rate_limit_hit('verify:test', 600);
select * from public.rate_limit_peek('verify:test', 600);
delete from public.rate_limits where key = 'verify:test';

-- expect: one row with your current live clip count and total live file bytes
select * from public.clip_usage();
