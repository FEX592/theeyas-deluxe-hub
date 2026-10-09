-- Provider-neutral payment core. This migration is local; review and apply separately.
-- Credentials are stored only in Supabase Vault, never in a public table.

create table if not exists public.payment_providers (
  adapter_key text primary key,
  display_name text not null,
  enabled boolean not null default true,
  active boolean not null default false,
  environment text not null default 'test' check (environment in ('test', 'live')),
  capabilities text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.payment_providers (adapter_key, display_name, enabled, capabilities)
values ('paystack', 'Paystack', true, array['payment_initialization','payment_verification','payment_status','webhooks','redirect_checkout'])
on conflict (adapter_key) do update
set display_name = excluded.display_name,
    enabled = excluded.enabled,
    capabilities = excluded.capabilities,
    updated_at = now();

create unique index if not exists payment_providers_one_active_idx
  on public.payment_providers (active) where active = true;

create table if not exists public.payment_provider_configs (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.payment_providers(adapter_key),
  environment text not null check (environment in ('test', 'live')),
  version integer not null check (version > 0),
  vault_secret_id uuid not null,
  is_current boolean not null default true,
  connection_verified_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (provider_key, environment, version)
);

create unique index if not exists payment_provider_configs_one_current_idx
  on public.payment_provider_configs (provider_key, environment) where is_current = true;

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider_key text not null references public.payment_providers(adapter_key),
  config_version_id uuid not null references public.payment_provider_configs(id) on delete restrict,
  internal_reference text not null unique,
  provider_reference text,
  provider_transaction_id text,
  amount numeric(14,2) not null check (amount > 0),
  provider_fee numeric(14,2) check (provider_fee is null or provider_fee >= 0),
  total_charged numeric(14,2) check (total_charged is null or total_charged >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('uninitialized','pending','processing','paid','failed','cancelled','expired','refunded','partially_refunded','unknown')),
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_key, provider_reference)
);

create index if not exists payment_transactions_order_idx on public.payment_transactions(order_id, created_at desc);
create index if not exists payment_transactions_provider_status_idx on public.payment_transactions(provider_key, status, created_at desc);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_key text not null references public.payment_providers(adapter_key),
  provider_event_id text not null,
  event_type text not null,
  payload_hash text not null,
  processed boolean not null default false,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_key, provider_event_id)
);

create table if not exists public.payment_provider_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  provider_key text not null references public.payment_providers(adapter_key),
  result text not null check (result in ('success','failure')),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists payment_provider text;
alter table public.orders add column if not exists payment_transaction_id uuid references public.payment_transactions(id) on delete set null;

-- Existing transactions in this app used Paystack. Keep that association permanently.
update public.orders
set payment_provider = 'paystack'
where payment_provider is null and payment_reference is not null;

alter table public.payment_providers enable row level security;
alter table public.payment_provider_configs enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.payment_provider_audit_log enable row level security;

revoke all on public.payment_providers from public, anon, authenticated;
revoke all on public.payment_provider_configs from public, anon, authenticated;
revoke all on public.payment_transactions from public, anon, authenticated;
revoke all on public.payment_webhook_events from public, anon, authenticated;
revoke all on public.payment_provider_audit_log from public, anon, authenticated;
grant all on public.payment_providers to service_role;
grant all on public.payment_provider_configs to service_role;
grant all on public.payment_transactions to service_role;
grant all on public.payment_webhook_events to service_role;
grant all on public.payment_provider_audit_log to service_role;

