create table if not exists public.ensaar_leads (
  id text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ensaar_leads_created_at_idx
  on public.ensaar_leads (created_at desc);

alter table public.ensaar_leads enable row level security;

-- The website accesses this table only through server routes with the service role key.
