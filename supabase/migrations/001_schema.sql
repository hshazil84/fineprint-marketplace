-- ═══════════════════════════════════════════════════════
-- FINEPRINT STUDIO — SUPABASE SCHEMA
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════

-- ───────────────────────────────────────────
-- PROFILES (extends Supabase auth.users)
-- ───────────────────────────────────────────
create table public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text not null,
  role          text not null check (role in ('artist', 'buyer', 'admin')),
  email         text not null,
  location      text,
  bio           text,
  instagram     text,
  website       text,
  artist_code   text unique,          -- e.g. "AN" — auto-generated for artists
  created_at    timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read all profiles"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- ───────────────────────────────────────────
-- ARTWORKS
-- ───────────────────────────────────────────
create table public.artworks (
  id              bigserial primary key,
  sku             text unique not null,          -- e.g. FP-AN-001
  artist_id       uuid references public.profiles(id) on delete cascade,
  title           text not null,
  description     text,
  price           integer not null,              -- in MVR
  preview_url     text,                          -- low-res watermarked (public bucket)
  hires_path      text,                          -- high-res path (private bucket)
  sizes           text[] default '{A4,A3}',
  status          text default 'pending' check (status in ('pending','approved','rejected')),
  offer_label     text,
  offer_pct       integer check (offer_pct between 0 and 50),
  offer_expires   date,
  created_at      timestamptz default now()
);

alter table public.artworks enable row level security;

create policy "Anyone can view approved artworks"
  on public.artworks for select using (status = 'approved');

create policy "Artists can view own artworks"
  on public.artworks for select using (auth.uid() = artist_id);

create policy "Artists can insert own artworks"
  on public.artworks for insert with check (auth.uid() = artist_id);

create policy "Artists can update own artworks"
  on public.artworks for update using (auth.uid() = artist_id);

create policy "Admins can do everything on artworks"
  on public.artworks for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ───────────────────────────────────────────
-- ORDERS
-- ───────────────────────────────────────────
create table public.orders (
  id                bigserial primary key,
  invoice_number    text unique not null,         -- e.g. INV-2026-1046
  order_sku         text not null,                -- e.g. FP-AN-001-A3
  artwork_id        bigint references public.artworks(id),
  buyer_id          uuid references public.profiles(id),
  buyer_name        text not null,
  buyer_email       text not null,
  buyer_phone       text,

  -- pricing (all in MVR)
  original_price    integer not null,
  offer_label       text,
  offer_pct         integer default 0,
  discount_amount   integer default 0,
  print_price       integer not null,             -- after discount
  handling_fee      integer default 0,            -- 100 for delivery, 0 for pickup
  total_paid        integer not null,
  fp_commission     integer not null,             -- 25% of original_price
  artist_earnings   integer not null,             -- print_price - fp_commission

  -- delivery
  delivery_method   text not null check (delivery_method in ('delivery','pickup')),
  delivery_island   text,
  delivery_atoll    text,
  delivery_notes    text,

  -- payment
  slip_url          text,                         -- uploaded transfer slip (private bucket)
  slip_uploaded_at  timestamptz,
  status            text default 'pending' check (status in ('pending','approved','rejected')),
  approved_at       timestamptz,
  payout_status     text default 'unpaid' check (payout_status in ('unpaid','paid')),
  payout_date       date,

  print_size        text not null,
  created_at        timestamptz default now()
);

alter table public.orders enable row level security;

create policy "Buyers can view own orders"
  on public.orders for select using (auth.uid() = buyer_id);

create policy "Buyers can insert orders"
  on public.orders for insert with check (auth.uid() = buyer_id);

create policy "Artists can view orders for their artworks"
  on public.orders for select using (
    exists (
      select 1 from public.artworks
      where artworks.id = orders.artwork_id
      and artworks.artist_id = auth.uid()
    )
  );

create policy "Admins can do everything on orders"
  on public.orders for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ───────────────────────────────────────────
-- STORAGE BUCKETS
-- ───────────────────────────────────────────

-- Public bucket: low-res watermarked artwork previews
insert into storage.buckets (id, name, public) values ('artwork-previews', 'artwork-previews', true);

-- Private bucket: high-res original artwork files
insert into storage.buckets (id, name, public) values ('artwork-hires', 'artwork-hires', false);

-- Private bucket: order transfer slips
insert into storage.buckets (id, name, public) values ('order-slips', 'order-slips', false);

-- Storage policies: artists can upload previews
create policy "Artists can upload previews"
  on storage.objects for insert
  with check (bucket_id = 'artwork-previews' and auth.role() = 'authenticated');

create policy "Anyone can view previews"
  on storage.objects for select
  using (bucket_id = 'artwork-previews');

-- Storage policies: artists upload hi-res, admins can read
create policy "Artists can upload hires"
  on storage.objects for insert
  with check (bucket_id = 'artwork-hires' and auth.role() = 'authenticated');

create policy "Admins can read hires"
  on storage.objects for select
  using (
    bucket_id = 'artwork-hires' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Storage policies: buyers upload slips, admins can read
create policy "Buyers can upload slips"
  on storage.objects for insert
  with check (bucket_id = 'order-slips' and auth.role() = 'authenticated');

create policy "Admins can read slips"
  on storage.objects for select
  using (
    bucket_id = 'order-slips' and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ───────────────────────────────────────────
-- HELPER FUNCTION: generate artist code
-- Called when a new artist profile is created
-- ───────────────────────────────────────────
create or replace function public.generate_artist_code(full_name text)
returns text language plpgsql as $$
declare
  base_code text;
  final_code text;
  counter int := 0;
begin
  -- Take initials from name e.g. "Ahmed Naif" → "AN"
  base_code := upper(
    string_agg(left(word, 1), '')
    from (select regexp_split_to_table(full_name, '\s+') as word) w
  );
  final_code := base_code;
  -- If code already taken, append number
  while exists (select 1 from public.profiles where artist_code = final_code) loop
    counter := counter + 1;
    final_code := base_code || counter::text;
  end loop;
  return final_code;
end;
$$;

-- ───────────────────────────────────────────
-- HELPER FUNCTION: generate artwork SKU
-- e.g. FP-AN-001
-- ───────────────────────────────────────────
create or replace function public.generate_artwork_sku(p_artist_id uuid)
returns text language plpgsql as $$
declare
  artist_code text;
  seq_num int;
begin
  select profiles.artist_code into artist_code
  from public.profiles where id = p_artist_id;

  select count(*) + 1 into seq_num
  from public.artworks where artist_id = p_artist_id;

  return 'FP-' || artist_code || '-' || lpad(seq_num::text, 3, '0');
end;
$$;

-- ───────────────────────────────────────────
-- HELPER FUNCTION: generate invoice number
-- ───────────────────────────────────────────
create or replace function public.generate_invoice_number()
returns text language plpgsql as $$
declare
  year_part text;
  next_num int;
begin
  year_part := to_char(now(), 'YYYY');
  select coalesce(max(
    cast(split_part(invoice_number, '-', 3) as integer)
  ), 1000) + 1
  into next_num
  from public.orders
  where invoice_number like 'INV-' || year_part || '-%';
  return 'INV-' || year_part || '-' || next_num::text;
end;
$$;

-- ───────────────────────────────────────────
-- SEED: create admin user
-- After running this, sign up with this email
-- and update the role to 'admin' manually
-- ───────────────────────────────────────────
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'hshazil@gmail.com';
