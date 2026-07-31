create table if not exists public.ensaar_events (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ensaar_events_created_at_idx
  on public.ensaar_events (created_at desc);

alter table public.ensaar_events enable row level security;

-- Basecamp reaches this table only through server routes using the service role key.
-- No anon policy is defined, so the public site cannot read or write it directly.
