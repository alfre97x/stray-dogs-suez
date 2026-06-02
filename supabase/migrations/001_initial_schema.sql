-- ============================================================
-- SUEZ STRAY TRACKER — Complete Database Schema
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- for geospatial queries

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('rescuer', 'admin', 'coordinator');
create type dog_sex as enum ('male', 'female', 'unknown');
create type sighting_urgency as enum ('low', 'medium', 'high', 'critical');

-- ============================================================
-- ZONES (Suez City neighbourhoods — seeded, not user-created)
-- ============================================================

create table zones (
  id          text primary key,
  name_en     text not null,
  name_ar     text not null,
  lat         double precision not null,
  lng         double precision not null,
  boundary    geometry(Polygon, 4326),  -- optional GeoJSON polygon
  created_at  timestamptz default now()
);

-- ============================================================
-- USER PROFILES (extends Supabase auth.users)
-- ============================================================

create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  avatar_url    text,
  role          user_role not null default 'rescuer',
  phone         text,
  zone_id       text references zones(id),   -- home zone of rescuer
  dogs_added    int not null default 0,       -- denormalized counter
  is_active     boolean not null default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ============================================================
-- DOGS
-- ============================================================

create table dogs (
  id              uuid primary key default uuid_generate_v4(),
  name            text,                                   -- optional
  sex             dog_sex not null default 'unknown',
  estimated_age   text,                                   -- e.g. "puppy", "1-2 years", "adult"
  color           text,
  notes           text,

  -- Location
  zone_id         text not null references zones(id),
  lat             double precision not null,
  lng             double precision not null,
  location        geometry(Point, 4326) generated always as (
                    ST_SetSRID(ST_MakePoint(lng, lat), 4326)
                  ) stored,

  -- Status
  tnr_done        boolean not null default false,
  tnr_date        date,
  vaccinated      boolean not null default false,
  vacc_date       date,
  vacc_type       text,                                   -- e.g. "rabies", "5-in-1"
  is_injured      boolean not null default false,
  is_deceased     boolean not null default false,
  deceased_date   date,

  -- Photos (stored in Supabase Storage)
  photo_urls      text[] not null default '{}',
  thumbnail_url   text,

  -- Metadata
  added_by        uuid not null references profiles(id),
  caught_at       date not null default current_date,
  last_seen_at    date,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ============================================================
-- DOG ACTIVITY LOG (audit trail)
-- ============================================================

create table dog_events (
  id          uuid primary key default uuid_generate_v4(),
  dog_id      uuid not null references dogs(id) on delete cascade,
  user_id     uuid not null references profiles(id),
  event_type  text not null,   -- 'tnr_done', 'vaccinated', 'photo_added', 'note_added', 'deceased', etc.
  details     jsonb,
  created_at  timestamptz default now()
);

-- ============================================================
-- SIGHTINGS (alert system)
-- ============================================================

create table sightings (
  id            uuid primary key default uuid_generate_v4(),
  zone_id       text not null references zones(id),
  lat           double precision,
  lng           double precision,
  count         int not null default 1,
  description   text,
  urgency       sighting_urgency not null default 'low',
  photo_url     text,
  reported_by   uuid not null references profiles(id),
  resolved      boolean not null default false,
  resolved_by   uuid references profiles(id),
  resolved_at   timestamptz,
  created_at    timestamptz default now()
);

-- ============================================================
-- PUSH NOTIFICATION TOKENS (Expo)
-- ============================================================

create table push_tokens (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references profiles(id) on delete cascade,
  token       text not null unique,
  platform    text not null,   -- 'ios' | 'android'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- ============================================================
-- NOTIFICATION LOG
-- ============================================================

create table notifications (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references profiles(id),   -- null = broadcast
  title       text not null,
  body        text not null,
  data        jsonb,
  sent_at     timestamptz default now(),
  read_at     timestamptz
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_dogs_zone on dogs(zone_id);
create index idx_dogs_added_by on dogs(added_by);
create index idx_dogs_tnr on dogs(tnr_done) where not is_deceased;
create index idx_dogs_location on dogs using gist(location);
create index idx_sightings_zone on sightings(zone_id);
create index idx_sightings_created on sightings(created_at desc);
create index idx_dog_events_dog on dog_events(dog_id, created_at desc);
create index idx_push_tokens_user on push_tokens(user_id);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_dogs_updated_at before update on dogs
  for each row execute function handle_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function handle_updated_at();

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'rescuer')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Increment dogs_added counter on profile
create or replace function increment_dogs_counter()
returns trigger language plpgsql as $$
begin
  update profiles set dogs_added = dogs_added + 1 where id = new.added_by;
  return new;
end;
$$;

create trigger trg_dogs_counter
  after insert on dogs
  for each row execute function increment_dogs_counter();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table zones         enable row level security;
alter table profiles      enable row level security;
alter table dogs          enable row level security;
alter table dog_events    enable row level security;
alter table sightings     enable row level security;
alter table push_tokens   enable row level security;
alter table notifications enable row level security;

-- ZONES: public read, admin write
create policy "zones_read"   on zones for select using (true);
create policy "zones_admin"  on zones for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- PROFILES: public read, own write
create policy "profiles_read"       on profiles for select using (true);
create policy "profiles_own_update" on profiles for update using (auth.uid() = id);
create policy "profiles_admin"      on profiles for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- DOGS: public read, authenticated write, own/admin delete
create policy "dogs_read"         on dogs for select using (true);
create policy "dogs_insert"       on dogs for insert with check (auth.uid() is not null);
create policy "dogs_update_own"   on dogs for update using (
  added_by = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coordinator'))
);
create policy "dogs_delete"       on dogs for delete using (
  added_by = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- DOG EVENTS: public read, authenticated insert
create policy "events_read"   on dog_events for select using (true);
create policy "events_insert" on dog_events for insert with check (auth.uid() is not null);

-- SIGHTINGS: public read, authenticated write
create policy "sightings_read"   on sightings for select using (true);
create policy "sightings_insert" on sightings for insert with check (auth.uid() is not null);
create policy "sightings_update" on sightings for update using (
  reported_by = auth.uid() or
  exists (select 1 from profiles where id = auth.uid() and role in ('admin', 'coordinator'))
);

-- PUSH TOKENS: own only
create policy "tokens_own" on push_tokens for all using (user_id = auth.uid());

-- NOTIFICATIONS: own + admin
create policy "notifs_own"   on notifications for select using (user_id = auth.uid() or user_id is null);
create policy "notifs_admin" on notifications for all using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- ============================================================
-- SEED: ZONES
-- ============================================================

insert into zones (id, name_en, name_ar, lat, lng) values
  ('suez_canal',   'Suez Canal Zone',   'منطقة قناة السويس', 29.9650, 32.5480),
  ('arbeen',       'Arbeen',            'عربين',             29.9800, 32.5400),
  ('el_ganayen',   'El Ganayen',        'الجناين',           29.9550, 32.5360),
  ('faisal',       'Faisal District',   'حي فيصل',          29.9720, 32.5600),
  ('el_salam',     'El Salam',          'السلام',            29.9480, 32.5520),
  ('port_tawfiq',  'Port Tawfiq',       'بور توفيق',         29.9350, 32.5600),
  ('el_kornish',   'El Kornish',        'الكورنيش',          29.9600, 32.5500),
  ('al_shohada',   'Al Shohada',        'الشهداء',           29.9900, 32.5450),
  ('attaka',       'Attaka',            'عتاقة',             29.9750, 32.5300),
  ('faysaliah',    'Faysaliah',         'الفيصلية',          29.9450, 32.5400);

-- ============================================================
-- VIEW: ZONE STATS (used by both app and admin)
-- ============================================================

create or replace view zone_stats as
select
  z.id,
  z.name_en,
  z.name_ar,
  z.lat,
  z.lng,
  count(d.id) filter (where not d.is_deceased)            as total_dogs,
  count(d.id) filter (where d.tnr_done and not d.is_deceased) as tnr_count,
  count(d.id) filter (where d.vaccinated and not d.is_deceased) as vaccinated_count,
  count(d.id) filter (where d.is_injured and not d.is_deceased) as injured_count,
  count(s.id) filter (where s.created_at > now() - interval '7 days') as recent_sightings
from zones z
left join dogs d on d.zone_id = z.id
left join sightings s on s.zone_id = z.id
group by z.id, z.name_en, z.name_ar, z.lat, z.lng;
