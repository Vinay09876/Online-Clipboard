\set ON_ERROR_STOP 1
set role service_role;

create or replace function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
  raise notice 'PASS  %', label;
end $$;

-- ---------------------------------------------------------------- create gate
select pg_temp.ok((select create_hits = 1 and file_hits is null and live_clips = 0 from public.clip_create_gate('t:create', 2, null, 1, 600, true)), 'gate: 1st create counted, usage returned');
select pg_temp.ok((select create_hits = 2 and file_hits = 1 and live_clips = 0 from public.clip_create_gate('t:create', 2, 't:file', 1, 600, true)), 'gate: file counter counted for a file request');
select pg_temp.ok((select create_hits = 3 and file_hits is null and live_clips is null from public.clip_create_gate('t:create', 2, 't:file', 1, 600, true)), 'gate: over the create limit → stops, file NOT counted, no usage');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't:file'), 'gate: file counter still 1');
select pg_temp.ok((select create_hits = 1 and live_clips is null from public.clip_create_gate('t:create2', 5, null, 1, 600, false)), 'gate: invalid body → only create counted, no usage');
select pg_temp.ok((select file_hits = 2 and live_clips is null from public.clip_create_gate('t:create3', 5, 't:file', 1, 600, true)), 'gate: over the file limit → stops before usage');

-- ---------------------------------------------------------------- insert with code
insert into public.clips (code, text_content, file_path, file_name, file_size, created_at, expires_at)
values ('111111', null, 'old-object', 'a.txt', 5, now() - interval '2 hours', now() - interval '1 hour');
insert into public.clips (code, text_content, created_at, expires_at)
values ('222222', 'live holder', now() - interval '1 minute', now() + interval '1 hour');

select pg_temp.ok((select inserted and freed_paths = array['old-object'] and out_expires_at > now()
  from public.clip_insert_with_code(gen_random_uuid(), '111111', 'new', null, null, null, true, now() + interval '30 minutes')),
  'insert: expired holder freed (its file path returned) and new clip inserted');
select pg_temp.ok((select count(*) = 1 and bool_and(text_content = 'new') from public.clips where code = '111111'), 'insert: exactly one row with that code, the new one');
select pg_temp.ok((select not inserted and freed_paths = '{}'
  from public.clip_insert_with_code(gen_random_uuid(), '222222', 'x', null, null, null, true, now() + interval '30 minutes')),
  'insert: live holder → inserted = false (caller retries with another code)');
select pg_temp.ok((select count(*) = 1 and bool_and(text_content = 'live holder') from public.clips where code = '222222'), 'insert: live holder untouched');
select pg_temp.ok((select inserted from public.clip_insert_with_code(gen_random_uuid(), '333333', null, 'p333', 'f.bin', 10, false, now() + interval '30 minutes')),
  'insert: pending file clip (ready = false)');
do $$ begin
  perform public.clip_insert_with_code(gen_random_uuid(), '444444', '', null, null, null, true, now() + interval '30 minutes');
  raise exception 'FAIL: empty text must be rejected';
exception when check_violation then raise notice 'PASS  insert: table constraints still apply (empty text rejected)';
end $$;

-- ---------------------------------------------------------------- lookup
select pg_temp.ok((select status = 'ok' and out_text = 'live holder' from public.clip_lookup('t:fail', 2, 600, '222222')), 'lookup: live clip found');
select pg_temp.ok((select count(*) = 0 from public.rate_limits where key = 't:fail'), 'lookup: success does not count');
select pg_temp.ok((select status = 'not_found' from public.clip_lookup('t:fail', 2, 600, '333333')), 'lookup: pending (not ready) clip → not_found');
select pg_temp.ok((select status = 'not_found' from public.clip_lookup('t:fail', 2, 600, '999999')), 'lookup: unknown code → not_found');
select pg_temp.ok((select count = 2 from public.rate_limits where key = 't:fail'), 'lookup: two failures counted');
select pg_temp.ok((select status = 'blocked' and reset_at > now() from public.clip_lookup('t:fail', 2, 600, '222222')), 'lookup: at the limit → blocked, even for a valid code');
select pg_temp.ok((select count = 2 from public.rate_limits where key = 't:fail'), 'lookup: a blocked request is not counted');

-- ---------------------------------------------------------------- complete gate
select pg_temp.ok((select status = 'ok' and out_ready = false and out_file_path = 'p333' from public.clip_complete_gate('t:f2', 3, 't:op', 1, 600, '333333')), 'complete: pending file clip found');
select pg_temp.ok((select status = 'limited' and reset_at > now() from public.clip_complete_gate('t:f2', 3, 't:op', 1, 600, '333333')), 'complete: over the op limit → limited');
select pg_temp.ok((select status = 'not_found' from public.clip_complete_gate('t:f2', 3, 't:op2', 5, 600, '222222')), 'complete: text-only clip → not_found');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't:f2'), 'complete: not_found counted as failed lookup');
select pg_temp.ok((select status = 'blocked' from public.clip_complete_gate('t:fail', 2, 't:op3', 5, 600, '333333')), 'complete: blocked by failed lookups first');
select pg_temp.ok((select count(*) = 0 from public.rate_limits where key = 't:op3'), 'complete: blocked → op counter untouched');

-- ---------------------------------------------------------------- download gate
update public.clips set ready = true where code = '333333';
select pg_temp.ok((select status = 'ok' and out_file_path = 'p333' and out_file_name = 'f.bin' from public.clip_download_gate('t:f3', 5, 't:dl', 5, 600, '333333', 15)), 'download: ok, 10 bytes reserved');
select pg_temp.ok((select bytes = 10 from public.download_usage), 'download: budget counter = 10');
select pg_temp.ok((select status = 'paused' and out_file_path is null from public.clip_download_gate('t:f3', 5, 't:dl', 5, 600, '333333', 15)), 'download: over the monthly budget → paused, no path');
select pg_temp.ok((select bytes = 10 from public.download_usage), 'download: refused download not added');
select pg_temp.ok((select status = 'not_found' from public.clip_download_gate('t:f3', 5, 't:dl', 5, 600, '222222', 15)), 'download: text clip → not_found');
select pg_temp.ok((select count = 1 from public.rate_limits where key = 't:f3'), 'download: not_found counted');

reset role;
-- ---------------------------------------------------------------- privileges
set role anon;
do $$ begin
  perform public.clip_lookup('x', 1, 600, '000000');
  raise exception 'FAIL: anon could execute clip_lookup';
exception when insufficient_privilege then raise notice 'PASS  anon cannot execute the new functions';
end $$;
reset role;
