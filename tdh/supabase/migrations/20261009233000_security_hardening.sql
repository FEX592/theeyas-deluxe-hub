-- TDH security hardening. Safe for existing profiles, listings, orders, and payment history.
begin;

-- Public catalogue surface intentionally excludes all invitation/access links.
create or replace view public.published_listings
with (security_invoker = true)
as
select id, name, type, description, price, currency, category, status, created_at
from public.listings
where status = 'published';

grant select on public.published_listings to anon, authenticated;

-- Customers may read only catalogue columns from the base table. Private listing links
-- remain available only to trusted server-side/admin operations.
revoke select on public.listings from anon, authenticated;
grant select (id, name, type, description, price, currency, category, status, created_at)
  on public.listings to anon, authenticated;

-- Profiles are created by the auth trigger/bootstrap flow, not by browser clients.
revoke insert, delete on public.profiles from anon, authenticated;
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Protect the role column even from a client that attempts to use a broad update grant.
create or replace function public.prevent_profile_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and current_user not in ('postgres', 'service_role') then
    raise exception 'Profile roles can only be changed by trusted server operations';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_role on public.profiles;
create trigger protect_profile_role
before update on public.profiles
for each row execute function public.prevent_profile_role_escalation();

-- Trusted admin snapshot for the existing admin workspace. The function is callable only
-- by a confirmed administrator and is intentionally not exposed as a table read.
create or replace function public.admin_listing_snapshot()
returns setof public.listings
language sql
security definer
stable
set search_path = public
as $$
  select l.* from public.listings l
  where public.is_admin();
$$;

revoke all on function public.admin_listing_snapshot() from public, anon;
grant execute on function public.admin_listing_snapshot() to authenticated;

create or replace function public.admin_order_snapshot()
returns setof public.orders
language sql
security definer
stable
set search_path = public
as $$
  select o.* from public.orders o
  where public.is_admin();
$$;

create or replace function public.admin_update_order(
  p_order_id uuid,
  p_order_status text,
  p_access_link text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  order_row public.orders;
  normalized_link text := nullif(trim(p_access_link), '');
begin
  if not public.is_admin() then raise exception 'Administrator access is required'; end if;
  if p_order_status not in ('pending','processing','completed','failed') then
    raise exception 'Invalid order status';
  end if;
  select * into order_row from public.orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if p_order_status = 'completed' and (order_row.payment_status <> 'success' or normalized_link is null) then
    raise exception 'An order requires confirmed payment and a fulfillment link before completion';
  end if;
  update public.orders
  set order_status = p_order_status,
      access_link = case when p_order_status = 'completed' then normalized_link else null end
  where id = p_order_id;
  return jsonb_build_object('success', true, 'order_id', p_order_id, 'order_status', p_order_status);
end;
$$;

revoke all on function public.admin_order_snapshot() from public, anon;
grant execute on function public.admin_order_snapshot() to authenticated;
revoke all on function public.admin_update_order(uuid,text,text) from public, anon;
grant execute on function public.admin_update_order(uuid,text,text) to authenticated;

-- Customer order lookup requires both ownership and a private second factor. Fulfillment
-- links are returned only after payment and completion have both been recorded.
create or replace function public.lookup_customer_order(p_order_id text, p_whatsapp_number text)
returns table (
  id uuid,
  order_id text,
  user_id uuid,
  whatsapp_number text,
  customer_email text,
  listing_id uuid,
  payment_reference text,
  payment_status text,
  order_status text,
  access_link text,
  created_at timestamptz
)
language sql
security definer
stable
set search_path = public
as $$
  select o.id, o.order_id, o.user_id, o.whatsapp_number, o.customer_email, o.listing_id,
         o.payment_reference, o.payment_status, o.order_status,
         case when o.payment_status = 'success' and o.order_status = 'completed'
              then o.access_link else null end,
         o.created_at
  from public.orders o
  where o.order_id = p_order_id
    and o.whatsapp_number = p_whatsapp_number
    and o.user_id = auth.uid();
$$;

revoke all on function public.lookup_customer_order(text, text) from public, anon;
grant execute on function public.lookup_customer_order(text, text) to authenticated;

-- SECURITY DEFINER helpers must never be callable anonymously.
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.handle_user_email_confirmed() from anon, authenticated;
revoke execute on function public.is_admin() from anon;
revoke execute on function public.redeem_admin_invite(text) from anon;
revoke execute on function public.registration_status() from anon;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.redeem_admin_invite(text) to authenticated;

commit;
