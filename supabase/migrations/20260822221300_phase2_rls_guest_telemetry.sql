-- Phase 2: guest sessions, telemetry split, coarse public views, RLS.
-- Predicates are ownership or incident participation — not "any authenticated".
-- guest_sessions is server-only (hashed token). Clients never choose guest ids.

create schema if not exists beacon_private;
revoke all on schema beacon_private from public;
revoke all on schema beacon_private from anon, authenticated;

create table if not exists guest_sessions (
  id text primary key,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

alter table incidents
  add column if not exists requester_guest_id text references guest_sessions (id),
  add column if not exists coarse_geohash text;

create index if not exists incidents_requester_guest_idx
  on incidents (requester_guest_id);

create table if not exists incident_telemetry (
  incident_id text primary key references incidents (id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  accuracy_m double precision,
  battery_pct integer,
  charging boolean,
  can_pay boolean not null default false,
  description text not null default '',
  requester_name text not null default ''
);

create unique index if not exists helpers_incident_user_uidx
  on helpers (incident_id, user_id)
  where user_id is not null;

create or replace function beacon_private.current_user_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.user_id', true),
      auth.jwt() ->> 'sub'
    ),
    ''
  );
$$;

create or replace function beacon_private.current_guest_id()
returns text
language sql
stable
as $$
  select nullif(
    coalesce(
      current_setting('request.guest_id', true),
      auth.jwt() ->> 'guest_id'
    ),
    ''
  );
$$;

create or replace function beacon_private.is_incident_requester(p_incident_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.incidents i
    where i.id = p_incident_id
      and (
        (
          i.requester_id is not null
          and i.requester_id = beacon_private.current_user_id()
        )
        or (
          i.requester_guest_id is not null
          and i.requester_guest_id = beacon_private.current_guest_id()
        )
      )
  );
$$;

create or replace function beacon_private.is_incident_helper(p_incident_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.helpers h
    where h.incident_id = p_incident_id
      and h.user_id is not null
      and h.user_id = beacon_private.current_user_id()
  );
$$;

