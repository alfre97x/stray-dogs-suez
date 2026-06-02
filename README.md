# Suez Stray Tracker

Community network for tracking and caring for the stray dogs of Suez City, Egypt —
TNR (trap-neuter-return), vaccinations, sightings, and alerts. Bilingual EN/AR.

## What's here
```
web/        Next.js 15 PWA — rescuer app + role-gated admin (the launch product)
supabase/   Postgres schema (001) + go-live fixes (002), Edge Functions
mobile/     Expo app — bug-fixed foundation for a future native release (see mobile/PHASE2.md)
docs/       DEPLOYMENT.md — full setup, lowest-cost stack
_archive/   original delivery (zip + reference admin dashboard)
```

## Stack (lowest cost — ≈ €5/mo)
- **Web/PWA:** Next.js 15, Tailwind, MapLibre + OpenStreetMap (no map key), Web Push.
- **Backend:** Supabase (Postgres + PostGIS, Auth, Realtime, Edge Functions) — free tier.
- **Photos:** Hetzner Object Storage (S3-compatible) via presigned uploads.
- **Hosting:** Vercel / Cloudflare Pages — free. Daily keep-alive cron prevents DB pause.
- **Alerts:** Web + Expo push now; WhatsApp (Twilio) and weekly email are optional.

## Run the web app
```bash
cd web
cp .env.local.example .env.local   # fill in Supabase URL/anon key + VAPID public key
npm install
npm run dev                         # http://localhost:3000
```
Full provisioning (Supabase, Hetzner, VAPID, Edge Functions, deploy): see
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## What was fixed vs. the original delivery
- **Critical security:** removed the service-role key from the (old Vite) admin that shipped
  it to the browser; admin is now part of the web app using anon key + RLS, with privileged
  actions behind Edge Functions.
- **Realtime** now actually fires (publication + replica identity in `002_fixes.sql`).
- **Suspended users** can no longer write (RLS now checks `is_active`).
- **Admin broadcast** sends the real typed title/body (`broadcast-push` function) instead of
  the old fake-sighting hack; the previously-empty **Alerts** admin tab is implemented.
- **Mobile crash** (`crypto.randomUUID`) and broken `./ui` imports fixed; bogus
  `@react-native-google/maps` dependency removed.
- Repo de-duplicated and organized; Google Maps & Twilio dropped from the launch path.

## Notes
- `git init` has been run but nothing is committed — review, then commit when ready.
- `DEVELOPER_GUIDE.md` is the original mobile-first roadmap, kept for reference; the
  authoritative plan is now this README + `docs/DEPLOYMENT.md`.
