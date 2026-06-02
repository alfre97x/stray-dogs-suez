-- ============================================================
-- SUEZ STRAY TRACKER — Migration 002: fixes & go-live hardening
-- Apply AFTER 001_initial_schema.sql.
-- Addresses: realtime not firing, suspended users not enforced,
-- counter never decremented, and adds web-push subscription storage.
-- ============================================================

-- ------------------------------------------------------------
-- 1. REALTIME — register tables on the realtime publication and
--    set REPLICA IDENTITY FULL so UPDATE/DELETE events carry the
--    full row. Without this, live updates silently never arrive.
-- ------------------------------------------------------------

-- The publication exists by default on Supabase; guard the adds so
-- re-running the migration is safe.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dogs'
  ) then
    alter publication supabase_realtime add table public.dogs;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'sightings'
  ) then
    alter publication supabase_realtime add table public.sightings;
  end if;
end $$;

alter table public.dogs      replica identity full;
alter table public.sightings replica identity full;

-- ------------------------------------------------------------
-- 2. ENFORCE SUSPENDED USERS (is_active) IN RLS
--    Today the insert/update policies only check `auth.uid() is not null`,
--    so suspending a user in the admin panel does nothing. Replace the
--    relevant policies with an active-profile check.
-- ------------------------------------------------------------

-- Helper: is the caller a signed-in, active profile?
create or replace function public.is_active_user()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active
  );
$$;

-- Helper: is the caller an admin (or coordinator when allowed)?
create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role in ('admin', 'coordinator')
  );
$$;

-- DOGS
drop policy if exists "dogs_insert"     on public.dogs;
drop policy if exists "dogs_update_own" on public.dogs;
create policy "dogs_insert" on public.dogs
  for insert with check (is_active_user() and added_by = auth.uid());
create policy "dogs_update_own" on public.dogs
  for update using (
    (is_active_user() and added_by = auth.uid()) or is_staff()
  );

-- SIGHTINGS
drop policy if exists "sightings_insert" on public.sightings;
drop policy if exists "sightings_update" on public.sightings;
create policy "sightings_insert" on public.sightings
  for insert with check (is_active_user() and reported_by = auth.uid());
create policy "sightings_update" on public.sightings
  for update using (
    (is_active_user() and reported_by = auth.uid()) or is_staff()
  );

-- DOG EVENTS
drop policy if exists "events_insert" on public.dog_events;
create policy "events_insert" on public.dog_events
  for insert with check (is_active_user() and user_id = auth.uid());

-- ------------------------------------------------------------
-- 3. KEEP profiles.dogs_added ACCURATE ON DELETE
--    001 only increments on insert; deletes left the counter inflated.
-- ------------------------------------------------------------

create or replace function public.decrement_dogs_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
    set dogs_added = greatest(dogs_added - 1, 0)
    where id = old.added_by;
  return old;
end;
$$;

drop trigger if exists trg_dogs_counter_dec on public.dogs;
create trigger trg_dogs_counter_dec
  after delete on public.dogs
  for each row execute function public.decrement_dogs_counter();

-- ------------------------------------------------------------
-- 4. WEB PUSH SUBSCRIPTIONS (PWA)
--    The existing push_tokens table is for Expo native tokens.
--    Web Push needs the full PushSubscription (endpoint + keys).
-- ------------------------------------------------------------

create table if not exists public.web_push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz default now()
);

create index if not exists idx_web_push_user on public.web_push_subscriptions(user_id);

alter table public.web_push_subscriptions enable row level security;

drop policy if exists "web_push_own" on public.web_push_subscriptions;
create policy "web_push_own" on public.web_push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ------------------------------------------------------------
-- 5. NOTIFICATIONS: let staff insert broadcast rows (used by
--    the broadcast-push edge function's audit log via service role,
--    but also allow staff from the client if ever needed).
-- ------------------------------------------------------------

drop policy if exists "notifs_insert_staff" on public.notifications;
create policy "notifs_insert_staff" on public.notifications
  for insert with check (is_staff());

-- ------------------------------------------------------------
-- 6. PRIVILEGE-ESCALATION FIXES (security audit)
-- ------------------------------------------------------------

-- 6a. Signup role injection: the original handle_new_user() copied
--     raw_user_meta_data->>'role' into the profile, so a client could sign up
--     with { role: "admin" } and self-provision as admin. Always force
--     'rescuer' on signup; roles are granted only by an existing admin.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    'rescuer'
  );
  return new;
end;
$$;

-- 6b. Self-promotion via profile update: profiles_own_update lets a user edit
--     their own row, but RLS can't restrict columns — so a user could set
--     their own role to 'admin' or flip is_active. Guard the privileged columns
--     with a trigger: only an admin may change role / is_active / dogs_added.
create or replace function public.guard_profile_privileged_columns()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  caller_is_admin boolean;
begin
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  ) into caller_is_admin;

  -- service_role is the trusted backend (edge functions, admin scripts) and is
  -- allowed to change anything; admins manage roles via the app.
  if not caller_is_admin and coalesce(auth.role(), '') <> 'service_role' then
    -- Revert any attempt to change security-sensitive columns. (dogs_added is
    -- intentionally NOT guarded here: it is maintained by the counter triggers,
    -- which must be able to change it; it is a non-sensitive vanity counter.)
    new.role      := old.role;
    new.is_active := old.is_active;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_cols on public.profiles;
create trigger trg_guard_profile_cols
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ------------------------------------------------------------
-- 7. FIX INFINITE RECURSION IN profiles RLS (inherited from 001)
--     001's admin policies use `exists (select 1 from profiles ...)` *inside*
--     a policy ON profiles. When the `authenticated` role touches profiles
--     (e.g. the dogs counter trigger updating dogs_added), Postgres re-enters
--     the same policy → 42P17 infinite recursion. Fix: evaluate the admin check
--     in a SECURITY DEFINER function (runs as owner, bypasses RLS → no recursion)
--     and rebuild the self-referential policies to use it.
-- ------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and is_active and role = 'admin'
  );
$$;

drop policy if exists "profiles_admin" on public.profiles;
create policy "profiles_admin" on public.profiles
  for all using (is_admin()) with check (is_admin());

drop policy if exists "zones_admin" on public.zones;
create policy "zones_admin" on public.zones
  for all using (is_admin()) with check (is_admin());

drop policy if exists "dogs_delete" on public.dogs;
create policy "dogs_delete" on public.dogs
  for delete using ((is_active_user() and added_by = auth.uid()) or is_admin());

drop policy if exists "notifs_admin" on public.notifications;
create policy "notifs_admin" on public.notifications
  for all using (is_admin()) with check (is_admin());

-- Make the increment counter SECURITY DEFINER (like decrement) so its UPDATE on
-- profiles bypasses RLS and never triggers policy recursion.
create or replace function public.increment_dogs_counter()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set dogs_added = dogs_added + 1 where id = new.added_by;
  return new;
end;
$$;

-- ============================================================
-- End migration 002
-- ============================================================
