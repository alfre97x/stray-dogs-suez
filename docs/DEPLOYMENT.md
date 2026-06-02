# Suez Stray Tracker — Deployment Guide (Web-first PWA)

Lowest-cost, go-live stack. Everything below runs on free tiers except photo
storage (Hetzner, €4.99/mo for 1 TB).

```
Next.js PWA (rescuer app + admin)         → Vercel / Cloudflare Pages (free)
   │  anon key + RLS  (NO service key in the browser)
Supabase (Postgres+PostGIS, Auth, Realtime, Edge Functions)  → free tier
   │  S3 presigned PUT
Hetzner Object Storage (dog photos, S3-compatible)           → €4.99/mo / 1 TB
Maps: MapLibre + OpenStreetMap (no key)   Push: Web Push (VAPID)   Email: Resend (free)
```

## Architecture decisions
- **Web/PWA first.** Installable on Android/iOS home screens, push on Android, one shareable
  URL, no App Store. Native Expo app is a later phase (`mobile/PHASE2.md`).
- **No service-role key in the browser.** The admin panel is part of the web app and uses the
  signed-in admin's session; RLS authorizes everything. Privileged jobs go through Edge Functions.
- **MapLibre + OpenStreetMap** — no Google Cloud billing account needed.
- **WhatsApp deferred** — launch with Web/Expo push + the weekly email. Twilio is optional
  and auto-skips when its secrets are unset.

---

## Step 1 — Supabase project
1. Create a project at https://supabase.com/dashboard (free tier).
2. **SQL Editor** → run `supabase/migrations/001_initial_schema.sql`, then `002_fixes.sql`.
3. **Authentication → Providers**: enable Email. (For passwordless, enable magic links.)
4. Note your Project URL, `anon` key, and `service_role` key (the last one is **server-only**).

The `002` migration enables realtime on `dogs`/`sightings`, enforces suspended users in RLS,
keeps `dogs_added` accurate, and adds the `web_push_subscriptions` table.

## Step 2 — Hetzner Object Storage (photos)
1. Hetzner Cloud Console → **Object Storage** → create a bucket, e.g. `suez-dog-photos`
   in location `fsn1` (Falkenstein) or `nbg1`/`hel1`.
2. Make the bucket **public-read** (photos are public community data) and note the
   endpoint, e.g. `https://fsn1.your-objectstorage.com` and public base
   `https://suez-dog-photos.fsn1.your-objectstorage.com`.
3. Create S3 credentials (Access Key + Secret) under Object Storage.
4. Set CORS on the bucket to allow `PUT` from your web origin (Hetzner console → bucket → CORS):
   ```json
   [{ "AllowedOrigins": ["https://YOUR_WEB_DOMAIN"], "AllowedMethods": ["PUT","GET"],
      "AllowedHeaders": ["*"], "MaxAgeSeconds": 3000 }]
   ```
> Provider-agnostic: to switch to Cloudflare R2 / Supabase Storage later, only the
> `S3_*` Edge-Function secrets change — no code edits.

## Step 3 — VAPID keys (Web Push)
```bash
npx web-push generate-vapid-keys
```
Keep the **public** key for the web env and the **private** key for the Edge Function secret.

## Step 4 — Edge Functions
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Secrets (server-side only — never in the browser)
supabase secrets set VAPID_PUBLIC_KEY=BId...        VAPID_PRIVATE_KEY=...        VAPID_SUBJECT=mailto:you@org.org
supabase secrets set S3_ENDPOINT=https://fsn1.your-objectstorage.com S3_REGION=fsn1 \
  S3_BUCKET=suez-dog-photos S3_ACCESS_KEY_ID=... S3_SECRET_ACCESS_KEY=... \
  S3_PUBLIC_BASE=https://suez-dog-photos.fsn1.your-objectstorage.com
supabase secrets set ALLOWED_ORIGIN=https://YOUR_WEB_DOMAIN
# Optional later: RESEND_API_KEY=...  TWILIO_ACCOUNT_SID=...  (WhatsApp)

supabase functions deploy sign-upload
supabase functions deploy broadcast-push
supabase functions deploy notify-whatsapp
supabase functions deploy send-report   # optional weekly email
```
`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Per-function JWT verification is set in `supabase/config.toml`.

### Sighting alert webhook
Database → Webhooks → new webhook:
- Table `sightings`, event `INSERT`
- URL `https://YOUR_PROJECT.supabase.co/functions/v1/notify-whatsapp`
- Header `Authorization: Bearer YOUR_ANON_KEY`

### Optional weekly email (cron)
Enable `pg_cron`, then:
```sql
select cron.schedule('weekly-report','0 6 * * 1', $$
  select net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-report',
    headers := '{"Authorization":"Bearer YOUR_ANON_KEY"}'::jsonb);
$$);
```

## Step 5 — Web app
```bash
cd web
cp .env.local.example .env.local   # fill in the values below
npm install
npm run dev                         # http://localhost:3000
```
`.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BId...
# NEXT_PUBLIC_MAP_STYLE=...        # optional vector style; omit for free OSM tiles
```

Deploy (Vercel):
```bash
npm install -g vercel
vercel            # set the same env vars in the Vercel dashboard (Production)
vercel --prod
```
`vercel.json` includes a daily cron hitting `/api/keepalive` so the free Supabase DB
never pauses. (On Cloudflare Pages, replace it with a Cron Trigger to the same path.)

## Step 6 — First admin
Sign up in the app, then in SQL Editor:
```sql
update profiles set role = 'admin' where id = 'your-user-uuid';
```
The `/admin` area unlocks for admin/coordinator roles (enforced in `middleware.ts` + RLS).

---

## Cost
| Service | Cost |
|---|---|
| Supabase | $0 (free) → $25/mo (Pro) when you outgrow it |
| Vercel / Cloudflare Pages | $0 |
| Hetzner Object Storage | €4.99/mo (1 TB storage + 1 TB traffic) |
| MapLibre + OSM, Web Push, Resend | $0 |
| **Total** | **≈ €5/mo** |

## Security checklist
- [x] RLS on every table; suspended users blocked from writes (`002_fixes.sql`).
- [x] Browser only ever holds the anon key + VAPID public key.
- [x] Service-role key & S3 secrets live only in Edge Function secrets.
- [x] Admin area gated in middleware **and** RLS.
- [x] Photos are public community data on a public-read bucket (no PII).
