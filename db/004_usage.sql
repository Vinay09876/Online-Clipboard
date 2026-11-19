-- =====================================================================
-- 004_usage.sql  —  Monthly download (egress) counter (Step 8)
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- Run this BEFORE starting the Step 8 code.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. One row per calendar month (UTC): bytes handed out as download links.
-- ---------------------------------------------------------------------
create table if not exists public.download_usage (
  month      date        primary key,            -- first day of the month, UTC
  bytes      bigint      not null default 0 check (bytes >= 0),
  updated_at timestamptz not null default now()
);

alter table public.download_usage enable row level security;   -- no policies

revoke all on table public.download_usage from public, anon, authenticated;
grant select, insert, update, delete on table public.download_usage to service_role;


-- ---------------------------------------------------------------------
-- 2. add_download_bytes: atomically add p_bytes to this month's total,
--    but ONLY if the new total stays within p_limit_bytes.
--    Returns the (new or unchanged) total and whether it was added.
--    A refused download does not count, so the total never overshoots.
-- ---------------------------------------------------------------------
create or replace function public.add_download_bytes(p_bytes bigint, p_limit_bytes bigint)
returns table (total_bytes bigint, allowed boolean)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  m date := date_trunc('month', now() at time zone 'utc')::date;
  t bigint;
begin
  if p_bytes < 0 then
    raise exception 'p_bytes must be >= 0';
  end if;

  insert into public.download_usage (month, bytes) values (m, 0)
  on conflict (month) do nothing;

  update public.download_usage u
     set bytes = u.bytes + p_bytes, updated_at = now()
   where u.month = m and u.bytes + p_bytes <= p_limit_bytes
  returning u.bytes into t;

  if found then
    return query select t, true;
  else
    return query select u.bytes, false from public.download_usage u where u.month = m;
  end if;
end;
$$;

revoke all on function public.add_download_bytes(bigint, bigint) from public, anon, authenticated;
grant execute on function public.add_download_bytes(bigint, bigint) to service_role;


-- =====================================================================
-- Verification — select one query at a time and run it.
-- =====================================================================

-- expect: rls_enabled = true, policy_count = 0
select c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = 'download_usage') as policy_count
from pg_class c where c.oid = 'public.download_usage'::regclass;

-- expect: exactly one row, service_role | DELETE, INSERT, SELECT, UPDATE
select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'download_usage'
  and grantee in ('anon', 'authenticated', 'service_role', 'PUBLIC')
group by grantee;

-- expect: anon = false, authenticated = false, service_role = true
select has_function_privilege('anon',          'public.add_download_bytes(bigint, bigint)', 'execute') as anon,
       has_function_privilege('authenticated', 'public.add_download_bytes(bigint, bigint)', 'execute') as authenticated,
       has_function_privilege('service_role',  'public.add_download_bytes(bigint, bigint)', 'execute') as service_role;

-- expect: (0, true) on a fresh month; this adds 0 bytes, so it changes nothing
select * from public.add_download_bytes(0, 1);

-- This month's usage so far (MB)
select month, round(bytes / 1048576.0, 1) as mb, updated_at from public.download_usage order by month desc;
