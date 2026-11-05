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
  foreach t in array array['clients', 'projects', 'products', 'invoices', 'appointments', 'inspirations', 'leads', 'templates', 'outreach', 'posts'] loop
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

-- 2b. Quote requests from the public site --------------------------------------
-- The site cannot read anything: it may only call this function, which checks the
-- input and writes one row in `leads`. Anonymous visitors have no other access.

create or replace function public.submit_lead(payload jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean jsonb;
  new_id text;
  phone_digits text := regexp_replace(coalesce(payload ->> 'phone', ''), '\D', '', 'g');
  str text;
begin
  if jsonb_typeof(payload) is distinct from 'object' then
    raise exception 'invalid payload';
  end if;
  -- Honeypot: a hidden field real visitors never fill.
  if coalesce(payload ->> 'website', '') <> '' then
    return null;
  end if;
  if length(trim(coalesce(payload ->> 'name', ''))) not between 1 and 120 then
    raise exception 'invalid name';
  end if;
  if length(phone_digits) not between 6 and 20 and coalesce(payload ->> 'email', '') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'phone or email required';
  end if;
  foreach str in array array['phone', 'email', 'space', 'country', 'city', 'timing'] loop
    if length(coalesce(payload ->> str, '')) > 160 then
      raise exception 'field too long: %', str;
    end if;
  end loop;
  if length(coalesce(payload ->> 'message', '')) > 3000 or length(coalesce(payload ->> 'preferences', '')) > 1000 then
    raise exception 'text too long';
  end if;
  if jsonb_typeof(coalesce(payload -> 'services', '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(payload -> 'services', '[]'::jsonb)) > 12 then
    raise exception 'invalid services';
  end if;

  -- The same person pressing send twice within ten minutes counts once.
  if length(phone_digits) >= 6 and exists (
    select 1 from public.leads
    where created_at > now() - interval '10 minutes'
      and regexp_replace(coalesce(data ->> 'phone', ''), '\D', '', 'g') = phone_digits
  ) then
    return null;
  end if;

  clean := jsonb_strip_nulls(jsonb_build_object(
    'name', trim(payload ->> 'name'),
    'phone', nullif(trim(coalesce(payload ->> 'phone', '')), ''),
    'email', nullif(trim(coalesce(payload ->> 'email', '')), ''),
    'space', nullif(payload ->> 'space', ''),
    'services', coalesce(payload -> 'services', '[]'::jsonb),
    'country', nullif(payload ->> 'country', ''),
    'city', nullif(payload ->> 'city', ''),
    'timing', nullif(payload ->> 'timing', ''),
    'message', nullif(trim(coalesce(payload ->> 'message', '')), ''),
    'preferences', nullif(payload ->> 'preferences', ''),
    'source', 'Site',
    'status', 'Novo',
    'receivedAt', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ));
  new_id := 'le-' || substr(md5(gen_random_uuid()::text), 1, 8);
  insert into public.leads (id, data) values (new_id, clean);
  return new_id;
end
$$;

revoke all on function public.submit_lead(jsonb) from public;
grant execute on function public.submit_lead(jsonb) to anon, authenticated;

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
