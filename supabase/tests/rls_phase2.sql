-- Phase 2 RLS acceptance. Run as the Postgres role (MCP execute_sql / psql).
-- Proves: guest A cannot read or cancel guest B; helpers cannot resolve;
-- strangers see coarse public rows only; guest_sessions stay server-only.

create extension if not exists pgcrypto;

truncate incident_updates, helpers, incident_telemetry, incidents, guest_sessions cascade;

insert into guest_sessions (id, token_hash) values
  ('guest-a', encode(digest('token-a', 'sha256'), 'hex')),
  ('guest-b', encode(digest('token-b', 'sha256'), 'hex'));

insert into incidents (
  id, requester_id, requester_guest_id, requester_name, help_type, description,
  lat, lng, location_label, country_code, language, status, demo, coarse_geohash
) values
  (
    'inc-a', null, 'guest-a', 'Ada', 'medical', 'chest pain',
    37.77, -122.41, 'San Francisco', 'US', 'en', 'open', false, '9q8yy'
  ),
  (
    'inc-b', null, 'guest-b', 'Bea', 'safety', 'followed',
    48.85, 2.35, 'Paris', 'FR', 'fr', 'open', false, 'u09tv'
  );

insert into incident_telemetry (
  incident_id, lat, lng, description, requester_name, can_pay, battery_pct
) values
  ('inc-a', 37.7749, -122.4194, 'chest pain', 'Ada', false, 12),
  ('inc-b', 48.8566, 2.3522, 'followed', 'Bea', true, 40);

insert into helpers (id, incident_id, user_id, name, role, eta_minutes)
values ('help-1', 'inc-a', 'helper-1', 'Cam', 'helper', 10);

-- Guest A sees only own telemetry.
do $$
declare
  n int;
begin
  perform set_config('request.guest_id', 'guest-a', true);
  perform set_config('request.user_id', '', true);
  set local role anon;
  select count(*) into n from incident_telemetry;
  if n <> 1 then
    raise exception 'guest A telemetry count % (expected 1)', n;
  end if;
  select count(*) into n from incident_telemetry where incident_id = 'inc-b';
  if n <> 0 then
    raise exception 'guest A read guest B telemetry';
  end if;
end $$;
reset role;

-- Guest A cannot resolve / cancel guest B.
do $$
declare
  n int;
begin
  perform set_config('request.guest_id', 'guest-a', true);
  set local role anon;
  update incidents set status = 'resolved', resolved_at = now()
  where id = 'inc-b';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'guest A cancelled guest B (% rows)', n;
  end if;
end $$;
reset role;

-- Guest A can resolve own incident.
do $$
declare
  n int;
begin
  perform set_config('request.guest_id', 'guest-a', true);
  set local role anon;
  update incidents set status = 'resolved', resolved_at = now()
  where id = 'inc-a';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'guest A could not resolve own incident (% rows)', n;
  end if;
end $$;
reset role;

-- Restore inc-a to open for later checks (postgres role).
update incidents set status = 'open', resolved_at = null where id = 'inc-a';

-- Claimed helper cannot resolve.
do $$
declare
  n int;
begin
  perform set_config('request.user_id', 'helper-1', true);
  perform set_config('request.guest_id', '', true);
  perform set_config(
    'request.jwt.claims',
    '{"sub":"helper-1","role":"authenticated"}',
    true
  );
  set local role authenticated;
  update incidents set status = 'resolved' where id = 'inc-a';
  get diagnostics n = row_count;
  if n <> 0 then
    raise exception 'helper resolved requester incident (% rows)', n;
  end if;
end $$;
reset role;

-- Helper can read participant telemetry; not the other incident.
do $$
declare
  n int;
begin
  perform set_config('request.user_id', 'helper-1', true);
  perform set_config('request.jwt.claims', '{"sub":"helper-1","role":"authenticated"}', true);
  set local role authenticated;
  select count(*) into n from incident_telemetry where incident_id = 'inc-a';
  if n <> 1 then
    raise exception 'helper missed participant telemetry (% rows)', n;
  end if;
  select count(*) into n from incident_telemetry where incident_id = 'inc-b';
  if n <> 0 then
    raise exception 'helper read unrelated telemetry';
  end if;
end $$;
reset role;

-- Stranger: coarse public list only.
do $$
declare
  n int;
  has_lat boolean;
begin
  perform set_config('request.guest_id', '', true);
  perform set_config('request.user_id', '', true);
  set local role anon;
  select count(*) into n from incidents_public;
  if n < 2 then
    raise exception 'anon public list empty (% rows)', n;
  end if;
  begin
    execute 'select lat from incidents limit 1';
    raise exception 'anon read incidents.lat';
  exception
    when insufficient_privilege then
      null;
  end;
  select count(*) into n from incident_telemetry;
  if n <> 0 then
    raise exception 'anon read telemetry (% rows)', n;
  end if;
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'incidents_public'
      and column_name in ('lat', 'lng', 'can_pay', 'battery_pct')
  ) into has_lat;
  if has_lat then
    raise exception 'incidents_public exposes sensitive columns';
  end if;
end $$;
reset role;

-- guest_sessions is not granted to Data API roles.
do $$
begin
  begin
    set local role anon;
    perform 1 from guest_sessions;
    raise exception 'anon selected guest_sessions';
  exception
    when insufficient_privilege then
      null;
  end;
end $$;
reset role;

select 'rls_phase2_ok' as result;
