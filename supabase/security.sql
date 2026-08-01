-- Durable, atomic counters for unauthenticated write and authentication routes.
create table if not exists public.ensaar_rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

create or replace function public.consume_ensaar_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_reset timestamptz;
begin
  insert into public.ensaar_rate_limits as rate_limit (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update
    set count = case when rate_limit.reset_at <= now() then 1 else rate_limit.count + 1 end,
        reset_at = case when rate_limit.reset_at <= now() then now() + make_interval(secs => p_window_seconds) else rate_limit.reset_at end
  returning count, reset_at into v_count, v_reset;

  allowed := v_count <= p_limit;
  remaining := greatest(0, p_limit - v_count);
  retry_after := greatest(0, ceil(extract(epoch from (v_reset - now())))::integer);
  return next;
end;
$$;

create table if not exists public.ensaar_basecamp_sessions (
  id uuid primary key,
  token_hash text unique not null,
  auth_version text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ensaar_basecamp_sessions_expires_at_idx
  on public.ensaar_basecamp_sessions (expires_at);

alter table public.ensaar_rate_limits enable row level security;
alter table public.ensaar_basecamp_sessions enable row level security;
