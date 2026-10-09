begin;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon_reference text,
  sort_order integer not null default 0,
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.listings add column if not exists slug text;
alter table public.listings add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.listings add column if not exists image_url text;
alter table public.listings add column if not exists availability text not null default 'available' check (availability in ('available','unavailable'));
alter table public.listings add column if not exists featured boolean not null default false;
alter table public.listings add column if not exists fulfillment_mode text not null default 'manual' check (fulfillment_mode in ('automatic','manual'));
alter table public.listings add column if not exists product_notes text;
alter table public.listings add column if not exists updated_at timestamptz not null default now();

insert into public.categories (name, slug)
select distinct trim(l.category), lower(regexp_replace(trim(l.category), '[^a-zA-Z0-9]+', '-', 'g'))
from public.listings l
where nullif(trim(l.category), '') is not null
on conflict (slug) do nothing;

update public.listings l
set category_id = c.id
from public.categories c
where l.category_id is null
  and nullif(trim(l.category), '') is not null
  and c.slug = lower(regexp_replace(trim(l.category), '[^a-zA-Z0-9]+', '-', 'g'));

update public.listings
set slug = lower(regexp_replace(trim(name), '[^a-zA-Z0-9]+', '-', 'g')) || '-' || left(id::text, 8)
where slug is null or slug = '';

create unique index if not exists listings_slug_unique on public.listings(slug);
create index if not exists listings_public_filters on public.listings(status, availability, featured, created_at desc);

create table if not exists public.listing_private_links (
  listing_id uuid primary key references public.listings(id) on delete cascade,
  internal_source_url text,
  customer_access_url text,
  source_hash text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.order_fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  access_url text not null,
  fulfillment_mode text not null check (fulfillment_mode in ('automatic','manual')),
  delivered_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.orders add column if not exists customer_name text;
alter table public.orders add column if not exists product_name_snapshot text;
alter table public.orders add column if not exists product_type_snapshot text;
alter table public.orders add column if not exists product_description_snapshot text;
alter table public.orders add column if not exists unit_amount numeric;
alter table public.orders add column if not exists total_amount numeric;
alter table public.orders add column if not exists currency text;
alter table public.orders add column if not exists tracking_token_hash text;
alter table public.orders add column if not exists updated_at timestamptz not null default now();
alter table public.orders add column if not exists paid_at timestamptz;
alter table public.orders add column if not exists completed_at timestamptz;

drop view if exists public.published_listings;
create view public.published_listings
with (security_invoker = true)
as
select l.id, l.slug, l.name, l.type, l.description, l.price, l.currency, l.category,
       l.category_id, l.image_url, l.availability, l.featured, l.fulfillment_mode,
       l.product_notes, l.status, l.created_at, l.updated_at
from public.listings l
where l.status = 'published' and l.availability = 'available';

grant select (id, slug, name, type, description, price, currency, category, category_id, image_url, availability, featured, fulfillment_mode, product_notes, status, created_at, updated_at)
  on public.listings to anon, authenticated;
grant select on public.published_listings to anon, authenticated;

alter table public.categories enable row level security;
alter table public.listing_private_links enable row level security;
alter table public.order_fulfillments enable row level security;
revoke all on public.listing_private_links from anon, authenticated;
revoke all on public.order_fulfillments from anon, authenticated;
revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
drop policy if exists categories_public_active on public.categories;
create policy categories_public_active on public.categories for select to anon, authenticated using (status = 'active');

commit;
