-- =====================================================================
-- 001_init.sql  —  Online Clipboard: database + storage setup
-- Paste into Supabase → SQL Editor → Run. Safe to run more than once.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Table: clips
-- ---------------------------------------------------------------------
create table if not exists public.clips (
  id            uuid        primary key default gen_random_uuid(),
  code          text        not null,
  text_content  text,
  file_path     text,
  file_name     text,
  file_size     bigint,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,

  constraint clips_code_unique
    unique (code),

  constraint clips_code_format
    check (code ~ '^[0-9]{6}$'),

  constraint clips_text_length
    check (char_length(text_content) <= 100000),

  constraint clips_file_size_nonneg
    check (file_size >= 0),

  -- Every clip must have non-empty text or a file (or both).
  constraint clips_has_content
    check (
      (text_content is not null and char_length(text_content) > 0)
      or file_path is not null
    ),

  -- File columns are all set together or all null.
  constraint clips_file_fields_together
    check (
      (file_path is null and file_name is null and file_size is null)
      or (file_path is not null and file_name is not null and file_size is not null)
    ),

  constraint clips_expires_after_created
    check (expires_at > created_at)
);


-- ---------------------------------------------------------------------
-- 2. Index for the cleanup job (Step 4): "delete where expires_at < now()"
-- ---------------------------------------------------------------------
create index if not exists clips_expires_at_idx
  on public.clips (expires_at);


-- ---------------------------------------------------------------------
-- 3. Row Level Security: ON, with NO policies.
--    anon / authenticated roles get nothing. The service_role key
--    (used only by our API routes) bypasses RLS.
-- ---------------------------------------------------------------------
alter table public.clips enable row level security;

-- Defense in depth: also remove table privileges from the public API roles.
revoke all on table public.clips from anon, authenticated;


-- ---------------------------------------------------------------------
-- 4. Storage: private bucket "clip-files", 25 MB per file.
--    No policies are added on storage.objects, so anon/authenticated
--    cannot read or write. The service_role key bypasses this.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('clip-files', 'clip-files', false, 26214400)   -- 25 * 1024 * 1024
on conflict (id) do update
  set public          = false,
      file_size_limit = excluded.file_size_limit;


-- =====================================================================
-- 5. Verification — each query should return the "expect" result.
-- =====================================================================

-- 5a. Table exists                         expect: 1 row, clips
select table_schema, table_name
from information_schema.tables
where table_schema = 'public' and table_name = 'clips';

-- 5b. RLS is enabled                       expect: rls_enabled = true
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
where oid = 'public.clips'::regclass;

-- 5c. No policies on clips                 expect: policy_count = 0
select count(*) as policy_count
from pg_policies
where schemaname = 'public' and tablename = 'clips';

-- 5d. Constraints are in place             expect: 8 rows (pkey, unique, 6 checks)
select conname, pg_get_constraintdef(oid) as definition
from pg_constraint
where conrelid = 'public.clips'::regclass
order by conname;

-- 5e. Bucket exists and is private         expect: public = false, file_size_limit = 26214400
select id, name, public, file_size_limit
from storage.buckets
where id = 'clip-files';
