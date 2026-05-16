-- =============================================================
-- PoseLab — initial schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Idempotent: safe to re-run; uses `if not exists` and `or replace`.
-- =============================================================

-- ----------------------------------------------------------------------
-- profiles: extends auth.users with app-specific fields
-- ----------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text not null,
  plan          text not null default 'free' check (plan in ('free', 'paid')),
  device_family text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- analyses: history of every Coach/Prompt/Suggest run
-- ----------------------------------------------------------------------
create table if not exists public.analyses (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references public.profiles(id) on delete cascade,
  anon_id         text,
  mode            text not null check (mode in ('suggest', 'prompt', 'coach', 'settings', 'generate')),
  input_image_url text,
  output_data     jsonb not null,
  created_at      timestamptz not null default now(),
  constraint analyses_owner_present check (user_id is not null or anon_id is not null)
);
create index if not exists analyses_user_created_idx on public.analyses(user_id, created_at desc);
create index if not exists analyses_anon_created_idx on public.analyses(anon_id, created_at desc);

-- ----------------------------------------------------------------------
-- saved_prompts: paid users' favorited prompts
-- ----------------------------------------------------------------------
create table if not exists public.saved_prompts (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  prompt_text       text not null,
  source_image_url  text,
  created_at        timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- daily_usage: free-tier rate-limit counter
-- ----------------------------------------------------------------------
create table if not exists public.daily_usage (
  user_id uuid not null references public.profiles(id) on delete cascade,
  date    date not null default current_date,
  count   integer not null default 0,
  primary key (user_id, date)
);

-- Anonymous usage counter (separate, by anon_id)
create table if not exists public.daily_usage_anon (
  anon_id text not null,
  date    date not null default current_date,
  count   integer not null default 0,
  primary key (anon_id, date)
);

-- ----------------------------------------------------------------------
-- settings_cards: hand-curated cheat sheets, public read
-- ----------------------------------------------------------------------
create table if not exists public.settings_cards (
  id            uuid primary key default gen_random_uuid(),
  scenario      text not null,
  device_family text not null,
  card_data     jsonb not null,
  unique (scenario, device_family)
);

-- ----------------------------------------------------------------------
-- public_shares: powers /p/<slug> public URLs (Feature 1)
-- ----------------------------------------------------------------------
create table if not exists public.public_shares (
  slug         text primary key,
  analysis_id  uuid not null references public.analyses(id) on delete cascade,
  user_id      uuid references public.profiles(id) on delete set null,
  is_public    boolean not null default true,
  face_blur    boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists public_shares_analysis_idx on public.public_shares(analysis_id);

-- ======================================================================
-- Row-Level Security
-- ======================================================================
alter table public.profiles       enable row level security;
alter table public.analyses       enable row level security;
alter table public.saved_prompts  enable row level security;
alter table public.daily_usage    enable row level security;
alter table public.settings_cards enable row level security;
alter table public.public_shares  enable row level security;

-- Drop-then-create so re-runs don't error.
drop policy if exists "users read own profile"   on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "users read own analyses"  on public.analyses;
drop policy if exists "users read own saved"    on public.saved_prompts;
drop policy if exists "users insert own saved"  on public.saved_prompts;
drop policy if exists "anyone read cards"        on public.settings_cards;
drop policy if exists "anyone reads public shares" on public.public_shares;
drop policy if exists "users manage own shares"  on public.public_shares;

create policy "users read own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "users update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "users read own analyses" on public.analyses
  for select using (auth.uid() = user_id);

create policy "users read own saved" on public.saved_prompts
  for select using (auth.uid() = user_id);

create policy "users insert own saved" on public.saved_prompts
  for insert with check (auth.uid() = user_id);

create policy "anyone read cards" on public.settings_cards
  for select using (true);

create policy "anyone reads public shares" on public.public_shares
  for select using (is_public = true);

create policy "users manage own shares" on public.public_shares
  for all using (auth.uid() = user_id);

-- ======================================================================
-- Auto-create profile row on signup
-- Fires whenever a row is inserted into auth.users.
-- ======================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, email, plan)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ======================================================================
-- Storage buckets
-- These can also be created via the Supabase Dashboard → Storage.
-- ======================================================================
-- `photos`: user originals — private (signed URL access)
insert into storage.buckets (id, name, public)
  values ('photos', 'photos', false)
  on conflict (id) do nothing;

-- `enhanced`: fal.ai outputs — public (shareable URLs)
insert into storage.buckets (id, name, public)
  values ('enhanced', 'enhanced', true)
  on conflict (id) do nothing;

-- Allow authenticated users to upload to `photos` (path-scoped to their UID)
drop policy if exists "users upload to photos" on storage.objects;
create policy "users upload to photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users read own photos" on storage.objects;
create policy "users read own photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Anonymous uploads to `photos` (path-scoped to `anon/<uuid>/...`)
drop policy if exists "anon upload to photos" on storage.objects;
create policy "anon upload to photos" on storage.objects
  for insert to anon
  with check (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'anon'
  );

drop policy if exists "anon read own photos" on storage.objects;
create policy "anon read own photos" on storage.objects
  for select to anon
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = 'anon'
  );

-- `enhanced` is public — read access for everyone
drop policy if exists "anyone read enhanced" on storage.objects;
create policy "anyone read enhanced" on storage.objects
  for select using (bucket_id = 'enhanced');
