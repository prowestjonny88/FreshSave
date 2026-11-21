create schema freshsave_private;
revoke all on schema freshsave_private from public, anon, authenticated;

create type public.account_role as enum ('individual', 'retailer');
create type public.printed_date_type as enum ('best-before', 'use-by');
create type public.listing_status as enum ('pending', 'active', 'closed', 'removed');
create type public.reservation_status as enum ('pending', 'confirmed', 'completed', 'cancelled', 'declined', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null,
  name text not null check (length(trim(name)) between 2 and 100),
  loc text not null,
  joined timestamptz not null default now(),
  onboard boolean not null default true,
  prefs jsonb not null default '{"d7":true,"d3":true,"d1":true,"expired":true,"stock":true,"resv":true}'
);
create table public.stores (
  id uuid primary key references public.profiles(id) on delete cascade,
  name text not null,
  address text not null,
  x double precision not null,
  y double precision not null,
  default_instructions text
);
create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  quantity integer not null check (quantity >= 0),
  expiry date not null,
  date_type public.printed_date_type not null,
  purchased date not null,
  added_at timestamptz not null default now(),
  details jsonb not null
);
create index inventory_owner_expiry on public.inventory (owner, expiry, id);
create table public.batches (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.stores(id),
  quantity integer not null check (quantity > 0),
  expiry date not null,
  date_type public.printed_date_type not null,
  recorded date not null,
  added_at timestamptz not null default now(),
  verification text not null default 'unverified' check (verification in ('unverified', 'listed', 'dismissed')),
  counted integer check (counted >= 0),
  verified_at timestamptz,
  details jsonb not null
);
create index batches_owner_expiry on public.batches (owner, expiry, id);
create table public.listings (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches(id),
  seller_id uuid not null references public.stores(id),
  product_name text not null,
  category text not null check (category in ('pantry', 'bakery', 'drinks')),
  total integer not null check (total > 0),
  withdrawn integer not null default 0 check (withdrawn >= 0 and withdrawn <= total),
  removed_qty integer not null default 0 check (removed_qty >= 0 and removed_qty <= withdrawn),
  price_sen integer not null check (price_sen > 0),
  original_sen integer not null check (original_sen > price_sen),
  expiry date not null,
  date_type public.printed_date_type not null,
  pickup_until date not null,
  opens_at time not null,
  closes_at time not null check (closes_at > opens_at),
  status public.listing_status not null default 'pending',
  moved boolean not null default false,
  posted_at timestamptz not null default now(),
  closed_at timestamptz,
  details jsonb not null,
  check (pickup_until <= expiry - case when date_type = 'use-by' then 1 else 0 end)
);
create index listings_batch on public.listings (batch_id);
create index listings_seller_posted on public.listings (seller_id, posted_at desc, id);
create index listings_market on public.listings (status, pickup_until, posted_at desc, id);
create unique index active_product_date on public.listings (seller_id, lower(product_name), expiry) where status in ('pending', 'active');
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.stores(id),
  buyer_name text not null,
  request_id uuid not null,
  ref text not null unique,
  quantity integer not null check (quantity > 0),
  status public.reservation_status not null default 'pending',
  terms jsonb not null,
  created_at timestamptz not null default now(),
  respond_by timestamptz not null,
  confirmed_at timestamptz,
  collect_by timestamptz,
  collected_at timestamptz,
  decided_at timestamptz,
  reason text,
  decided_by text,
  disputed_at timestamptz,
  is_sample boolean not null default false,
  unique (buyer_id, request_id),
  check (buyer_id <> seller_id),
  check (status not in ('confirmed', 'completed') or (collect_by is not null and confirmed_at is not null)),
  check (status <> 'completed' or collected_at is not null)
);
create index reservations_listing_status on public.reservations (listing_id, status);
create index reservations_buyer_history on public.reservations (buyer_id, created_at desc, id);
create index reservations_seller_history on public.reservations (seller_id, created_at desc, id);
create index pending_response_deadline on public.reservations (respond_by) where status = 'pending';
create index confirmed_pickup_deadline on public.reservations (collect_by) where status = 'confirmed';
create table freshsave_private.pickup_codes (
  reservation_id uuid primary key references public.reservations(id) on delete cascade,
  code text not null check (code ~ '^\d{4}$')
);
create table public.reservation_events (
  id bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  event text not null,
  occurred_at timestamptz not null default now(),
  detail jsonb not null default '{}',
  unique (reservation_id, event)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references public.profiles(id) on delete cascade,
  category text not null, title text not null, subtitle text not null default '', href text not null,
  created_at timestamptz not null default now(),
  unread boolean not null default true,
  dedupe_key text,
  unique (owner, dedupe_key)
);
create index notifications_owner_created on public.notifications (owner, created_at desc, id);
create table public.activity (
  id bigint generated always as identity primary key,
  owner uuid not null references public.profiles(id) on delete cascade,
  icon text not null, detail text not null,
  created_at timestamptz not null default now()
);
create index activity_owner_created on public.activity (owner, created_at desc, id);
create table public.catalogue (
  id uuid primary key default gen_random_uuid(),
  owner uuid references public.profiles(id) on delete cascade,
  barcode text not null check (barcode ~ '^(\d{8}|\d{12}|\d{13}|\d{14})$'),
  name text not null, category text not null, kind text not null,
  created_at timestamptz not null default now(),
  unique nulls not distinct (owner, barcode)
);
create index catalogue_lookup on public.catalogue (barcode, owner);

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.inventory enable row level security;
alter table public.batches enable row level security;
alter table public.listings enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_events enable row level security;
alter table public.notifications enable row level security;
alter table public.activity enable row level security;
alter table public.catalogue enable row level security;