create or replace function public.write_payment_provider_config(
  p_provider_key text,
  p_environment text,
  p_credentials jsonb,
  p_actor uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  next_version integer;
  new_secret_id uuid;
  new_config_id uuid;
begin
  if p_environment not in ('test', 'live') then raise exception 'Invalid environment'; end if;
  if p_credentials is null or jsonb_typeof(p_credentials) <> 'object' then raise exception 'Credentials must be an object'; end if;
  if not exists (select 1 from public.payment_providers where adapter_key = p_provider_key and enabled = true) then
    raise exception 'Provider adapter is not installed';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.payment_provider_configs
  where provider_key = p_provider_key and environment = p_environment;

  new_secret_id := vault.create_secret(
    p_credentials::text,
    'payment:' || p_provider_key || ':' || p_environment || ':v' || next_version::text,
    'Encrypted payment provider credentials'
  );

  update public.payment_provider_configs
  set is_current = false
  where provider_key = p_provider_key and environment = p_environment and is_current = true;

  -- A key rotation in the currently active environment requires a fresh connection test.
  update public.payment_providers
  set active = false, updated_at = now()
  where adapter_key = p_provider_key and active = true and environment = p_environment;

  insert into public.payment_provider_configs (provider_key, environment, version, vault_secret_id, is_current, created_by)
  values (p_provider_key, p_environment, next_version, new_secret_id, true, p_actor)
  returning id into new_config_id;

  return new_config_id;
end;
$$;

create or replace function public.read_payment_provider_credentials(
  p_provider_key text,
  p_config_version_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  secret_json jsonb;
begin
  select decrypted_secret::jsonb into secret_json
  from public.payment_provider_configs c
  join vault.decrypted_secrets d on d.id = c.vault_secret_id
  where c.provider_key = p_provider_key
    and ((p_config_version_id is not null and c.id = p_config_version_id)
      or (p_config_version_id is null and c.is_current = true))
  order by c.created_at desc
  limit 1;
  return secret_json;
end;
$$;

create or replace function public.mark_payment_provider_tested(p_config_version_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_provider_configs
  set connection_verified_at = now()
  where id = p_config_version_id;
  if not found then raise exception 'Provider configuration not found'; end if;
end;
$$;

create or replace function public.activate_payment_provider(
  p_provider_key text,
  p_environment text,
  p_config_version_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.payment_provider_configs
    where id = p_config_version_id and provider_key = p_provider_key
      and environment = p_environment and is_current = true
      and connection_verified_at is not null
  ) then raise exception 'Provider configuration must be tested before activation'; end if;
  if not exists (select 1 from public.payment_providers where adapter_key = p_provider_key and enabled = true) then
    raise exception 'Provider adapter is not installed';
  end if;
  update public.payment_providers set active = false, updated_at = now() where active = true;
  update public.payment_providers set active = true, environment = p_environment, updated_at = now()
  where adapter_key = p_provider_key;
end;
$$;

create or replace function public.apply_payment_result(
  p_transaction_id uuid,
  p_status text,
  p_provider_transaction_id text default null,
  p_paid_at timestamptz default null,
  p_failure_reason text default null,
  p_provider_fee numeric default null,
  p_total_charged numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  transaction_row public.payment_transactions;
begin
  if p_status not in ('pending','processing','paid','failed','cancelled','expired','refunded','partially_refunded','unknown') then
    raise exception 'Invalid payment status';
  end if;
  select * into transaction_row from public.payment_transactions where id = p_transaction_id for update;
  if not found then raise exception 'Payment transaction not found'; end if;
  if transaction_row.status = 'paid' then
    return jsonb_build_object('status','paid','already_paid',true,'order_id',transaction_row.order_id);
  end if;

  update public.payment_transactions
  set status = p_status,
      provider_transaction_id = coalesce(p_provider_transaction_id, provider_transaction_id),
      provider_fee = coalesce(p_provider_fee, provider_fee),
      total_charged = coalesce(p_total_charged, total_charged),
      paid_at = case when p_status = 'paid' then coalesce(p_paid_at, now()) else paid_at end,
      failure_reason = case when p_status = 'paid' then null else left(coalesce(p_failure_reason,''), 240) end,
      updated_at = now()
  where id = p_transaction_id;

  if p_status = 'paid' then
    update public.orders set payment_status = 'success', order_status = 'processing', payment_provider = transaction_row.provider_key,
      payment_transaction_id = transaction_row.id, payment_reference = coalesce(transaction_row.provider_reference, transaction_row.internal_reference)
    where id = transaction_row.order_id;
  elsif p_status in ('failed','cancelled','expired') then
    update public.orders set payment_status = 'failed', order_status = 'failed'
    where id = transaction_row.order_id and payment_status <> 'success';
  else
    update public.orders set payment_status = 'pending'
    where id = transaction_row.order_id and payment_status <> 'success';
  end if;
  return jsonb_build_object('status',p_status,'already_paid',false,'order_id',transaction_row.order_id);
end;
$$;

revoke all on function public.write_payment_provider_config(text,text,jsonb,uuid) from public, anon, authenticated;
revoke all on function public.read_payment_provider_credentials(text,uuid) from public, anon, authenticated;
revoke all on function public.mark_payment_provider_tested(uuid) from public, anon, authenticated;
revoke all on function public.activate_payment_provider(text,text,uuid) from public, anon, authenticated;
revoke all on function public.apply_payment_result(uuid,text,text,timestamptz,text,numeric,numeric) from public, anon, authenticated;
grant execute on function public.write_payment_provider_config(text,text,jsonb,uuid) to service_role;
grant execute on function public.read_payment_provider_credentials(text,uuid) to service_role;
grant execute on function public.mark_payment_provider_tested(uuid) to service_role;
grant execute on function public.activate_payment_provider(text,text,uuid) to service_role;
grant execute on function public.apply_payment_result(uuid,text,text,timestamptz,text,numeric,numeric) to service_role;
