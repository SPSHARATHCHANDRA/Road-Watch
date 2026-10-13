-- ROADWATCH — Smart Road Monitoring System
-- Schema, Row Level Security policies and trusted functions.
-- Safe to run on a fresh Supabase project (SQL Editor -> paste -> Run).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enum types
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.incident_category as enum ('pothole','accident','waterlogging','obstruction','surface_damage','other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.incident_severity as enum ('low','medium','high','critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.incident_status as enum ('open','investigating','resolved','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.report_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.road_condition as enum ('good','fair','poor','critical');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.sensor_metric as enum ('vibration','water_level','traffic_density','surface_condition');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Administrators
-- Add an admin from the SQL editor (never from the frontend):
--   insert into public.admins (user_id) select id from auth.users where email = 'you@example.com';
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.road_segments (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 3 and 200),
  area              text not null check (char_length(area) between 1 and 100),
  latitude          double precision not null check (latitude between -90 and 90),
  longitude         double precision not null check (longitude between -180 and 180),
  length_km         numeric(6,2) not null check (length_km > 0),
  condition         public.road_condition not null default 'good',
  last_inspected_at timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.incidents (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(btrim(title)) between 3 and 150),
  category         public.incident_category not null,
  description      text not null default '' check (char_length(description) <= 2000),
  location         text not null check (char_length(btrim(location)) between 3 and 300),
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  severity         public.incident_severity not null default 'medium',
  status           public.incident_status not null default 'open',
  segment_id       uuid references public.road_segments (id) on delete set null,
  source_report_id uuid,
  is_simulated     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint incidents_coords_pair check ((latitude is null) = (longitude is null))
);

create table if not exists public.citizen_reports (
  id                   uuid primary key default gen_random_uuid(),
  reference            text not null unique,
  category             public.incident_category not null,
  location_description text not null check (char_length(btrim(location_description)) between 5 and 300),
  latitude             double precision check (latitude between -90 and 90),
  longitude            double precision check (longitude between -180 and 180),
  severity             public.incident_severity not null,
  description          text not null check (char_length(btrim(description)) between 10 and 2000),
  photo_path           text,
  status               public.report_status not null default 'pending',
  reviewer_note        text check (char_length(reviewer_note) <= 500),
  reviewed_by          uuid references auth.users (id) on delete set null,
  reviewed_at          timestamptz,
  incident_id          uuid references public.incidents (id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint citizen_reports_coords_pair check ((latitude is null) = (longitude is null))
);

do $$ begin
  alter table public.incidents
    add constraint incidents_source_report_fk foreign key (source_report_id)
    references public.citizen_reports (id) on delete set null;
exception when duplicate_object then null; end $$;

create table if not exists public.sensor_readings (
  id           uuid primary key default gen_random_uuid(),
  sensor_id    text not null check (char_length(sensor_id) between 1 and 64),
  segment_id   uuid references public.road_segments (id) on delete cascade,
  metric       public.sensor_metric not null,
  value        numeric(10,3) not null,
  unit         text not null check (char_length(unit) <= 16),
  recorded_at  timestamptz not null default now(),
  is_simulated boolean not null default true
);

create table if not exists public.incident_history (
  id          uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents (id) on delete cascade,
  action      text not null check (action in ('created','updated')),
  changes     jsonb not null default '{}'::jsonb,
  actor       uuid,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
create index if not exists incidents_created_at_idx on public.incidents (created_at desc);
create index if not exists incidents_status_idx on public.incidents (status);
create index if not exists incidents_severity_idx on public.incidents (severity);
create index if not exists incidents_category_idx on public.incidents (category);
create index if not exists incidents_segment_idx on public.incidents (segment_id);
create index if not exists citizen_reports_status_idx on public.citizen_reports (status, created_at desc);
create index if not exists sensor_readings_recorded_idx on public.sensor_readings (recorded_at desc);
create index if not exists sensor_readings_sensor_idx on public.sensor_readings (sensor_id, recorded_at desc);
create index if not exists sensor_readings_segment_idx on public.sensor_readings (segment_id, metric, recorded_at desc);
create index if not exists incident_history_incident_idx on public.incident_history (incident_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + incident history
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists road_segments_updated_at on public.road_segments;
create trigger road_segments_updated_at before update on public.road_segments
  for each row execute function public.set_updated_at();
drop trigger if exists incidents_updated_at on public.incidents;
create trigger incidents_updated_at before update on public.incidents
  for each row execute function public.set_updated_at();
drop trigger if exists citizen_reports_updated_at on public.citizen_reports;
create trigger citizen_reports_updated_at before update on public.citizen_reports
  for each row execute function public.set_updated_at();

create or replace function public.log_incident_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  diff jsonb := '{}'::jsonb;
  col  text;
begin
  if tg_op = 'INSERT' then
    insert into public.incident_history (incident_id, action, changes, actor, created_at)
    values (new.id, 'created', '{}'::jsonb, auth.uid(), new.created_at);
    return new;
  end if;
  foreach col in array array['title','category','description','location','latitude','longitude','severity','status','segment_id'] loop
    if (to_jsonb(old) -> col) is distinct from (to_jsonb(new) -> col) then
      diff := diff || jsonb_build_object(col, jsonb_build_object('from', to_jsonb(old) -> col, 'to', to_jsonb(new) -> col));
    end if;
  end loop;
  if diff <> '{}'::jsonb then
    insert into public.incident_history (incident_id, action, changes, actor)
    values (new.id, 'updated', diff, auth.uid());
  end if;
  return new;
end $$;

drop trigger if exists incidents_history on public.incidents;
create trigger incidents_history after insert or update on public.incidents
  for each row execute function public.log_incident_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.admins           enable row level security;
alter table public.road_segments    enable row level security;
alter table public.incidents        enable row level security;
alter table public.citizen_reports  enable row level security;
alter table public.sensor_readings  enable row level security;
alter table public.incident_history enable row level security;

-- admins: a signed-in user may only see their own row; no client writes.
drop policy if exists admins_select_self on public.admins;
create policy admins_select_self on public.admins for select to authenticated using (user_id = auth.uid());

-- road_segments: public read, admin write.
drop policy if exists road_segments_read on public.road_segments;
create policy road_segments_read on public.road_segments for select to anon, authenticated using (true);
drop policy if exists road_segments_admin_write on public.road_segments;
create policy road_segments_admin_write on public.road_segments for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- incidents: public read (verified road hazards are public information), admin write.
drop policy if exists incidents_read on public.incidents;
create policy incidents_read on public.incidents for select to anon, authenticated using (true);
drop policy if exists incidents_admin_insert on public.incidents;
create policy incidents_admin_insert on public.incidents for insert to authenticated with check (public.is_admin());
drop policy if exists incidents_admin_update on public.incidents;
create policy incidents_admin_update on public.incidents for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists incidents_admin_delete on public.incidents;
create policy incidents_admin_delete on public.incidents for delete to authenticated using (public.is_admin());

-- citizen_reports: private. Admins read/update/delete. No direct inserts — use submit_citizen_report().
drop policy if exists citizen_reports_admin_read on public.citizen_reports;
create policy citizen_reports_admin_read on public.citizen_reports for select to authenticated using (public.is_admin());
drop policy if exists citizen_reports_admin_update on public.citizen_reports;
create policy citizen_reports_admin_update on public.citizen_reports for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists citizen_reports_admin_delete on public.citizen_reports;
create policy citizen_reports_admin_delete on public.citizen_reports for delete to authenticated using (public.is_admin());

-- sensor_readings: public read, admin write (future devices should insert via a server function using the service role).
drop policy if exists sensor_readings_read on public.sensor_readings;
create policy sensor_readings_read on public.sensor_readings for select to anon, authenticated using (true);
drop policy if exists sensor_readings_admin_write on public.sensor_readings;
create policy sensor_readings_admin_write on public.sensor_readings for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- incident_history: admin read only; rows are written by the trigger.
drop policy if exists incident_history_admin_read on public.incident_history;
create policy incident_history_admin_read on public.incident_history for select to authenticated using (public.is_admin());

-- Defence in depth: anonymous users get read-only table privileges.
revoke insert, update, delete, truncate on all tables in schema public from anon;
revoke all on public.citizen_reports, public.incident_history, public.admins from anon;

-- ---------------------------------------------------------------------------
-- Trusted functions
-- ---------------------------------------------------------------------------

-- Public, validated report submission. Returns the reference ID only.
create or replace function public.submit_citizen_report(
  p_category             public.incident_category,
  p_location_description text,
  p_latitude             double precision,
  p_longitude            double precision,
  p_severity             public.incident_severity,
  p_description          text,
  p_photo_path           text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ref  text;
  v_loc  text := btrim(coalesce(p_location_description, ''));
  v_desc text := btrim(coalesce(p_description, ''));
begin
  if p_category is null or p_severity is null then
    raise exception 'Category and severity are required' using errcode = '22023';
  end if;
  if char_length(v_loc) not between 5 and 300 then
    raise exception 'Location must be 5-300 characters' using errcode = '22023';
  end if;
  if char_length(v_desc) not between 10 and 2000 then
    raise exception 'Description must be 10-2000 characters' using errcode = '22023';
  end if;
  if (p_latitude is null) <> (p_longitude is null) then
    raise exception 'Provide both latitude and longitude or neither' using errcode = '22023';
  end if;
  if p_latitude is not null and (p_latitude not between -90 and 90 or p_longitude not between -180 and 180) then
    raise exception 'Coordinates out of range' using errcode = '22023';
  end if;
  if p_photo_path is not null and p_photo_path !~ '^pending/[0-9a-f-]{36}\.(jpg|png|webp)$' then
    raise exception 'Invalid photo path' using errcode = '22023';
  end if;

  loop
    v_ref := 'RW-' || to_char(now() at time zone 'utc', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 5));
    exit when not exists (select 1 from public.citizen_reports where reference = v_ref);
  end loop;

  insert into public.citizen_reports (reference, category, location_description, latitude, longitude, severity, description, photo_path)
  values (v_ref, p_category, v_loc, p_latitude, p_longitude, p_severity, v_desc, p_photo_path);

  return v_ref;
end $$;

-- Public count of reports awaiting review (no report contents are exposed).
create or replace function public.pending_report_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.citizen_reports where status = 'pending';
$$;

-- Admin: approve a report and create an incident from it.
create or replace function public.approve_citizen_report(
  p_report_id uuid,
  p_title     text,
  p_severity  public.incident_severity
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  r     public.citizen_reports;
  v_id  uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  select * into r from public.citizen_reports where id = p_report_id for update;
  if not found then
    raise exception 'Report not found' using errcode = 'P0002';
  end if;
  if r.status <> 'pending' then
    raise exception 'Report has already been reviewed' using errcode = '22023';
  end if;

  insert into public.incidents (title, category, description, location, latitude, longitude, severity, status, source_report_id)
  values (btrim(p_title), r.category, r.description, r.location_description, r.latitude, r.longitude, p_severity, 'open', r.id)
  returning id into v_id;

  update public.citizen_reports
     set status = 'approved', incident_id = v_id, reviewed_by = auth.uid(), reviewed_at = now()
   where id = r.id;

  return v_id;
end $$;

-- Admin: reject a report with an optional note.
create or replace function public.reject_citizen_report(p_report_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
  update public.citizen_reports
     set status = 'rejected', reviewer_note = nullif(left(btrim(coalesce(p_note, '')), 500), ''), reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_report_id and status = 'pending';
  if not found then
    raise exception 'Report not found or already reviewed' using errcode = '22023';
  end if;
end $$;

revoke execute on function public.submit_citizen_report(public.incident_category, text, double precision, double precision, public.incident_severity, text, text) from public;
revoke execute on function public.approve_citizen_report(uuid, text, public.incident_severity) from public, anon;
revoke execute on function public.reject_citizen_report(uuid, text) from public, anon;
revoke execute on function public.log_incident_change() from public, anon, authenticated;
grant execute on function public.submit_citizen_report(public.incident_category, text, double precision, double precision, public.incident_severity, text, text) to anon, authenticated;
grant execute on function public.pending_report_count() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.approve_citizen_report(uuid, text, public.incident_severity) to authenticated;
grant execute on function public.reject_citizen_report(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for report photos (max 5 MB, images only)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may upload a new file into the "pending/" folder (no overwrite, no listing, no reading).
drop policy if exists report_photos_public_upload on storage.objects;
create policy report_photos_public_upload on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'report-photos' and (storage.foldername(name))[1] = 'pending');

-- Only administrators can view or delete photos.
drop policy if exists report_photos_admin_read on storage.objects;
create policy report_photos_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'report-photos' and public.is_admin());
drop policy if exists report_photos_admin_delete on storage.objects;
create policy report_photos_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'report-photos' and public.is_admin());
