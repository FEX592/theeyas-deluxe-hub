create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  role text not null default 'customer' check (role in ('admin', 'customer')),
  created_at timestamptz not null default now()
);

create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  invited_email text,
  created_by uuid not null references public.profiles(id) on delete cascade,
  accepted_by uuid references public.profiles(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Group', 'Channel')),
  description text not null,
  price numeric not null check (price >= 0),
  currency text not null default '₦',
  category text,
  access_link text,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique not null,
  user_id uuid references public.profiles(id) on delete set null,
  whatsapp_number text not null,
  customer_email text,
  listing_id uuid references public.listings(id) on delete set null,
  payment_reference text unique,
  payment_status text not null default 'pending' check (payment_status in ('pending', 'success', 'failed')),
  order_status text not null default 'pending' check (order_status in ('pending', 'processing', 'completed', 'failed')),
  access_link text,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists user_id uuid references public.profiles(id) on delete set null;
alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists payment_reference text unique;
alter table public.orders add column if not exists payment_status text not null default 'pending';
alter table public.orders add column if not exists order_status text not null default 'pending';
alter table public.orders add column if not exists access_link text;

alter table public.profiles enable row level security;
alter table public.admin_invites enable row level security;
alter table public.listings enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.admin_invites to authenticated;
grant select, insert, update, delete on public.listings to authenticated;
grant select, insert, update, delete on public.orders to authenticated;

drop policy if exists "Profiles are visible to the owner and admins" on public.profiles;
create policy "Profiles are visible to the owner and admins" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

drop policy if exists "Profiles are editable by the owner and admins" on public.profiles;
create policy "Profiles are editable by the owner and admins" on public.profiles
  for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

drop policy if exists "Invites are managed by admins" on public.admin_invites;
create policy "Invites are managed by admins" on public.admin_invites
  for all to authenticated using (public.is_admin()) with check (public.is_admin() and created_by = auth.uid());

drop policy if exists "Published listings are visible to signed in users" on public.listings;
create policy "Published listings are visible to signed in users" on public.listings
  for select to authenticated using (status = 'published' or public.is_admin());

drop policy if exists "Listings are managed by admins" on public.listings;
create policy "Listings are managed by admins" on public.listings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Orders are visible to the owner and admins" on public.orders;
create policy "Orders are visible to the owner and admins" on public.orders
  for select to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "Orders may be created for the current user" on public.orders;
create policy "Orders may be created for the current user" on public.orders
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "Orders are updated by admins" on public.orders;
create policy "Orders are updated by admins" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.registration_status()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('first_admin_needed', not exists (select 1 from public.profiles));
$$;

grant execute on function public.registration_status() to anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_token text;
  assigned_role text;
begin
  perform pg_advisory_xact_lock(483921);
  invite_token := nullif(new.raw_user_meta_data ->> 'invite_token', '');
  assigned_role := case when not exists (select 1 from public.profiles) then 'admin' else 'customer' end;

  insert into public.profiles (id, email, display_name, role)
  values (new.id, new.email, nullif(new.raw_user_meta_data ->> 'display_name', ''), assigned_role)
  on conflict (id) do nothing;

  if invite_token is not null then
    update public.admin_invites
    set accepted_by = new.id, accepted_at = now()
    where token = invite_token
      and accepted_at is null
      and expires_at > now()
      and (invited_email is null or lower(invited_email) = lower(new.email));

    if found then
      update public.profiles set role = 'admin' where id = new.id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.redeem_admin_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  invite_row public.admin_invites;
  current_email text;
begin
  if auth.uid() is null then
    return jsonb_build_object('success', false, 'message', 'You must sign in before redeeming an invite.');
  end if;

  select * into invite_row from public.admin_invites
  where token = invite_token and accepted_at is null and expires_at > now()
  for update;

  if not found then
    return jsonb_build_object('success', false, 'message', 'This admin invite is expired, revoked, or already used.');
  end if;

  select email into current_email from auth.users where id = auth.uid();
  if invite_row.invited_email is not null and lower(invite_row.invited_email) <> lower(current_email) then
    return jsonb_build_object('success', false, 'message', 'This invite is restricted to a different email address.');
  end if;

  update public.profiles set role = 'admin' where id = auth.uid();
  update public.admin_invites set accepted_by = auth.uid(), accepted_at = now() where id = invite_row.id;
  return jsonb_build_object('success', true, 'message', 'Administrator access added.');
end;
$$;

grant execute on function public.redeem_admin_invite(text) to authenticated;
