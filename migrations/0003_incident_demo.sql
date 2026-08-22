-- Demo vs real signals. Production with BEACON_DEMO=false never shows demo rows.
alter table incidents add column if not exists demo boolean not null default false;

create index if not exists incidents_demo_idx on incidents (demo);