revoke all on public.profiles, public.stores, public.inventory, public.batches, public.listings,
  public.reservations, public.reservation_events, public.notifications, public.activity, public.catalogue from anon, authenticated;
grant select on public.profiles, public.stores, public.inventory, public.batches, public.listings,
  public.reservations, public.reservation_events, public.notifications, public.activity, public.catalogue to authenticated;
create policy profile_owner on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy visible_store on public.stores for select to authenticated using (true);
create policy inventory_owner on public.inventory for select to authenticated using (owner = (select auth.uid()));
create policy batch_owner on public.batches for select to authenticated using (owner = (select auth.uid()));
create policy reservation_participant on public.reservations for select to authenticated using ((select auth.uid()) in (buyer_id, seller_id));
create policy listing_visible on public.listings for select to authenticated using (
  seller_id = (select auth.uid()) or (status = 'active' and moved)
  or exists (select 1 from public.reservations r where r.listing_id = listings.id and r.buyer_id = (select auth.uid()))
);
create policy event_participant on public.reservation_events for select to authenticated using (
  exists (select 1 from public.reservations r where r.id = reservation_id and (select auth.uid()) in (r.buyer_id, r.seller_id))
);
create policy notification_owner on public.notifications for select to authenticated using (owner = (select auth.uid()));
create policy activity_owner on public.activity for select to authenticated using (owner = (select auth.uid()));
create policy catalogue_read on public.catalogue for select to authenticated using (owner is null or owner = (select auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('food-photos', 'food-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);
create policy photo_owner_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
);
create policy photo_reader on storage.objects for select to authenticated using (
  bucket_id = 'food-photos' and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (select 1 from public.listings l where l.details->'photos' ? storage.objects.name)
  )
);
create policy photo_owner_delete on storage.objects for delete to authenticated using (
  bucket_id = 'food-photos' and (storage.foldername(name))[1] = (select auth.uid())::text
  and not exists (select 1 from public.listings l where l.details->'photos' ? storage.objects.name)
  and not exists (select 1 from public.inventory i where i.details->>'photo' = storage.objects.name)
  and not exists (select 1 from public.batches b where b.details->>'photo' = storage.objects.name)
);
