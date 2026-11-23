-- =====================================================================
-- 006_lookup_ceiling.sql  —  Global failed-lookup ceiling (Growth Step 7c, decision D1)
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- ADDITIVE ONLY: three NEW functions (…_v2). Nothing existing is changed or removed: no table,
-- column, row or 005 function. The app uses the _v2 functions when they exist and otherwise
-- keeps using the 005 ones (then without the ceiling), so the order of "apply" and "deploy"
-- doesn't matter. Existing codes and links are unaffected.
--
-- What changes when applied: every failed lookup (unknown code on open, complete or download)
-- also counts on ONE site-wide counter (a normal rate_limits row under a fixed hashed key).
-- While that counter has reached p_global_threshold (default 300) in the current 10-minute
-- window, each client may fail only p_strict_limit (default 3) times instead of p_fail_limit (10).
-- Successful lookups never count. Order of checks is unchanged: limits first, then the lookup.
-- =====================================================================


-- Effective per-client allowance for this window.
create or replace function public.lookup_fail_allowance(
  p_global_key text, p_global_threshold integer, p_fail_limit integer, p_strict_limit integer, p_window_seconds integer
)
returns integer
language sql
stable
security invoker
set search_path = ''
as $$
  select case when g.hits >= p_global_threshold then least(p_strict_limit, p_fail_limit) else p_fail_limit end
  from public.rate_limit_peek(p_global_key, p_window_seconds) g;
$$;


-- ---------------------------------------------------------------------
-- 1. clip_lookup_v2: GET /api/clips/[code]  (same as clip_lookup + the ceiling)
-- ---------------------------------------------------------------------
create or replace function public.clip_lookup_v2(
  p_fail_key text, p_fail_limit integer, p_strict_limit integer,
  p_global_key text, p_global_threshold integer,
  p_window_seconds integer, p_code text
)
returns table (status text, reset_at timestamptz,
               out_text text, out_file_name text, out_file_size bigint,
               out_created_at timestamptz, out_expires_at timestamptz)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  h integer;
  lim integer := public.lookup_fail_allowance(p_global_key, p_global_threshold, p_fail_limit, p_strict_limit, p_window_seconds);
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= lim then
    status := 'blocked';
    return next;
    return;
  end if;

  select c.text_content, c.file_name, c.file_size, c.created_at, c.expires_at
  into out_text, out_file_name, out_file_size, out_created_at, out_expires_at
  from public.clips c
  where c.code = p_code and c.ready and c.expires_at > now();

  if not found then
    perform public.rate_limit_hit(p_fail_key, p_window_seconds);
    perform public.rate_limit_hit(p_global_key, p_window_seconds);
    status := 'not_found';
  else
    status := 'ok';
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. clip_complete_gate_v2: POST /api/clips/[code]/complete
-- ---------------------------------------------------------------------
create or replace function public.clip_complete_gate_v2(
  p_fail_key text, p_fail_limit integer, p_strict_limit integer,
  p_global_key text, p_global_threshold integer,
  p_op_key text, p_op_limit integer,
  p_window_seconds integer, p_code text
)
returns table (status text, reset_at timestamptz,
               out_id uuid, out_file_path text, out_ready boolean)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  h integer;
  lim integer := public.lookup_fail_allowance(p_global_key, p_global_threshold, p_fail_limit, p_strict_limit, p_window_seconds);
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= lim then
    status := 'blocked';
    return next;
    return;
  end if;

  select hit.hits, hit.reset_at into h, reset_at from public.rate_limit_hit(p_op_key, p_window_seconds) hit;
  if h > p_op_limit then
    status := 'limited';
    return next;
    return;
  end if;
  reset_at := null;

  select c.id, c.file_path, c.ready into out_id, out_file_path, out_ready
  from public.clips c
  where c.code = p_code and c.file_path is not null and c.expires_at > now();

  if not found then
    perform public.rate_limit_hit(p_fail_key, p_window_seconds);
    perform public.rate_limit_hit(p_global_key, p_window_seconds);
    status := 'not_found';
  else
    status := 'ok';
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. clip_download_gate_v2: GET /api/clips/[code]/download
-- ---------------------------------------------------------------------
create or replace function public.clip_download_gate_v2(
  p_fail_key text, p_fail_limit integer, p_strict_limit integer,
  p_global_key text, p_global_threshold integer,
  p_op_key text, p_op_limit integer,
  p_window_seconds integer, p_code text,
  p_month_limit_bytes bigint
)
returns table (status text, reset_at timestamptz, out_file_path text, out_file_name text)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  h integer;
  sz bigint;
  ok boolean;
  lim integer := public.lookup_fail_allowance(p_global_key, p_global_threshold, p_fail_limit, p_strict_limit, p_window_seconds);
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= lim then
    status := 'blocked';
    return next;
    return;
  end if;

  select hit.hits, hit.reset_at into h, reset_at from public.rate_limit_hit(p_op_key, p_window_seconds) hit;
  if h > p_op_limit then
    status := 'limited';
    return next;
    return;
  end if;
  reset_at := null;

  select c.file_path, c.file_name, c.file_size into out_file_path, out_file_name, sz
  from public.clips c
  where c.code = p_code and c.ready and c.file_path is not null and c.expires_at > now();

  if not found then
    perform public.rate_limit_hit(p_fail_key, p_window_seconds);
    perform public.rate_limit_hit(p_global_key, p_window_seconds);
    status := 'not_found';
    return next;
    return;
  end if;

  select a.allowed into ok from public.add_download_bytes(greatest(coalesce(sz, 0), 0), p_month_limit_bytes) a;
  status := case when ok then 'ok' else 'paused' end;
  if not ok then
    out_file_path := null;
    out_file_name := null;
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. Privileges: only service_role (the server) may call these.
-- ---------------------------------------------------------------------
revoke all on function public.lookup_fail_allowance(text, integer, integer, integer, integer) from public, anon, authenticated;
revoke all on function public.clip_lookup_v2(text, integer, integer, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.clip_complete_gate_v2(text, integer, integer, text, integer, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.clip_download_gate_v2(text, integer, integer, text, integer, text, integer, integer, text, bigint) from public, anon, authenticated;

grant execute on function public.lookup_fail_allowance(text, integer, integer, integer, integer) to service_role;
grant execute on function public.clip_lookup_v2(text, integer, integer, text, integer, integer, text) to service_role;
grant execute on function public.clip_complete_gate_v2(text, integer, integer, text, integer, text, integer, integer, text) to service_role;
grant execute on function public.clip_download_gate_v2(text, integer, integer, text, integer, text, integer, integer, text, bigint) to service_role;

notify pgrst, 'reload schema';


-- =====================================================================
-- Verification — run after the script.
-- =====================================================================

-- expect: 4 rows, every one: anon=false, authenticated=false, service_role=true
select p.proname,
       has_function_privilege('anon',          p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       has_function_privilege('service_role',  p.oid, 'execute') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('lookup_fail_allowance', 'clip_lookup_v2', 'clip_complete_gate_v2', 'clip_download_gate_v2')
order by p.proname;

-- expect: 10 (normal allowance; uses a throw-away key, creates no rows)
select public.lookup_fail_allowance('verify:006-global', 300, 10, 3, 600);
