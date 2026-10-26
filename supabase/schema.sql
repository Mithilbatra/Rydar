-- Rydar ride tracker schema. Paste into Supabase → SQL Editor → Run. Safe to run once on a new project.

-- Profile row per account, created automatically on sign-up.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Ride ids are UUIDs made on the phone, so a retried upload is an upsert, never a duplicate.
create table public.rides (
  id uuid primary key,
  -- References auth.users (not public.users) so accounts made before the trigger existed still work.
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  activity_type text not null check (activity_type in ('bicycle', 'motorbike')),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  distance_km double precision not null default 0 check (distance_km >= 0),
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  avg_speed_kmh double precision not null default 0 check (avg_speed_kmh >= 0),
  max_speed_kmh double precision not null default 0 check (max_speed_kmh >= 0),
  elevation_gain_m double precision not null default 0 check (elevation_gain_m >= 0),
  max_lean_deg double precision not null default 0 check (max_lean_deg between 0 and 90), -- estimated from GPS
  route_polyline text not null default '', -- Google encoded polyline, precision 5
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  check (ended_at >= started_at)
);

create index rides_user_started_idx on public.rides (user_id, started_at desc);

create table public.waypoints (
  id bigint generated always as identity primary key,
  ride_id uuid not null references public.rides (id) on delete cascade,
  seq integer not null, -- order within the ride; (ride_id, seq) makes uploads idempotent
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  altitude double precision, -- metres, null when the phone has no altitude
  speed double precision, -- metres per second
  timestamp timestamptz not null,
  unique (ride_id, seq)
);

-- Row level security: the publishable key ships inside the app, so these policies are what protect the data.
alter table public.users enable row level security;
alter table public.rides enable row level security;
alter table public.waypoints enable row level security;

create policy "users: read own" on public.users
  for select to authenticated using (id = (select auth.uid()));
create policy "users: update own" on public.users
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "rides: owner full access" on public.rides
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "rides: anyone reads public rides" on public.rides
  for select to anon, authenticated using (is_public);

create policy "waypoints: owner full access" on public.waypoints
  for all to authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id and r.user_id = (select auth.uid())))
  with check (exists (select 1 from public.rides r where r.id = ride_id and r.user_id = (select auth.uid())));
create policy "waypoints: anyone reads points of public rides" on public.waypoints
  for select to anon, authenticated
  using (exists (select 1 from public.rides r where r.id = ride_id and r.is_public));
