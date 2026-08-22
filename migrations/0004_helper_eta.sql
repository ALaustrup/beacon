-- Helper commitment ETA. Null on older rows and seed helpers.
alter table helpers add column if not exists eta_minutes integer;
