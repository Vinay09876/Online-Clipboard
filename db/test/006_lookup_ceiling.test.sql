-- Tests for db/006_lookup_ceiling.sql. Run on a THROWAWAY Postgres with 001-006 applied
-- (see db/test/005_fast_paths.test.sql for the setup), never on the live database.
\set ON_ERROR_STOP 1
set role service_role;

create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS  %', label;
end $$;

delete from public.rate_limits where key like 't6:%';
insert into public.clips (code, text_content, created_at, expires_at)
values ('606060', 't6 live', now() - interval '1 minute', now() + interval '1 hour')
on conflict (code) do nothing;

-- Normal mode: global counter below the threshold → 10 failures allowed (threshold 5 here).
select pg_temp.ok(public.lookup_fail_allowance('t6:global', 5, 10, 3, 600) = 10, 'allowance: normal = 10');
select pg_temp.ok((select status = 'not_found' from public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '000001')), 'v2: unknown code → not_found');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't6:a'), 'v2: per-client failure counted');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't6:global'), 'v2: global failure counted');
select pg_temp.ok((select status = 'ok' and out_text = 't6 live' from public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '606060')), 'v2: live code found');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't6:global'), 'v2: success does not count globally');

-- Client a fails 3 more times (4 total): still allowed in normal mode.
select public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '000002');
select public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '000003');
select public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '000004');
select pg_temp.ok((select status = 'ok' from public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '606060')), 'normal mode: 4 failures, still allowed');

-- Another client pushes the global counter to the threshold (5).
select public.clip_lookup_v2('t6:b', 10, 3, 't6:global', 5, 600, '000005');
select pg_temp.ok((select count = 5 from public.rate_limits where key = 't6:global'), 'global counter at threshold');
select pg_temp.ok(public.lookup_fail_allowance('t6:global', 5, 10, 3, 600) = 3, 'allowance: strict = 3');

-- Strict mode: client a (4 failures) is now blocked, even for a valid code.
select pg_temp.ok((select status = 'blocked' and reset_at > now() from public.clip_lookup_v2('t6:a', 10, 3, 't6:global', 5, 600, '606060')), 'strict: client with 4 failures blocked');
-- A fresh client gets 3 failures, then is blocked.
select public.clip_lookup_v2('t6:c', 10, 3, 't6:global', 5, 600, '000006');
select public.clip_lookup_v2('t6:c', 10, 3, 't6:global', 5, 600, '000007');
select pg_temp.ok((select status = 'ok' from public.clip_lookup_v2('t6:c', 10, 3, 't6:global', 5, 600, '606060')), 'strict: 2 failures, still allowed');
select public.clip_lookup_v2('t6:c', 10, 3, 't6:global', 5, 600, '000008');
select pg_temp.ok((select status = 'blocked' from public.clip_lookup_v2('t6:c', 10, 3, 't6:global', 5, 600, '606060')), 'strict: blocked after 3 failures');
select pg_temp.ok((select count = 3 from public.rate_limits where key = 't6:c'), 'strict: a blocked lookup is not counted');

-- complete/download v2 use the same allowance and count globally on not_found.
select pg_temp.ok((select status = 'blocked' from public.clip_complete_gate_v2('t6:c', 10, 3, 't6:global', 5, 't6:op', 30, 600, '606060')), 'complete v2: blocked client stays blocked');
select pg_temp.ok((select status = 'not_found' from public.clip_complete_gate_v2('t6:d', 10, 3, 't6:global', 5, 't6:op', 30, 600, '000009')), 'complete v2: unknown → not_found');
select pg_temp.ok((select status = 'not_found' from public.clip_download_gate_v2('t6:d', 10, 3, 't6:global', 5, 't6:dl', 30, 600, '000010', 1000000)), 'download v2: unknown → not_found');
select pg_temp.ok((select count = 10 from public.rate_limits where key = 't6:global'), 'complete + download failures counted globally');
select pg_temp.ok((select status = 'not_found' from public.clip_download_gate_v2('t6:d', 10, 3, 't6:global', 5, 't6:dl', 30, 600, '606060', 1000000)), 'download v2: text-only clip → not_found (rules unchanged)');

-- The 005 functions still work unchanged (no ceiling there).
select pg_temp.ok((select status = 'ok' from public.clip_lookup('t6:c', 10, 600, '606060')), '005 clip_lookup unchanged: 3 failures < 10, allowed');

reset role;
set role anon;
do $$ begin
  perform public.clip_lookup_v2('x', 1, 1, 'y', 1, 600, '000000');
  raise exception 'FAIL: anon could execute clip_lookup_v2';
exception when insufficient_privilege then raise notice 'PASS  anon cannot execute the 006 functions';
end $$;
reset role;
delete from public.rate_limits where key like 't6:%';
delete from public.clips where code = '606060';
