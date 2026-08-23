-- Current Beacon app tables (parity with migrations/0001–0004).
-- Applied on the Supabase development project so Preview can later point
-- DATABASE_URL here without a product-schema rewrite. Phase 2 security
-- objects live in the following migration.

create table if not exists "user" (
  "id" text not null primary key,
  "name" text not null,
  "email" text not null unique,
  "emailVerified" boolean not null,
  "image" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create table if not exists "session" (
  "id" text not null primary key,
  "expiresAt" timestamptz not null,
  "token" text not null unique,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null,
  "ipAddress" text,
  "userAgent" text,
  "userId" text not null references "user" ("id") on delete cascade
);

create table if not exists "account" (
  "id" text not null primary key,
  "accountId" text not null,
  "providerId" text not null,
  "userId" text not null references "user" ("id") on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  "scope" text,
  "password" text,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz not null
);

create table if not exists "verification" (
  "id" text not null primary key,
  "identifier" text not null,
  "value" text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz default CURRENT_TIMESTAMP not null,
  "updatedAt" timestamptz default CURRENT_TIMESTAMP not null
);

create index if not exists "session_userId_idx" on "session" ("userId");
create index if not exists "account_userId_idx" on "account" ("userId");
create index if not exists "verification_identifier_idx" on "verification" ("identifier");

create table if not exists incidents (
  id text primary key,
  requester_id text,
  requester_name text not null,
  help_type text not null,
  description text not null,
  lat double precision not null,
  lng double precision not null,
  location_label text not null,
  country_code text,
  accuracy_m double precision,
  battery_pct integer,
  charging boolean,
  can_pay boolean not null default false,
  language text not null default 'en',
  status text not null default 'open',
  aid_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  demo boolean not null default false
);

create index if not exists incidents_status_idx on incidents (status);
create index if not exists incidents_created_idx on incidents (created_at desc);
create index if not exists incidents_geo_idx on incidents (lat, lng);
create index if not exists incidents_demo_idx on incidents (demo);

create table if not exists incident_updates (
  id text primary key,
  incident_id text not null references incidents (id) on delete cascade,
  author_id text,
  author_name text not null,
  kind text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists incident_updates_incident_idx
  on incident_updates (incident_id, created_at);

create table if not exists helpers (
  id text primary key,
  incident_id text not null references incidents (id) on delete cascade,
  user_id text,
  name text not null,
  role text not null,
  created_at timestamptz not null default now(),
  eta_minutes integer
);

create index if not exists helpers_incident_idx on helpers (incident_id);

create table if not exists chat_messages (
  id text primary key,
  channel text not null default 'world',
  incident_id text,
  author_id text,
  author_name text not null,
  lang text not null default 'en',
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_channel_idx
  on chat_messages (channel, created_at);
create index if not exists chat_messages_incident_idx
  on chat_messages (incident_id, created_at);

create table if not exists wallets (
  user_id text primary key,
  balance_cents integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists transfers (
  id text primary key,
  from_user_id text not null,
  from_name text not null,
  to_user_id text,
  to_incident_id text,
  amount_cents integer not null,
  memo text,
  created_at timestamptz not null default now()
);

create index if not exists transfers_from_idx on transfers (from_user_id, created_at desc);
create index if not exists transfers_incident_idx on transfers (to_incident_id);

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  language text not null default 'en',
  radius_km integer,
  notify_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists translations (
  source_hash text not null,
  target_lang text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  primary key (source_hash, target_lang)
);
