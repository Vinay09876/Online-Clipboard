-- =====================================================================
-- 005_fast_paths.sql  —  Fewer database round trips (Growth Step 6)
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
--
-- ADDITIVE ONLY: new functions, no table or data changes, nothing removed.
-- The app works WITHOUT this file (it falls back to the old step-by-step calls),
-- so the order is free: deploy first or apply first. With it, each API request
-- needs 1-3 round trips instead of 2-6.
--
-- Every function calls the SAME building blocks as before (rate_limit_hit,
-- rate_limit_peek, add_download_bytes) in the SAME order, just inside one call:
-- the rate limit still runs first, counters stay atomic (insert … on conflict),
-- and the "ready" / "live" rules are the same WHERE clauses as in lib/*.ts.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. clip_create_gate: POST /api/clips, before the insert.
--    a) +1 on the "create" counter. Over the limit → stop (nothing else counted).
--    b) only for a valid file request: +1 on "create-file". Over → stop.
--    c) only for a valid request: live clip count + live bytes (global caps).
--    The caller decides (same comparisons as lib/rateLimit.ts / lib/capacity.ts).
-- ---------------------------------------------------------------------
create or replace function public.clip_create_gate(
  p_create_key text, p_create_limit integer,
  p_file_key text,   p_file_limit integer,
  p_window_seconds integer,
  p_with_usage boolean
)
returns table (create_hits integer, create_reset timestamptz,
               file_hits integer, file_reset timestamptz,
               live_clips bigint, live_bytes bigint)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  select h.hits, h.reset_at into create_hits, create_reset
  from public.rate_limit_hit(p_create_key, p_window_seconds) h;
  if create_hits > p_create_limit then
    return next;
    return;
  end if;

  if p_file_key is not null then
    select h.hits, h.reset_at into file_hits, file_reset
    from public.rate_limit_hit(p_file_key, p_window_seconds) h;
    if file_hits > p_file_limit then
      return next;
      return;
    end if;
  end if;

  if p_with_usage then
    select u.live_clips, u.live_bytes into live_clips, live_bytes from public.clip_usage() u;
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 2. clip_insert_with_code: one code attempt = free that code if an EXPIRED
--    clip still holds it, then insert. A LIVE holder → inserted = false
--    (unique violation), and the caller tries the next code, exactly as before.
--    Returns the freed clip's file path(s) so the app can remove the objects
--    (after the response; the orphan sweep is the safety net).
-- ---------------------------------------------------------------------
create or replace function public.clip_insert_with_code(
  p_id uuid, p_code text, p_text text,
  p_file_path text, p_file_name text, p_file_size bigint,
  p_ready boolean, p_expires_at timestamptz
)
returns table (inserted boolean, out_expires_at timestamptz, freed_paths text[])
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  with d as (
    delete from public.clips c
    where c.code = p_code and c.expires_at <= now()
    returning c.file_path
  )
  select coalesce(array_agg(d.file_path) filter (where d.file_path is not null), '{}')
  into freed_paths from d;

  begin
    insert into public.clips as ins (id, code, text_content, file_path, file_name, file_size, ready, expires_at)
    values (p_id, p_code, p_text, p_file_path, p_file_name, p_file_size, p_ready, p_expires_at)
    returning ins.expires_at into out_expires_at;
    inserted := true;
  exception when unique_violation then
    inserted := false;   -- a live clip holds this code; the delete above is kept
  end;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 3. clip_lookup: GET /api/clips/[code].
--    Blocked by failed lookups? → 'blocked'. Otherwise the live, ready clip,
--    or 'not_found' after +1 on the failed-lookup counter.
-- ---------------------------------------------------------------------
create or replace function public.clip_lookup(
  p_fail_key text, p_fail_limit integer, p_window_seconds integer, p_code text
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
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= p_fail_limit then
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
    status := 'not_found';
  else
    status := 'ok';
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 4. clip_complete_gate: POST /api/clips/[code]/complete, up to the storage check.
--    blocked (failed lookups) → limited ("complete" counter) → the live file clip
--    (ready or not), or 'not_found' after +1 on the failed-lookup counter.
-- ---------------------------------------------------------------------
create or replace function public.clip_complete_gate(
  p_fail_key text, p_fail_limit integer,
  p_op_key text,   p_op_limit integer,
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
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= p_fail_limit then
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
    status := 'not_found';
  else
    status := 'ok';
  end if;
  return next;
end;
$$;


-- ---------------------------------------------------------------------
-- 5. clip_download_gate: GET /api/clips/[code]/download, up to signing the URL.
--    blocked → limited ("download" counter) → the live, ready file clip, or
--    'not_found' (+1 failed lookup) → reserve its size in this month's download
--    budget (add_download_bytes) → 'paused' if over budget, else 'ok'.
-- ---------------------------------------------------------------------
create or replace function public.clip_download_gate(
  p_fail_key text, p_fail_limit integer,
  p_op_key text,   p_op_limit integer,
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
begin
  select pk.hits, pk.reset_at into h, reset_at from public.rate_limit_peek(p_fail_key, p_window_seconds) pk;
  if h >= p_fail_limit then
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
-- 6. Privileges: only service_role (the server) may call these.
-- ---------------------------------------------------------------------
revoke all on function public.clip_create_gate(text, integer, text, integer, integer, boolean) from public, anon, authenticated;
revoke all on function public.clip_insert_with_code(uuid, text, text, text, text, bigint, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.clip_lookup(text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.clip_complete_gate(text, integer, text, integer, integer, text) from public, anon, authenticated;
revoke all on function public.clip_download_gate(text, integer, text, integer, integer, text, bigint) from public, anon, authenticated;

grant execute on function public.clip_create_gate(text, integer, text, integer, integer, boolean) to service_role;
grant execute on function public.clip_insert_with_code(uuid, text, text, text, text, bigint, boolean, timestamptz) to service_role;
grant execute on function public.clip_lookup(text, integer, integer, text) to service_role;
grant execute on function public.clip_complete_gate(text, integer, text, integer, integer, text) to service_role;
grant execute on function public.clip_download_gate(text, integer, text, integer, integer, text, bigint) to service_role;

-- Tell the API layer (PostgREST) about the new functions right away.
notify pgrst, 'reload schema';


-- =====================================================================
-- Verification — run after the script.
-- =====================================================================

-- expect: 5 rows, every one: anon=false, authenticated=false, public=false, service_role=true
select p.proname,
       has_function_privilege('anon',          p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authenticated,
       exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
               where a.grantee = 0 and a.privilege_type = 'EXECUTE')  as public,
       has_function_privilege('service_role',  p.oid, 'execute') as service_role
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('clip_create_gate', 'clip_insert_with_code', 'clip_lookup', 'clip_complete_gate', 'clip_download_gate')
order by p.proname;

-- expect: status 'not_found' for a code nobody uses; the test counter row is removed after
select status from public.clip_lookup('verify:005', 10, 600, '000000');
delete from public.rate_limits where key = 'verify:005';
