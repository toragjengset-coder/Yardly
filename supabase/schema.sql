-- ============================================================
-- HAGEHJELP — Supabase Database Schema
-- Kjør denne i Supabase SQL Editor
-- ============================================================

-- Aktiver UUID-extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  public_profile boolean default false,
  city text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Profiler er synlige for alle" on public.profiles
  for select using (true);

create policy "Brukere kan endre egen profil" on public.profiles
  for all using (auth.uid() = id);

-- Automatisk opprett profil ved registrering
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- GARDENS
-- ============================================================
create table public.gardens (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null default 'Hagen min',
  width_m numeric not null default 10,
  height_m numeric not null default 8,
  city text,
  direction text check (direction in ('N','NE','E','SE','S','SW','W','NW')),
  zones jsonb default '[]'::jsonb,  -- array av {id, name, color, points[]}
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.gardens enable row level security;

create policy "Hager er synlige for eier" on public.gardens
  for select using (auth.uid() = user_id);

create policy "Eier kan endre hage" on public.gardens
  for all using (auth.uid() = user_id);

-- ============================================================
-- GARDEN PLANTS (planter i hagen)
-- ============================================================
create table public.garden_plants (
  id uuid default uuid_generate_v4() primary key,
  garden_id uuid references public.gardens(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  plant_key text not null,           -- referanse til plantedatabasen i frontend
  custom_name text,
  position_x numeric,               -- % av bredde
  position_y numeric,               -- % av høyde
  zone_id text,                     -- hvilken sone
  planted_date date,
  notes text,
  created_at timestamptz default now()
);

alter table public.garden_plants enable row level security;

create policy "Brukere ser egne planter" on public.garden_plants
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne planter" on public.garden_plants
  for all using (auth.uid() = user_id);

-- ============================================================
-- PLANT PHOTOS (bildelogg)
-- ============================================================
create table public.plant_photos (
  id uuid default uuid_generate_v4() primary key,
  garden_plant_id uuid references public.garden_plants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  storage_path text not null,       -- path i Supabase Storage
  taken_at date not null default current_date,
  note text,
  created_at timestamptz default now()
);

alter table public.plant_photos enable row level security;

create policy "Brukere ser egne bilder" on public.plant_photos
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne bilder" on public.plant_photos
  for all using (auth.uid() = user_id);

-- ============================================================
-- PEST LOGS (skadedyr og sykdomslogg)
-- ============================================================
create table public.pest_logs (
  id uuid default uuid_generate_v4() primary key,
  garden_plant_id uuid references public.garden_plants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type text not null,               -- f.eks. "bladlus", "soppinfeksjon"
  severity text check (severity in ('mild','moderat','alvorlig')),
  description text,
  treatment text,                   -- behandling valgt/utført
  resolved boolean default false,
  observed_at date not null default current_date,
  created_at timestamptz default now()
);

alter table public.pest_logs enable row level security;

create policy "Brukere ser egne skadedyrlogg" on public.pest_logs
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne skadedyrlogg" on public.pest_logs
  for all using (auth.uid() = user_id);

-- ============================================================
-- HARVEST LOGS (høstlogg)
-- ============================================================
create table public.harvest_logs (
  id uuid default uuid_generate_v4() primary key,
  garden_plant_id uuid references public.garden_plants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  kg numeric,
  estimated_value_nok numeric,
  notes text,
  harvested_at date not null default current_date,
  created_at timestamptz default now()
);

alter table public.harvest_logs enable row level security;

create policy "Brukere ser egne høstlogg" on public.harvest_logs
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne høstlogg" on public.harvest_logs
  for all using (auth.uid() = user_id);

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Kjør disse i Supabase Dashboard > Storage > New bucket:
-- 1. plant-photos  (public: false)
-- 2. garden-photos (public: true)

-- Storage policies for plant-photos:
insert into storage.buckets (id, name, public) values ('plant-photos', 'plant-photos', false);
insert into storage.buckets (id, name, public) values ('garden-photos', 'garden-photos', true);

create policy "Brukere laster opp egne bilder"
  on storage.objects for insert
  with check (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Brukere ser egne bilder"
  on storage.objects for select
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Brukere sletter egne bilder"
  on storage.objects for delete
  using (bucket_id = 'plant-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Garden photos er offentlige"
  on storage.objects for select
  using (bucket_id = 'garden-photos');

-- ============================================================
-- PLANT LOGS (aktivitetslogg per plante)
-- ============================================================
create table public.plant_logs (
  id uuid default uuid_generate_v4() primary key,
  garden_plant_id uuid references public.garden_plants(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  activity_type text not null,
  label text not null,
  emoji text,
  comment text,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.plant_logs enable row level security;

create policy "Brukere ser egne aktivitetslogger" on public.plant_logs
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne aktivitetslogger" on public.plant_logs
  for all using (auth.uid() = user_id);

-- ============================================================
-- TASK COMPLETIONS (kalender-avhuking)
-- ============================================================
create table public.task_completions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  garden_plant_id uuid references public.garden_plants(id) on delete cascade not null,
  task_key text not null,   -- f.eks. "2025-5-plantId-taskIdx"
  completed_at timestamptz default now()
);

alter table public.task_completions enable row level security;

create policy "Brukere ser egne avhukinger" on public.task_completions
  for select using (auth.uid() = user_id);

create policy "Brukere kan endre egne avhukinger" on public.task_completions
  for all using (auth.uid() = user_id);

-- Unik indeks for å unngå duplikater
create unique index task_completions_unique on public.task_completions (user_id, task_key);

-- ============================================================
-- GARDEN: legg til shapes-kolonne for SVG-kart
-- ============================================================
alter table public.gardens add column if not exists shapes jsonb default '[]'::jsonb;
