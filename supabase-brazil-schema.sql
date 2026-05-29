-- Mercado Livre Brasil SKU Profit Dashboard
-- Supabase schema for a fresh Brazil project.
-- Safe to paste into the Supabase SQL Editor and run.
--
-- Note: Some columns intentionally keep the legacy "_mxn" suffix because the
-- current application code still reads/writes those column names. In this
-- Brazil project, those values represent BRL amounts unless stated otherwise.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.orders (
  id bigserial primary key,
  order_no text not null,
  platform text not null default 'Mercado Livre Brasil',
  site_id text not null default 'MLB',
  country text not null default 'Brazil',
  currency text not null default 'BRL',
  status text,
  revenue numeric(14, 2) not null default 0,
  product_cost numeric(14, 2) not null default 0,
  shipping_cost numeric(14, 2) not null default 0,
  last_mile_fee numeric(14, 2) not null default 0,
  platform_fee numeric(14, 2) not null default 0,
  platform_tax numeric(14, 2) not null default 0,
  ad_cost numeric(14, 2) not null default 0,
  refund_amount numeric(14, 2) not null default 0,
  other_fee numeric(14, 2) not null default 0,
  exchange_rate_to_usd numeric(14, 6) not null default 1,
  exchange_rate_mxn_to_cny numeric(14, 6) not null default 1,
  ordered_at timestamptz not null,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_order_no_key unique (order_no)
);

comment on column public.orders.revenue is
  'Local marketplace revenue. For the Brazil project this is BRL.';
comment on column public.orders.exchange_rate_mxn_to_cny is
  'Legacy column name retained by the app. For Brazil this stores BRL to CNY.';

create table if not exists public.order_items (
  id bigserial primary key,
  sync_key text not null,
  order_no text not null,
  platform text not null default 'Mercado Livre Brasil',
  site_id text not null default 'MLB',
  country text not null default 'Brazil',
  currency text not null default 'BRL',
  sku text not null,
  product_name text,
  image_url text,
  quantity integer not null default 0,
  unit_price_mxn numeric(14, 2) not null default 0,
  total_price_mxn numeric(14, 2) not null default 0,
  ordered_at timestamptz not null,
  meli_item_id text,
  variation_id text,
  raw_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint order_items_sync_key_key unique (sync_key),
  constraint order_items_order_no_fkey
    foreign key (order_no)
    references public.orders (order_no)
    on update cascade
    on delete cascade
);

comment on column public.order_items.unit_price_mxn is
  'Legacy column name retained by the app. For Brazil this stores BRL unit price.';
comment on column public.order_items.total_price_mxn is
  'Legacy column name retained by the app. For Brazil this stores BRL line total.';

create table if not exists public.products (
  id bigserial primary key,
  sku text not null,
  product_name text,
  image_url text,
  unit_cost_cny numeric(14, 2) not null default 0,
  unit_shipping_cost_cny numeric(14, 2) not null default 0,
  platform_fee_formula_mxn text not null default 'sales_brl * 0.13',
  platform_tax_formula_mxn text not null default 'sales_brl * 0.04',
  last_mile_fee_formula_mxn text not null default 'quantity * 45',
  ad_cost_formula_mxn text not null default 'sales_brl * 0.05',
  other_fee_formula_mxn text not null default '0',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_sku_key unique (sku)
);

comment on column public.products.platform_fee_formula_mxn is
  'Legacy column name retained by the app. Formula result is BRL in the Brazil project.';
comment on column public.products.platform_tax_formula_mxn is
  'Legacy column name retained by the app. Formula result is BRL in the Brazil project.';
comment on column public.products.last_mile_fee_formula_mxn is
  'Legacy column name retained by the app. Formula result is BRL in the Brazil project.';
comment on column public.products.ad_cost_formula_mxn is
  'Legacy column name retained by the app. Formula result is BRL in the Brazil project.';
comment on column public.products.other_fee_formula_mxn is
  'Legacy column name retained by the app. Formula result is BRL in the Brazil project.';

create table if not exists public.app_settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mercadolibre_tokens (
  id bigserial primary key,
  user_id text not null,
  site_id text not null default 'MLB',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  token_type text,
  scope text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint mercadolibre_tokens_user_id_key unique (user_id)
);

create index if not exists orders_ordered_at_idx
  on public.orders (ordered_at desc);

create index if not exists orders_platform_ordered_at_idx
  on public.orders (platform, ordered_at desc);

create index if not exists orders_site_id_ordered_at_idx
  on public.orders (site_id, ordered_at desc);

create index if not exists order_items_order_no_idx
  on public.order_items (order_no);

create index if not exists order_items_sku_idx
  on public.order_items (sku);

create index if not exists order_items_ordered_at_idx
  on public.order_items (ordered_at desc);

create index if not exists order_items_order_no_sku_idx
  on public.order_items (order_no, sku);

create index if not exists order_items_platform_ordered_at_idx
  on public.order_items (platform, ordered_at desc);

create index if not exists products_is_active_idx
  on public.products (is_active);

create index if not exists mercadolibre_tokens_site_id_idx
  on public.mercadolibre_tokens (site_id);

create index if not exists mercadolibre_tokens_updated_at_idx
  on public.mercadolibre_tokens (updated_at desc);

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

drop trigger if exists set_order_items_updated_at on public.order_items;
create trigger set_order_items_updated_at
before update on public.order_items
for each row
execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

drop trigger if exists set_app_settings_updated_at on public.app_settings;
create trigger set_app_settings_updated_at
before update on public.app_settings
for each row
execute function public.set_updated_at();

drop trigger if exists set_mercadolibre_tokens_updated_at on public.mercadolibre_tokens;
create trigger set_mercadolibre_tokens_updated_at
before update on public.mercadolibre_tokens
for each row
execute function public.set_updated_at();

insert into public.app_settings (key, value)
values
  ('exchange_rate_brl_to_cny', '1'),
  ('exchange_rate_mxn_to_cny', '1')
on conflict (key) do nothing;

-- RLS is intentionally not enabled in this first-stage schema.
-- Enable and define policies later only after confirming the browser client,
-- service-role API routes, and Supabase auth model you want for this ERP.
