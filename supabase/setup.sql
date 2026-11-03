-- Quennie backoffice: tables, access rules and photo storage.
-- Run once in Supabase Dashboard > SQL Editor. Safe to re-run.
--
-- Model: one table per collection. Each row keeps the record as JSON in `data`,
-- the shape the app already uses (src/lib/types.ts), so new fields need no migration.
--
-- Access: only studio staff, i.e. users whose app_metadata.role is 'staff'.
-- app_metadata can only be changed by an admin (unlike user_metadata), so a person
-- who signs up on their own gets no access to any row.

-- 1. Who counts as staff -------------------------------------------------------

create schema if not exists private;

create or replace function private.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role') = 'staff', false)
$$;

grant usage on schema private to authenticated;
grant execute on function private.is_staff() to authenticated;

-- 2. Collections ---------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['clients', 'projects', 'products', 'invoices', 'appointments', 'inspirations'] loop
    execute format($f$
      create table if not exists public.%1$I (
        id text primary key,
        data jsonb not null default '{}'::jsonb,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      alter table public.%1$I enable row level security;

      revoke all on public.%1$I from anon;
      grant select, insert, update, delete on public.%1$I to authenticated;

      drop policy if exists "staff read %1$s" on public.%1$I;
      create policy "staff read %1$s" on public.%1$I for select to authenticated using ((select private.is_staff()));

      drop policy if exists "staff insert %1$s" on public.%1$I;
      create policy "staff insert %1$s" on public.%1$I for insert to authenticated with check ((select private.is_staff()));

      drop policy if exists "staff update %1$s" on public.%1$I;
      create policy "staff update %1$s" on public.%1$I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()));

      drop policy if exists "staff delete %1$s" on public.%1$I;
      create policy "staff delete %1$s" on public.%1$I for delete to authenticated using ((select private.is_staff()));

      create index if not exists %1$s_created_at_idx on public.%1$I (created_at desc);
    $f$, t);
  end loop;
end
$$;

-- 3. Photos (inspirations taken on site, project covers) -----------------------
-- Public read so <img> tags work without signed URLs; file names are random UUIDs.
-- Only staff can upload, replace or delete.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "staff upload media" on storage.objects;
create policy "staff upload media" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and (select private.is_staff()));

drop policy if exists "staff read media" on storage.objects;
create policy "staff read media" on storage.objects for select to authenticated
  using (bucket_id = 'media' and (select private.is_staff()));

drop policy if exists "staff update media" on storage.objects;
create policy "staff update media" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (select private.is_staff()))
  with check (bucket_id = 'media' and (select private.is_staff()));

drop policy if exists "staff delete media" on storage.objects;
create policy "staff delete media" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (select private.is_staff()));

-- 4. Give the studio account its access ----------------------------------------
-- Create the user first (Authentication > Users > Add user, "Auto Confirm User"),
-- then this line marks it as staff. Repeat for each new team member.

update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role": "staff"}'::jsonb
where email = 'melissa@quennie.app';
