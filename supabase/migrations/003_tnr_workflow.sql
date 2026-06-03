-- ============================================================
-- Migration 003: TNR catching workflow
-- Adds a "currently being caught for TNR" (pending) state. A dog is marked
-- pending when caught for the operation; when it returns it becomes
-- tnr_done + vaccinated and pending clears.
-- ============================================================

alter table public.dogs
  add column if not exists tnr_pending boolean not null default false;

-- Index to quickly find dogs in the catching workflow.
create index if not exists idx_dogs_tnr_pending
  on public.dogs(tnr_pending) where tnr_pending and not is_deceased;

-- Recreate zone_stats with a pending count. Drop first because CREATE OR REPLACE
-- can only append columns at the end, not insert in the middle.
drop view if exists public.zone_stats;
create view zone_stats as
select
  z.id,
  z.name_en,
  z.name_ar,
  z.lat,
  z.lng,
  count(d.id) filter (where not d.is_deceased)                               as total_dogs,
  count(d.id) filter (where d.tnr_done and not d.is_deceased)                as tnr_count,
  count(d.id) filter (where d.vaccinated and not d.is_deceased)              as vaccinated_count,
  count(d.id) filter (where d.is_injured and not d.is_deceased)              as injured_count,
  count(d.id) filter (where d.tnr_pending and not d.tnr_done and not d.is_deceased) as pending_count,
  count(s.id) filter (where s.created_at > now() - interval '7 days')        as recent_sightings
from zones z
left join dogs d on d.zone_id = z.id
left join sightings s on s.zone_id = z.id
group by z.id, z.name_en, z.name_ar, z.lat, z.lng;
