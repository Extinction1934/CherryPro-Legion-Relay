-- One chamber document. Relays stay until deleted. Applied once.
create table if not exists legion_chamber (
  id text primary key,
  document jsonb not null,
  updated_at timestamptz not null default now()
);
