-- Run this in Supabase Dashboard > SQL Editor.
-- This creates a private-per-user card table and storage bucket policies.
create extension if not exists pgcrypto;

create table if not exists public.pokemon_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  card_number text,
  set_name text,
  language text not null default 'English',
  condition text not null default 'Near Mint',
  image_url text,
  price_eur numeric(12,2),
  price_source text check (price_source is null or price_source in ('manual','cardmarket_last_sold')),
  price_updated_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.pokemon_cards enable row level security;

drop policy if exists "Users can view their own cards" on public.pokemon_cards;
create policy "Users can view their own cards" on public.pokemon_cards
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can insert their own cards" on public.pokemon_cards;
create policy "Users can insert their own cards" on public.pokemon_cards
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update their own cards" on public.pokemon_cards;
create policy "Users can update their own cards" on public.pokemon_cards
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own cards" on public.pokemon_cards;
create policy "Users can delete their own cards" on public.pokemon_cards
  for delete to authenticated using (auth.uid() = user_id);

-- Create a Storage bucket named pokemon-card-images in Storage > Buckets.
-- Set it to PRIVATE for better privacy, then add the policies below.
-- The starter app currently expects public URLs for images; if you choose a private
-- bucket, update app.js to use signed URLs instead of getPublicUrl().
insert into storage.buckets (id, name, public)
values ('pokemon-card-images', 'pokemon-card-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own card images" on storage.objects;
create policy "Users can upload own card images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'pokemon-card-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update own card images" on storage.objects;
create policy "Users can update own card images" on storage.objects
  for update to authenticated using (
    bucket_id = 'pokemon-card-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete own card images" on storage.objects;
create policy "Users can delete own card images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'pokemon-card-images' and (storage.foldername(name))[1] = auth.uid()::text
  );

-- The bucket is public only so card images can render with ordinary image URLs.
-- Card records themselves remain private via row-level security.
