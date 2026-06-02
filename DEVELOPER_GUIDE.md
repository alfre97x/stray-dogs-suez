# Suez Stray Tracker — Complete Developer Guide

> ⚠️ **Historical reference.** This is the original mobile-first roadmap. The project has since
> shipped a **web-first PWA** (see [`README.md`](README.md) and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md))
> as the launch product, with the native app deferred (`mobile/PHASE2.md`). Where this guide
> and those docs disagree, the docs win — notably: maps use **MapLibre + OpenStreetMap** (not
> Google), the admin is part of the web app (no browser service-role key), photos go to
> **Hetzner Object Storage**, and WhatsApp is deferred.

**Version:** 1.0 — Production Readiness Roadmap  
**Stack:** Expo (React Native) · Supabase · React (web) · TypeScript  
**Last updated:** May 2026

---

## Table of Contents

1. [What was already built](#1-what-was-already-built)
2. [What is missing — complete checklist](#2-what-is-missing--complete-checklist)
3. [Session-by-session build plan](#3-session-by-session-build-plan)
4. [Session 1 — App shell, auth, bootstrap](#4-session-1--app-shell-auth-data-bootstrap)
5. [Session 2 — Remaining screens](#5-session-2--remaining-screens)
6. [Session 3 — Realtime, offline, push](#6-session-3--realtime-offline--push-notifications)
7. [Session 4 — Admin dashboard completion](#7-session-4--admin-dashboard-completion)
8. [Is the system workable as a webapp?](#8-is-the-system-workable-as-a-webapp)
9. [Webapp build plan](#9-webapp-build-plan)
10. [Environment variables reference](#10-environment-variables-reference)
11. [Testing checklist](#11-testing-checklist)
12. [Common errors and fixes](#12-common-errors-and-fixes)

---

## 1. What was already built

The following files are complete and production-ready. Do not recreate them.

| File | Status | Notes |
|------|--------|-------|
| `supabase/migrations/001_initial_schema.sql` | ✅ Complete | All tables, RLS, triggers, indexes, seed |
| `supabase/functions/notify-whatsapp/index.ts` | ✅ Complete | Twilio + Expo push on sighting insert |
| `supabase/functions/send-report/index.ts` | ✅ Complete | Weekly email via Resend |
| `mobile/package.json` | ✅ Complete | All dependencies listed |
| `mobile/src/services/supabase.ts` | ✅ Complete | Typed client + all interfaces |
| `mobile/src/store/index.ts` | ✅ Complete | Zustand auth + app store |
| `mobile/src/i18n/index.ts` | ✅ Complete | EN + AR, 80+ keys each |
| `mobile/src/utils/theme.ts` | ✅ Complete | Full design system |
| `mobile/src/utils/zones.ts` | ✅ Complete | 10 Suez zones with coords |
| `mobile/src/components/ui.tsx` | ✅ Complete | Card, Button, Input, Toggle, Badge |
| `mobile/src/screens/AddDogScreen.tsx` | ✅ Complete | Full form, camera, GPS, upload |
| `mobile/src/screens/MapScreen.tsx` | ✅ Complete | Google Maps, markers, filter bar |
| `admin/src/pages/Dashboard.tsx` | ✅ Complete | 5-tab admin panel |
| `docs/DEPLOYMENT.md` | ✅ Complete | Step-by-step infra setup |

---

## 2. What is missing — complete checklist

### 🔴 Critical — app will not run without these

- [ ] `mobile/app.json` — Expo config (bundle IDs, permissions, icons, splash)
- [ ] `mobile/app.config.ts` — dynamic config (env vars injected at build time)
- [ ] `mobile/eas.json` — EAS build profiles (development, preview, production)
- [ ] `mobile/app/_layout.tsx` — root layout: auth guard, tab bar, realtime init
- [ ] `mobile/app/(tabs)/map.tsx` — tab entry point wrapping MapScreen
- [ ] `mobile/app/(tabs)/zones.tsx` — tab entry point
- [ ] `mobile/app/(tabs)/dogs.tsx` — tab entry point
- [ ] `mobile/app/(tabs)/alerts.tsx` — tab entry point
- [ ] `mobile/app/(tabs)/profile.tsx` — tab entry point
- [ ] `mobile/app/auth.tsx` — sign in / register screen
- [ ] `mobile/app/add-dog.tsx` — modal route
- [ ] `mobile/app/dog-detail.tsx` — dog detail modal
- [ ] `mobile/app/report-sighting.tsx` — sighting report modal
- [ ] `mobile/src/screens/ZonesScreen.tsx` — zone cards with stats
- [ ] `mobile/src/screens/DogsListScreen.tsx` — searchable dog list
- [ ] `mobile/src/screens/DogDetailScreen.tsx` — full record + activity log
- [ ] `mobile/src/screens/AlertsScreen.tsx` — sightings feed
- [ ] `mobile/src/screens/AuthScreen.tsx` — login/register UI
- [ ] `mobile/src/screens/ProfileScreen.tsx` — own stats + settings
- [ ] `mobile/src/screens/ReportSightingScreen.tsx` — sighting form

### 🟡 Important — app runs but is broken without these

- [ ] `mobile/src/hooks/useBootstrap.ts` — loads dogs/zones/sightings from Supabase on launch
- [ ] `mobile/src/hooks/useRealtime.ts` — Supabase realtime subscriptions (live updates)
- [ ] `mobile/src/hooks/usePushNotifications.ts` — registers Expo token, saves to DB
- [ ] `mobile/src/hooks/useAuth.ts` — session listener, signs out on token expiry
- [ ] RTL layout support for Arabic (I18nManager, flexDirection, text alignment)
- [ ] Pull-to-refresh on DogsListScreen and AlertsScreen
- [ ] Loading skeletons (blank screen while fetching feels broken)
- [ ] Error boundary — crash recovery
- [ ] Empty state illustrations for each screen

### 🟢 Nice to have — v1 can ship without these

- [ ] Offline queue (save failed dog entries, retry on reconnect)
- [ ] Deep linking (`suezstray://dog/abc123` from WhatsApp)
- [ ] Multi-photo gallery per dog
- [ ] Dog activity log detail screen
- [ ] Heatmap overlay on map (density by zone)
- [ ] Share dog location (generates a Google Maps link)
- [ ] Dark/light mode toggle (currently always dark)

---

## 3. Session-by-session build plan

| Session | Deliverables | Est. lines |
|---------|-------------|------------|
| **1** | app.json, app.config.ts, eas.json, _layout.tsx, auth.tsx, AuthScreen, useBootstrap, useAuth | ~700 |
| **2** | All 6 missing screens (Zones, DogsList, DogDetail, Alerts, Profile, ReportSighting) | ~900 |
| **3** | useRealtime, usePushNotifications, offline queue, RTL, error boundary | ~500 |
| **4** | Admin dashboard: alerts tab, analytics charts, password-protect admin | ~400 |
| **Web** | Next.js webapp version (shares Supabase, separate frontend) | ~2,000 |

---

## 4. Session 1 — App shell, auth, data bootstrap

### 4.1 `app.json`

This is the Expo config file. Without it, `npx expo start` fails immediately.

```json
{
  "expo": {
    "name": "Suez Stray Tracker",
    "slug": "suez-stray-tracker",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "scheme": "suezstray",
    "userInterfaceStyle": "dark",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#1a1209"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "org.suezstraytracker.app",
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "We need your location to pin where you found a dog.",
        "NSLocationAlwaysAndWhenInUseUsageDescription": "We need your location to pin where you found a dog.",
        "NSCameraUsageDescription": "We need camera access to photograph dogs you find.",
        "NSPhotoLibraryUsageDescription": "We need photo library access to upload dog photos.",
        "NSPhotoLibraryAddUsageDescription": "We save dog photos to your library."
      },
      "config": {
        "googleMapsApiKey": "$(GOOGLE_MAPS_IOS_KEY)"
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1a1209"
      },
      "package": "org.suezstraytracker.app",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "config": {
        "googleMaps": {
          "apiKey": "$(GOOGLE_MAPS_ANDROID_KEY)"
        }
      }
    },
    "plugins": [
      "expo-router",
      "expo-location",
      [
        "expo-image-picker",
        { "photosPermission": "Allow Suez Stray Tracker to access your photos." }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#C8860A",
          "defaultChannel": "default"
        }
      ],
      "expo-secure-store"
    ],
    "experiments": {
      "typedRoutes": true
    }
  }
}
```

> **Assets required:** Create `./assets/` with `icon.png` (1024×1024), `splash.png` (1284×2778), `adaptive-icon.png` (1024×1024), `notification-icon.png` (96×96, white on transparent).

---

### 4.2 `app.config.ts`

This replaces `app.json` when you need runtime env vars injected. Rename `app.json` → delete it, use this instead.

```typescript
// mobile/app.config.ts
import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Suez Stray Tracker",
  slug: "suez-stray-tracker",
  extra: {
    supabaseUrl:     process.env.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    eas: { projectId: "YOUR_EAS_PROJECT_ID" },
  },
  updates: {
    url: "https://u.expo.dev/YOUR_EAS_PROJECT_ID",
  },
  runtimeVersion: { policy: "appVersion" },
});
```

---

### 4.3 `eas.json`

Required for `eas build` to work.

```json
{
  "cli": { "version": ">= 10.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "GOOGLE_MAPS_IOS_KEY": "YOUR_IOS_KEY",
        "GOOGLE_MAPS_ANDROID_KEY": "YOUR_ANDROID_KEY"
      }
    },
    "preview": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "GOOGLE_MAPS_IOS_KEY": "YOUR_IOS_KEY",
        "GOOGLE_MAPS_ANDROID_KEY": "YOUR_ANDROID_KEY"
      }
    },
    "production": {
      "autoIncrement": true,
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://YOUR_PROJECT.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "YOUR_ANON_KEY",
        "GOOGLE_MAPS_IOS_KEY": "YOUR_IOS_KEY",
        "GOOGLE_MAPS_ANDROID_KEY": "YOUR_ANDROID_KEY"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "YOUR_APP_STORE_CONNECT_APP_ID",
        "appleTeamId": "YOUR_TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal"
      }
    }
  }
}
```

---

### 4.4 `app/_layout.tsx` — Root layout

This is the most critical file. It controls auth gating, the tab bar, and realtime initialization.

```typescript
// mobile/app/_layout.tsx
import { useEffect } from "react";
import { Stack, Tabs, router, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import { I18nextProvider } from "react-i18next";
import i18n from "../src/i18n";
import { useAuthStore, useAppStore } from "../src/store";
import { supabase } from "../src/services/supabase";
import { useBootstrap } from "../src/hooks/useBootstrap";
import { useRealtime } from "../src/hooks/useRealtime";
import { usePushNotifications } from "../src/hooks/usePushNotifications";
import { Colors } from "../src/utils/theme";
import { Text } from "react-native";

// Auth guard — redirects to /auth if not signed in
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuthStore();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === "auth";
    if (!session && !inAuthGroup) {
      router.replace("/auth");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)/map");
    }
  }, [session, loading, segments]);

  return <>{children}</>;
}

// Main tab layout
function TabLayout() {
  const { unreadNotifCount } = useAppStore();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="map"     options={{ tabBarLabel: "Map",    tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🗺️</Text> }} />
      <Tabs.Screen name="zones"   options={{ tabBarLabel: "Zones",  tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🏘️</Text> }} />
      <Tabs.Screen name="dogs"    options={{ tabBarLabel: "Dogs",   tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🐶</Text> }} />
      <Tabs.Screen name="alerts"  options={{
        tabBarLabel: "Alerts",
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔔</Text>,
        tabBarBadge: unreadNotifCount > 0 ? unreadNotifCount : undefined,
        tabBarBadgeStyle: { backgroundColor: Colors.danger },
      }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: "Me",     tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>👤</Text> }} />
    </Tabs>
  );
}

export default function RootLayout() {
  const { setSession, fetchProfile } = useAuthStore();

  // Session listener — runs once on app launch
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session) fetchProfile(session.user.id);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Data + realtime + push — these hooks are no-ops until session exists
  useBootstrap();
  useRealtime();
  usePushNotifications();

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar style="light" />
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)"         options={{ headerShown: false }} />
            <Stack.Screen name="auth"           options={{ headerShown: false }} />
            <Stack.Screen name="add-dog"        options={{ presentation: "modal" }} />
            <Stack.Screen name="dog-detail"     options={{ presentation: "modal" }} />
            <Stack.Screen name="report-sighting" options={{ presentation: "modal" }} />
          </Stack>
        </AuthGuard>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
```

---

### 4.5 `src/hooks/useBootstrap.ts`

Loads all data from Supabase when the user first signs in. Called once from `_layout.tsx`.

```typescript
// mobile/src/hooks/useBootstrap.ts
import { useEffect } from "react";
import { useAuthStore, useAppStore } from "../store";
import { supabase } from "../services/supabase";

export function useBootstrap() {
  const { session } = useAuthStore();
  const { setDogs, setSightings, setZoneStats } = useAppStore();

  useEffect(() => {
    if (!session) return;

    const load = async () => {
      // Load in parallel
      const [
        { data: dogs },
        { data: sightings },
        { data: zoneStats },
      ] = await Promise.all([
        supabase
          .from("dogs")
          .select("*, profiles(display_name, avatar_url), zones(name_en, name_ar)")
          .eq("is_deceased", false)
          .order("created_at", { ascending: false }),

        supabase
          .from("sightings")
          .select("*, profiles(display_name, avatar_url), zones(name_en, name_ar)")
          .eq("resolved", false)
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("zone_stats")
          .select("*")
          .order("total_dogs", { ascending: false }),
      ]);

      if (dogs)      setDogs(dogs);
      if (sightings) setSightings(sightings);
      if (zoneStats) setZoneStats(zoneStats);
    };

    load();
  }, [session]);
}
```

---

### 4.6 `src/hooks/useAuth.ts`

Manages session state and auto-logout on token expiry.

```typescript
// mobile/src/hooks/useAuth.ts
import { useEffect } from "react";
import { useAuthStore } from "../store";
import { supabase } from "../services/supabase";

export function useAuth() {
  const { setSession, fetchProfile, signOut } = useAuthStore();

  useEffect(() => {
    // Get existing session (persisted in SecureStore)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
    });

    // Listen for changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === "SIGNED_IN" && session?.user) {
          await fetchProfile(session.user.id);
        }

        if (event === "SIGNED_OUT") {
          // Store is cleared by signOut() in the auth listener
        }

        if (event === "TOKEN_REFRESHED") {
          // Session is automatically updated — nothing extra needed
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);
}
```

---

### 4.7 `src/screens/AuthScreen.tsx`

```typescript
// mobile/src/screens/AuthScreen.tsx
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import { supabase } from "../services/supabase";
import { Colors, Typography, Spacing, Radius } from "../utils/theme";
import { Button, Input } from "../components/ui";

type Mode = "login" | "signup";

export default function AuthScreen() {
  const { t } = useTranslation();
  const [mode, setMode]         = useState<Mode>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { Alert.alert("", t("error_required")); return; }
    if (password.length < 6)  { Alert.alert("", t("error_password_short")); return; }
    if (mode === "signup" && !name) { Alert.alert("", t("error_required")); return; }

    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { display_name: name } },
        });
        if (error) throw error;
        Alert.alert("✅", "Account created! Check your email to confirm.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message ?? t("error_generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logo}><Text style={styles.logoEmoji}>🐕</Text></View>
        <Text style={styles.title}>{t("app_name")}</Text>
        <Text style={styles.subtitle}>{t("app_tagline")}</Text>

        {/* Mode tabs */}
        <View style={styles.modeTabs}>
          {(["login", "signup"] as Mode[]).map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modeTab, mode === m && styles.modeTabActive]}
            >
              <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
                {m === "login" ? t("sign_in") : t("sign_up")}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {mode === "signup" && (
            <Input
              label={t("your_name")}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Sara Ahmed"
              autoCapitalize="words"
            />
          )}
          <Input
            label={t("email")}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label={t("password")}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
          />
          <Button
            onPress={handleSubmit}
            label={mode === "login" ? t("sign_in") : t("sign_up")}
            loading={loading}
            style={styles.submitBtn}
          />
        </View>

        {/* Community note */}
        <Text style={styles.note}>
          All rescue data is visible to the whole community.{"\n"}
          Together we track every dog in Suez City. 🐾
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.background },
  inner:       { flexGrow: 1, alignItems: "center", justifyContent: "center", padding: Spacing.xl },
  logo:        { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  logoEmoji:   { fontSize: 40 },
  title:       { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, color: Colors.textPrimary, marginBottom: 4 },
  subtitle:    { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginBottom: Spacing.xl },
  modeTabs:    { flexDirection: "row", backgroundColor: Colors.surface, borderRadius: Radius.md, padding: 4, marginBottom: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  modeTab:     { flex: 1, paddingVertical: Spacing.sm, borderRadius: Radius.sm, alignItems: "center" },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText:   { fontSize: Typography.sizes.sm, color: Colors.textSecondary, fontWeight: Typography.weights.semibold },
  modeTabTextActive: { color: Colors.white },
  form:        { width: "100%", maxWidth: 360 },
  submitBtn:   { marginTop: Spacing.sm },
  note:        { marginTop: Spacing.xl, fontSize: Typography.sizes.xs, color: Colors.textTertiary, textAlign: "center", lineHeight: 18 },
});
```

---

## 5. Session 2 — Remaining screens

### 5.1 `ZonesScreen.tsx` — structure to follow

```typescript
// mobile/src/screens/ZonesScreen.tsx
import React from "react";
import { FlatList, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppStore } from "../store";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import { Colors, Spacing, Typography, Radius } from "../utils/theme";

export default function ZonesScreen() {
  const { zoneStats } = useAppStore();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";

  // Global totals for the header bar
  const totalDogs = zoneStats.reduce((a, z) => a + Number(z.total_dogs), 0);
  const totalTnr  = zoneStats.reduce((a, z) => a + Number(z.tnr_count), 0);
  const totalVacc = zoneStats.reduce((a, z) => a + Number(z.vaccinated_count), 0);
  const tnrPct    = totalDogs ? Math.round(totalTnr / totalDogs * 100) : 0;

  const renderZone = ({ item: zone }: { item: typeof zoneStats[0] }) => {
    const pct = zone.total_dogs
      ? Math.round(Number(zone.tnr_count) / Number(zone.total_dogs) * 100)
      : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.85}
        onPress={() => router.push({ pathname: "/(tabs)/map", params: { zoneId: zone.id } })}
      >
        <Text style={styles.zoneName}>
          📍 {isRTL ? zone.name_ar : zone.name_en}
        </Text>

        {/* Three stat boxes */}
        <View style={styles.statRow}>
          {[
            { label: t("total"),      value: zone.total_dogs,      color: Colors.textPrimary },
            { label: t("tnr_done"),   value: zone.tnr_count,       color: Colors.success },
            { label: t("vaccinated"), value: zone.vaccinated_count, color: Colors.info },
          ].map(({ label, value, color }) => (
            <View key={label} style={styles.statBox}>
              <Text style={[styles.statNum, { color }]}>{value}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* TNR progress bar */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
        </View>
        <Text style={styles.progressLabel}>{pct}% {t("tnr_done")}</Text>

        {/* Report button */}
        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => router.push({
            pathname: "/report-sighting",
            params: { zoneId: zone.id, zoneName: isRTL ? zone.name_ar : zone.name_en }
          })}
        >
          <Text style={styles.reportBtnText}>👁️ {t("report_sighting")}</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={zoneStats}
      keyExtractor={z => z.id}
      renderItem={renderZone}
      // Header: global stats bar
      ListHeaderComponent={
        <View>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t("zones_title")}</Text>
            <Text style={styles.headerSub}>{t("zones_sub")}</Text>
          </View>
          <View style={styles.globalStats}>
            {[
              { v: totalDogs, l: t("total"),    c: Colors.textPrimary },
              { v: totalTnr,  l: t("tnr_done"), c: Colors.success },
              { v: totalVacc, l: t("vaccinated"),c: Colors.info },
              { v: `${tnrPct}%`, l: t("tnr_rate"), c: Colors.primary },
            ].map(({ v, l, c }) => (
              <View key={l} style={styles.globalStat}>
                <Text style={[styles.globalStatNum, { color: c }]}>{v}</Text>
                <Text style={styles.globalStatLabel}>{l}</Text>
              </View>
            ))}
          </View>
        </View>
      }
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
    />
  );
}

// Add StyleSheet here following the existing theme pattern
const styles = StyleSheet.create({
  list:            { paddingBottom: 32 },
  header:          { padding: Spacing.base, backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle:     { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: Colors.textPrimary },
  headerSub:       { fontSize: Typography.sizes.sm, color: Colors.textSecondary, marginTop: 2 },
  globalStats:     { flexDirection: "row", backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  globalStat:      { flex: 1, alignItems: "center", paddingVertical: Spacing.sm, borderRightWidth: 1, borderRightColor: Colors.border },
  globalStatNum:   { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },
  globalStatLabel: { fontSize: 9, color: Colors.textTertiary, textTransform: "uppercase", marginTop: 2 },
  card:            { margin: Spacing.sm, marginBottom: 0, backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing.base },
  zoneName:        { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: Colors.textPrimary, marginBottom: Spacing.sm },
  statRow:         { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  statBox:         { flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md, padding: Spacing.sm, alignItems: "center" },
  statNum:         { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },
  statLabel:       { fontSize: 9, color: Colors.textTertiary, textTransform: "uppercase", marginTop: 2 },
  progressBar:     { height: 6, backgroundColor: Colors.surfaceLight, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill:    { height: "100%", backgroundColor: Colors.success, borderRadius: 3 },
  progressLabel:   { fontSize: Typography.sizes.xs, color: Colors.textSecondary, marginBottom: Spacing.sm },
  reportBtn:       { paddingVertical: Spacing.sm, borderWidth: 1, borderColor: Colors.primary, borderRadius: Radius.md, alignItems: "center" },
  reportBtnText:   { fontSize: Typography.sizes.sm, color: Colors.primary, fontWeight: Typography.weights.semibold },
});
```

### 5.2 Remaining screens — patterns to follow

Each remaining screen (`DogsListScreen`, `DogDetailScreen`, `AlertsScreen`, `ProfileScreen`, `ReportSightingScreen`) follows the same structure:

```
1. Import from store: const { dogs } = useAppStore()
2. Import useTranslation for i18n
3. Use FlatList (not ScrollView) for lists — required for performance
4. Use router.push() for navigation, router.back() for dismiss
5. Use supabase.from(...) directly for mutations, then update local store
6. Wrap in KeyboardAvoidingView if the screen has a form
```

---

## 6. Session 3 — Realtime, offline, push notifications

### 6.1 `src/hooks/useRealtime.ts`

Live updates — when rescuer A adds a dog, rescuer B's map updates within 2 seconds.

```typescript
// mobile/src/hooks/useRealtime.ts
import { useEffect } from "react";
import { useAuthStore, useAppStore } from "../store";
import { supabase, Dog, Sighting } from "../services/supabase";

export function useRealtime() {
  const { session } = useAuthStore();
  const { addDog, updateDog, addSighting } = useAppStore();

  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel("public-changes")

      // New dog added by any rescuer
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dogs" },
        async (payload) => {
          // Fetch full dog with joins since payload.new lacks them
          const { data } = await supabase
            .from("dogs")
            .select("*, profiles(display_name, avatar_url), zones(name_en, name_ar)")
            .eq("id", payload.new.id)
            .single();
          if (data) addDog(data);
        }
      )

      // Dog updated (TNR done, vaccinated, etc.)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dogs" },
        (payload) => {
          updateDog(payload.new.id, payload.new as Partial<Dog>);
        }
      )

      // New sighting — show notification badge
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sightings" },
        async (payload) => {
          const { data } = await supabase
            .from("sightings")
            .select("*, profiles(display_name, avatar_url), zones(name_en, name_ar)")
            .eq("id", payload.new.id)
            .single();
          if (data) addSighting(data);
        }
      )

      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);
}
```

---

### 6.2 `src/hooks/usePushNotifications.ts`

Registers the device with Expo and saves the token to Supabase.

```typescript
// mobile/src/hooks/usePushNotifications.ts
import { useEffect, useRef } from "react";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { router } from "expo-router";
import { useAuthStore } from "../store";
import { supabase } from "../services/supabase";

// How notifications appear when the app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge:  true,
  }),
});

export function usePushNotifications() {
  const { session } = useAuthStore();
  const notifListener    = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!session || !Device.isDevice) return;

    const registerToken = async () => {
      // Check/request permission
      const { status: existing } = await Notifications.getPermissionsAsync();
      let finalStatus = existing;
      if (existing !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== "granted") return; // User declined — silent fail

      // Android: create notification channel
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Stray dog alerts",
          importance: Notifications.AndroidImportance.HIGH,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#C8860A",
        });
      }

      // Get the push token
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
      });

      // Upsert to Supabase (idempotent)
      await supabase.from("push_tokens").upsert(
        {
          user_id: session.user.id,
          token:   token.data,
          platform: Platform.OS,
        },
        { onConflict: "token" }
      );
    };

    registerToken();

    // Handle notification tap → navigate to the relevant screen
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as any;
        if (data?.type === "sighting" && data?.zone_id) {
          router.push("/(tabs)/alerts");
        }
        if (data?.type === "dog" && data?.dog_id) {
          router.push({ pathname: "/dog-detail", params: { dogId: data.dog_id } });
        }
      }
    );

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [session]);
}
```

---

### 6.3 Offline queue (optional but recommended)

When a rescuer is in the field with no signal, saves fail silently. Add a simple queue using MMKV:

```typescript
// mobile/src/utils/offlineQueue.ts
import { MMKV } from "react-native-mmkv";
import { supabase } from "../services/supabase";

const storage = new MMKV();
const QUEUE_KEY = "offline_dog_queue";

interface QueuedDog {
  id:        string;
  payload:   Record<string, unknown>;
  timestamp: number;
}

export function enqueueDog(payload: Record<string, unknown>) {
  const queue: QueuedDog[] = JSON.parse(storage.getString(QUEUE_KEY) ?? "[]");
  queue.push({ id: payload.id as string, payload, timestamp: Date.now() });
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export async function flushQueue() {
  const queue: QueuedDog[] = JSON.parse(storage.getString(QUEUE_KEY) ?? "[]");
  if (!queue.length) return;

  const remaining: QueuedDog[] = [];
  for (const item of queue) {
    const { error } = await supabase.from("dogs").upsert(item.payload);
    if (error) remaining.push(item);  // Failed — keep in queue
  }

  storage.set(QUEUE_KEY, JSON.stringify(remaining));
}

// Call flushQueue() when NetInfo detects reconnection:
// import NetInfo from "@react-native-community/netinfo";
// NetInfo.addEventListener(state => { if (state.isConnected) flushQueue(); });
```

In `AddDogScreen.tsx`, change the save logic:

```typescript
// In onSubmit, replace the direct supabase.from("dogs").insert() with:
try {
  const { error } = await supabase.from("dogs").insert(dogPayload);
  if (error) throw error;
} catch {
  // Network failure — queue locally
  enqueueDog(dogPayload);
  Alert.alert("Saved offline", "Dog record saved locally. It will sync when you reconnect.");
  router.back();
}
```

---

### 6.4 RTL support for Arabic

Add to `_layout.tsx` after the i18n setup:

```typescript
import { I18nManager } from "react-native";

// After i18n is initialized:
const isArabic = i18n.language === "ar";
if (I18nManager.isRTL !== isArabic) {
  I18nManager.forceRTL(isArabic);
  // On production: Updates.reloadAsync() to apply immediately
}
```

For individual components with directional layout:

```typescript
// Pattern: use i18n.language, not I18nManager.isRTL, for inline styles
const isRTL = i18n.language === "ar";

<View style={{ flexDirection: isRTL ? "row-reverse" : "row" }}>
  <Text style={{ textAlign: isRTL ? "right" : "left" }}>...</Text>
</View>
```

---

## 7. Session 4 — Admin dashboard completion

The existing `Dashboard.tsx` is missing the **Alerts tab**. Add this inside the tab switch:

```typescript
// In Dashboard.tsx, add inside the main <main> block:
{activeTab === "alerts" && (
  <div>
    <h1 style={{ fontSize:24, fontWeight:800, marginBottom:8 }}>Community alerts</h1>
    <p style={{ color:"#806040", marginBottom:24 }}>Unresolved sightings across all zones</p>

    {/* Fetch sightings via supabase in useEffect and display here */}
    {/* Pattern: same as dog table but with urgency badges and resolve button */}
  </div>
)}
```

For analytics charts, install `recharts` and add a weekly dogs-added chart:

```bash
npm install recharts
```

```typescript
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// In the Overview tab, below the global stats:
<div style={{ background:"#2a1f0e", borderRadius:12, border:"1px solid #4a3520", padding:24, marginTop:24 }}>
  <h3 style={{ marginBottom:16, fontSize:16, fontWeight:700 }}>Dogs added per week</h3>
  <ResponsiveContainer width="100%" height={200}>
    <LineChart data={weeklyData}>
      <XAxis dataKey="week" stroke="#806040" fontSize={11} />
      <YAxis stroke="#806040" fontSize={11} />
      <Tooltip contentStyle={{ background:"#2a1f0e", border:"1px solid #4a3520", borderRadius:8 }} />
      <Line type="monotone" dataKey="count" stroke="#c8860a" strokeWidth={2} dot={false} />
    </LineChart>
  </ResponsiveContainer>
</div>
```

---

## 8. Is the system workable as a webapp?

**Yes — and it is a very good fit.** Here is the honest comparison:

### Mobile app (Expo) vs Webapp (Next.js)

| Capability | Mobile app | Webapp |
|---|---|---|
| GPS location | ✅ Native, high accuracy | ✅ Works, slightly less accurate |
| Camera | ✅ Native, opens directly | ⚠️ Works via file input, no direct camera on desktop |
| Push notifications | ✅ System-level, works when app closed | ⚠️ Web Push API — works on Android Chrome, not iOS Safari |
| Offline | ✅ Full offline queue | ⚠️ Service Worker needed, more complex |
| Install friction | ❌ App Store review (7–14 days) | ✅ Zero — just share a URL |
| Google Maps | ✅ Native SDK | ✅ @vis.gl/react-google-maps |
| Realtime | ✅ Supabase Realtime | ✅ Same, identical |
| Arabic RTL | ✅ I18nManager | ✅ CSS `dir="rtl"` |
| Shareability | ❌ Must have app installed | ✅ Any link, any device |

### Recommendation

**Build both.** They share the same Supabase backend 100%. The webapp can launch in 2–3 weeks and requires no App Store approval. The mobile app follows for the full field experience.

The webapp is especially useful for:
- Coordinators and admins who work from a desk
- Sharing dog records via link (WhatsApp → link → view in browser)
- Anyone who doesn't want to install the app

---

## 9. Webapp build plan

### Stack

```
Next.js 14 (App Router) + TypeScript
Tailwind CSS (same color tokens as mobile theme)
@supabase/ssr (server-side auth)
@vis.gl/react-google-maps (Google Maps)
Zustand (same store logic as mobile)
react-i18next (same i18n files)
shadcn/ui (pre-built components)
```

### Install

```bash
npx create-next-app@latest suez-web --typescript --tailwind --app
cd suez-web
npm install @supabase/supabase-js @supabase/ssr
npm install @vis.gl/react-google-maps
npm install zustand react-i18next i18next
npm install date-fns
npx shadcn-ui@latest init
```

### Folder structure

```
suez-web/
├── app/
│   ├── layout.tsx          ← root layout, auth provider
│   ├── page.tsx            ← redirects to /map
│   ├── auth/page.tsx       ← login/register
│   ├── map/page.tsx        ← map view
│   ├── zones/page.tsx      ← zone cards
│   ├── dogs/page.tsx       ← dog list
│   ├── dogs/[id]/page.tsx  ← dog detail
│   └── alerts/page.tsx     ← sightings feed
├── components/
│   ├── Map.tsx             ← Google Maps component
│   ├── DogCard.tsx
│   ├── ZoneCard.tsx
│   ├── AddDogModal.tsx     ← dialog instead of screen
│   └── ReportModal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts       ← browser client
│   │   └── server.ts       ← server component client
│   └── store.ts            ← same Zustand store
└── styles/globals.css      ← Tailwind + CSS variables matching mobile theme
```

### Tailwind color config

In `tailwind.config.ts`, add the same colors as the mobile theme:

```typescript
extend: {
  colors: {
    primary:    "#C8860A",
    background: "#1A1209",
    surface:    "#2A1F0E",
    border:     "#4A3520",
    success:    "#4AAA6A",
    info:       "#4A90D0",
    danger:     "#E84040",
    text: {
      primary:   "#F0E6D3",
      secondary: "#A08060",
      tertiary:  "#605040",
    },
  },
}
```

### Key webapp differences from mobile

| Mobile | Webapp |
|--------|--------|
| `router.push("/add-dog")` → full screen | `<Dialog>` overlay |
| `ImagePicker.launchCameraAsync()` | `<input type="file" accept="image/*" capture="environment">` |
| `Location.getCurrentPositionAsync()` | `navigator.geolocation.getCurrentPosition()` |
| Tab bar at bottom | Sidebar on desktop, bottom nav on mobile |
| `expo-notifications` | `navigator.serviceWorker` + Web Push |

### Web push notifications (Progressive Web App)

Add to `next.config.js`:
```javascript
const withPWA = require("next-pwa")({ dest: "public", disable: process.env.NODE_ENV === "development" });
module.exports = withPWA({ /* next config */ });
```

This enables install-to-home-screen on Android Chrome and push notifications — matching ~80% of the mobile app experience without App Store submission.

---

## 10. Environment variables reference

### Mobile (`.env` in `mobile/`)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
EXPO_PUBLIC_EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### Webapp (`.env.local` in `suez-web/`)

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # server only, never public
```

### Admin (`.env` in `admin/`)

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_SERVICE_KEY=eyJ...  # service role — server/admin only
```

### Supabase Edge Functions (set via CLI)

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxxxxxxx
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
supabase secrets set WHATSAPP_NOTIFY_NUMBER=+201XXXXXXXXX
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

---

## 11. Testing checklist

Run through this before submitting to the App Store or launching the webapp.

### Auth
- [ ] Sign up creates a profile row in `profiles` table
- [ ] Sign in with wrong password shows an error message
- [ ] Token expiry logs the user out and redirects to `/auth`
- [ ] Guest (unauthenticated) can view all dogs and zones but cannot add

### Dog entry
- [ ] Camera opens and photo appears in the form
- [ ] GPS captures coordinates within 10m accuracy
- [ ] Zone selection is required — form rejects submission without it
- [ ] Submitting without GPS uses zone centre coordinates
- [ ] Photo uploads to Supabase Storage and URL is saved to the dog record
- [ ] TNR and vaccination toggles persist correctly
- [ ] Edited dog updates the existing record (not a duplicate)

### Map
- [ ] All dogs appear as markers on launch
- [ ] Filter bar correctly filters by TNR status and injury
- [ ] Marker callout shows correct name, zone, and badges
- [ ] Sighting markers show urgency emoji
- [ ] "My location" button centres the map on the user

### Realtime
- [ ] Open the app on two devices. Add a dog on device A. It appears on device B within 5 seconds.
- [ ] Report a sighting on device A. Notification badge increments on device B.

### Push notifications
- [ ] Accept permissions prompt on first launch
- [ ] Submitting a high-urgency sighting sends a push to all other logged-in devices
- [ ] Tapping the push notification navigates to the Alerts tab

### Offline (if implemented)
- [ ] Turn on Airplane Mode, add a dog — app shows "saved offline" message
- [ ] Turn Airplane Mode off — dog syncs to Supabase automatically

### Admin dashboard
- [ ] Overview shows correct totals matching the mobile app
- [ ] Export CSV downloads a valid file with all dog records
- [ ] Changing a user role to "coordinator" takes effect immediately
- [ ] Suspending a user prevents them from inserting dogs (RLS blocks it)
- [ ] Send notification dispatches a push to all devices

### Webapp (if built)
- [ ] Works on Chrome, Firefox, Safari
- [ ] Arabic RTL layout renders correctly (text right-aligned, UI mirrored)
- [ ] Map loads with Google Maps provider
- [ ] Add Dog modal opens and submits
- [ ] Installing as PWA on Android Chrome shows push permission prompt

---

## 12. Common errors and fixes

### `Error: No "projectId" found`
**Cause:** EAS project not linked.  
**Fix:** Run `eas init` in the `mobile/` directory, then update `app.config.ts` with the project ID.

---

### `Error: Google Maps: API key is missing`
**Cause:** Google Maps key not injected into the build.  
**Fix:** Ensure `GOOGLE_MAPS_IOS_KEY` and `GOOGLE_MAPS_ANDROID_KEY` are in `eas.json` for the correct build profile. For local dev, add to `.env`.

---

### `TypeError: Cannot read property 'id' of null` (on profile)
**Cause:** The `profiles` table row doesn't exist yet when the auth trigger fires (race condition on first signup).  
**Fix:** In `useBootstrap.ts`, add a small retry:
```typescript
let retries = 0;
while (!data && retries < 3) {
  await new Promise(r => setTimeout(r, 800));
  ({ data } = await supabase.from("profiles").select("*").eq("id", userId).single());
  retries++;
}
```

---

### `new row violates row-level security policy` on dog insert
**Cause:** The RLS `dogs_insert` policy requires `auth.uid() is not null`, but the session isn't being passed with the request.  
**Fix:** Ensure you're using the `supabase` client from `services/supabase.ts` (not a new `createClient()` call). The singleton client holds the session automatically via SecureStore.

---

### Realtime not updating on the second device
**Cause:** Supabase Realtime requires the table to have `REPLICA IDENTITY FULL` for UPDATE events.  
**Fix:** Run this once in the SQL editor:
```sql
ALTER TABLE dogs SET (replica_identity = full);
ALTER TABLE sightings SET (replica_identity = full);
```

---

### Arabic text renders LTR
**Cause:** `I18nManager.forceRTL()` requires a full app reload to apply.  
**Fix:** Call `Updates.reloadAsync()` from `expo-updates` immediately after calling `I18nManager.forceRTL(true)`. Only do this once (guard with a stored flag):
```typescript
import * as Updates from "expo-updates";
if (I18nManager.isRTL !== isArabic) {
  I18nManager.forceRTL(isArabic);
  Updates.reloadAsync(); // triggers full reload
}
```

---

### WhatsApp message not sending
**Cause:** Twilio sandbox requires recipient to opt in first.  
**Fix:** For testing, ask the recipient to send "join [sandbox-name]" to the Twilio WhatsApp number. For production, apply for a Twilio WhatsApp Business API approval (takes 3–7 days).

---

### `FATAL ERROR: Reached heap limit` during EAS build
**Cause:** Node runs out of memory on complex TypeScript projects.  
**Fix:** Add to `eas.json` build profile:
```json
"env": { "NODE_OPTIONS": "--max-old-space-size=4096" }
```

---

*End of Developer Guide*