create or replace function beacon_private.is_incident_participant(p_incident_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select beacon_private.is_incident_requester(p_incident_id)
      or beacon_private.is_incident_helper(p_incident_id);
$$;

revoke all on function beacon_private.current_user_id() from public;
revoke all on function beacon_private.current_guest_id() from public;
revoke all on function beacon_private.is_incident_requester(text) from public;
revoke all on function beacon_private.is_incident_helper(text) from public;
revoke all on function beacon_private.is_incident_participant(text) from public;
grant execute on function beacon_private.current_user_id() to anon, authenticated;
grant execute on function beacon_private.current_guest_id() to anon, authenticated;
grant execute on function beacon_private.is_incident_requester(text) to anon, authenticated;
grant execute on function beacon_private.is_incident_helper(text) to anon, authenticated;
grant execute on function beacon_private.is_incident_participant(text) to anon, authenticated;

create or replace view incidents_public
as
select
  id,
  help_type,
  status,
  location_label,
  country_code,
  language,
  created_at,
  updated_at,
  resolved_at,
  demo,
  coarse_geohash
from incidents;

create or replace view helpers_public
as
select
  id,
  incident_id,
  role,
  created_at
from helpers;

alter table guest_sessions enable row level security;
alter table incidents enable row level security;
alter table incident_telemetry enable row level security;
alter table incident_updates enable row level security;
alter table helpers enable row level security;
alter table chat_messages enable row level security;
alter table wallets enable row level security;
alter table transfers enable row level security;
alter table profiles enable row level security;
alter table translations enable row level security;
alter table "user" enable row level security;
alter table "session" enable row level security;
alter table "account" enable row level security;
alter table "verification" enable row level security;

drop policy if exists incidents_select_participant on incidents;
create policy incidents_select_participant
  on incidents
  for select
  to anon, authenticated
  using (beacon_private.is_incident_participant(id));

drop policy if exists incidents_insert_self on incidents;
create policy incidents_insert_self
  on incidents
  for insert
  to anon, authenticated
  with check (
    (
      requester_guest_id is not null
      and requester_guest_id = beacon_private.current_guest_id()
      and requester_id is null
    )
    or (
      requester_id is not null
      and requester_id = beacon_private.current_user_id()
    )
  );

drop policy if exists incidents_update_requester on incidents;
create policy incidents_update_requester
  on incidents
  for update
  to anon, authenticated
  using (beacon_private.is_incident_requester(id))
  with check (beacon_private.is_incident_requester(id));

drop policy if exists telemetry_select_participant on incident_telemetry;
create policy telemetry_select_participant
  on incident_telemetry
  for select
  to anon, authenticated
  using (beacon_private.is_incident_participant(incident_id));

drop policy if exists telemetry_insert_requester on incident_telemetry;
create policy telemetry_insert_requester
  on incident_telemetry
  for insert
  to anon, authenticated
  with check (beacon_private.is_incident_requester(incident_id));

drop policy if exists telemetry_update_requester on incident_telemetry;
create policy telemetry_update_requester
  on incident_telemetry
  for update
  to anon, authenticated
  using (beacon_private.is_incident_requester(incident_id))
  with check (beacon_private.is_incident_requester(incident_id));

drop policy if exists updates_select_participant on incident_updates;
create policy updates_select_participant
  on incident_updates
  for select
  to anon, authenticated
  using (beacon_private.is_incident_participant(incident_id));

drop policy if exists updates_insert_participant on incident_updates;
create policy updates_insert_participant
  on incident_updates
  for insert
  to anon, authenticated
  with check (beacon_private.is_incident_participant(incident_id));

drop policy if exists helpers_select_participant on helpers;
create policy helpers_select_participant
  on helpers
  for select
  to authenticated
  using (beacon_private.is_incident_participant(incident_id));

drop policy if exists helpers_insert_self on helpers;
create policy helpers_insert_self
  on helpers
  for insert
  to authenticated
  with check (
    user_id is not null
    and user_id = beacon_private.current_user_id()
  );

drop policy if exists helpers_update_self on helpers;
create policy helpers_update_self
  on helpers
  for update
  to authenticated
  using (
    user_id is not null
    and user_id = beacon_private.current_user_id()
  )
  with check (
    user_id is not null
    and user_id = beacon_private.current_user_id()
  );

drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own
  on profiles
  for select
  to authenticated
  using (user_id = beacon_private.current_user_id());

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own
  on profiles
  for insert
  to authenticated
  with check (user_id = beacon_private.current_user_id());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own
  on profiles
  for update
  to authenticated
  using (user_id = beacon_private.current_user_id())
  with check (user_id = beacon_private.current_user_id());

revoke all on table guest_sessions from public, anon, authenticated;
revoke all on table incidents from public, anon, authenticated;
revoke all on table incident_telemetry from public, anon, authenticated;
revoke all on table incident_updates from public, anon, authenticated;
revoke all on table helpers from public, anon, authenticated;
revoke all on table chat_messages from public, anon, authenticated;
revoke all on table wallets from public, anon, authenticated;
revoke all on table transfers from public, anon, authenticated;
revoke all on table profiles from public, anon, authenticated;
revoke all on table translations from public, anon, authenticated;
revoke all on table "user" from public, anon, authenticated;
revoke all on table "session" from public, anon, authenticated;
revoke all on table "account" from public, anon, authenticated;
revoke all on table "verification" from public, anon, authenticated;

grant select, insert, update on table incidents to anon, authenticated;
grant select, insert, update on table incident_telemetry to anon, authenticated;
grant select, insert on table incident_updates to anon, authenticated;
grant select, insert, update on table helpers to authenticated;
grant select, insert, update on table profiles to authenticated;
grant select on table incidents_public to anon, authenticated;
grant select on table helpers_public to anon, authenticated;
