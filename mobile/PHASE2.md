# Mobile app — Phase 2 (native iOS/Android)

The web PWA is the launch product. The Expo app here is a **bug-fixed, ready-to-finish**
foundation for a later native release. It is **not runnable as-is** — the routing/entry
files were never written. Pick this up only when native store presence is greenlit.

## Already fixed (this pass)
- `crypto.randomUUID()` → `expo-crypto`'s `randomUUID()` in `AddDogScreen` (was a hard crash on Hermes).
- Corrected `"./ui"` import paths → `"../components/ui"` in `AddDogScreen` and `MapScreen`.
- Removed the non-existent `@react-native-google/maps` dependency; added `expo-crypto`.

## Still required before it runs (from DEVELOPER_GUIDE.md §2)
- Expo Router entry files: `app/_layout.tsx`, `app/(tabs)/*`, `app/auth.tsx`, modal routes.
- Screens: Zones, DogsList, DogDetail, Alerts, Profile, ReportSighting, Auth.
- Hooks: `useBootstrap`, `useRealtime`, `usePushNotifications`, `useAuth`.
- `app.config.ts`, `eas.json`, assets (icon/splash/notification).

## Align with the web decisions
- **Maps:** the web uses MapLibre + OpenStreetMap (no Google billing). For parity and
  to avoid a Google Maps API key, migrate `MapScreen` from `react-native-maps`
  (`PROVIDER_GOOGLE`) to `@maplibre/maplibre-react-native`. Until then `react-native-maps`
  remains in `package.json` but requires a Google key to render.
- **Push:** native uses Expo push tokens (`push_tokens` table) — already handled by the
  shared `broadcast-push` / `notify-whatsapp` edge functions, which send to web *and*
  native in one call. No backend change needed.
- **Photo upload:** reuse the `sign-upload` edge function (presigned Hetzner PUT) instead of
  uploading via Supabase Storage, to match the web pipeline and storage provider.
- **Backend:** the app already points at the same Supabase project; migration `002_fixes.sql`
  (realtime publication, `is_active` RLS) benefits native automatically.
