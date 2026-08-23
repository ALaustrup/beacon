-- Advisor fixes: invoker views + column grants (no exact coords via PostgREST),
-- and immutable search_path on session helpers.

create or replace function beacon_private.current_user_id()
returns text
language sql
stable
set search_path = public, pg_temp
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
set search_path = public, pg_temp
as $$
  select nullif(
    coalesce(
      current_setting('request.guest_id', true),
      auth.jwt() ->> 'guest_id'
    ),
    ''
  );
$$;

drop view if exists incidents_public;
drop view if exists helpers_public;

create view incidents_public
with (security_invoker = true)
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

create view helpers_public
with (security_invoker = true)
as
select
  id,
  incident_id,
  role,
  created_at
from helpers;

-- Coarse list is public. Exact coords stay off these grants (telemetry table).
drop policy if exists incidents_select_participant on incidents;
drop policy if exists incidents_select_coarse on incidents;
create policy incidents_select_coarse
  on incidents
  for select
  to anon, authenticated
  using (true);

drop policy if exists helpers_select_public_roles on helpers;
create policy helpers_select_public_roles
  on helpers
  for select
  to anon, authenticated
  using (true);

revoke select, insert, update on table incidents from anon, authenticated;
revoke select, insert, update on table helpers from anon, authenticated;

grant select (
  id,
  requester_id,
  requester_guest_id,
  help_type,
  location_label,
  country_code,
  language,
  status,
  aid_cents,
  created_at,
  updated_at,
  resolved_at,
  demo,
  coarse_geohash
) on incidents to anon, authenticated;

grant insert (
  id,
  requester_id,
  requester_guest_id,
  requester_name,
  help_type,
  description,
  lat,
  lng,
  location_label,
  country_code,
  accuracy_m,
  battery_pct,
  charging,
  can_pay,
  language,
  status,
  aid_cents,
  created_at,
  updated_at,
  resolved_at,
  demo,
  coarse_geohash
) on incidents to anon, authenticated;

grant update (status, resolved_at, updated_at) on incidents to anon, authenticated;

grant select (id, incident_id, role, created_at) on helpers to anon, authenticated;
grant insert (
  id, incident_id, user_id, name, role, created_at, eta_minutes
) on helpers to authenticated;
grant update (eta_minutes, role, name) on helpers to authenticated;

grant select on incidents_public to anon, authenticated;
grant select on helpers_public to anon, authenticated;
