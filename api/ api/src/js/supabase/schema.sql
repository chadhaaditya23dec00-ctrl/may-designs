-- ============================================================
-- MAY DESIGNS — catalogue storage
-- Paste this into Supabase → SQL Editor → Run.
-- ============================================================
-- The whole catalogue lives in one JSONB row. That sounds crude
-- and is deliberate: the admin panel already produces a complete
-- products.json, edits are made by one person, and a single row
-- means add / remove / reprice / sold-out are all the same write
-- with no chance of a half-applied change.

create table if not exists catalogue (
  id         int primary key default 1,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  constraint catalogue_singleton check (id = 1)
);

-- Keep a history so a bad publish is one query away from undone.
create table if not exists catalogue_history (
  version    bigserial primary key,
  data       jsonb       not null,
  created_at timestamptz not null default now()
);

create or replace function snapshot_catalogue() returns trigger
language plpgsql as $$
begin
  insert into catalogue_history (data) values (old.data);
  return new;
end $$;

drop trigger if exists catalogue_snapshot on catalogue;
create trigger catalogue_snapshot before update on catalogue
  for each row execute function snapshot_catalogue();

-- ============================================================
-- Row Level Security
-- ============================================================
-- Both tables are locked to everyone. No policies are created,
-- so the anon key can neither read nor write. The storefront
-- never talks to Supabase directly — it goes through /api/catalogue,
-- which uses the service role key from Vercel's env vars.
-- This is why the service role key must never reach the browser.

alter table catalogue         enable row level security;
alter table catalogue_history enable row level security;

-- Seed row. Replace {} on first publish from the admin panel.
insert into catalogue (id, data) values (1, '{}'::jsonb)
  on conflict (id) do nothing;
