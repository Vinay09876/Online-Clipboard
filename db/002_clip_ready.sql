-- =====================================================================
-- 002_clip_ready.sql  —  "ready" flag for file clips (Step 5)
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- Run this BEFORE starting the Step 5 code: the API filters on this column.
-- =====================================================================

-- Text-only clips are ready immediately (default true). File clips are
-- inserted with ready = false and flipped to true by
-- POST /api/clips/[code]/complete once the upload is verified.
alter table public.clips
  add column if not exists ready boolean not null default true;

-- A clip without a file must always be ready (only uploads can be pending).
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.clips'::regclass and conname = 'clips_ready_requires_file'
  ) then
    alter table public.clips
      add constraint clips_ready_requires_file check (ready or file_path is not null);
  end if;
end $$;


-- =====================================================================
-- Verification
-- =====================================================================

-- expect: 1 row — ready | boolean | NO | true
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'clips' and column_name = 'ready';

-- expect: 1 row — CHECK ((ready OR (file_path IS NOT NULL)))
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.clips'::regclass and conname = 'clips_ready_requires_file';
