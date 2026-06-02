// mobile/src/services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// ─── Types (mirror your DB schema) ───────────────────────────────────────────

export type UserRole = "rescuer" | "admin" | "coordinator";
export type DogSex = "male" | "female" | "unknown";
export type SightingUrgency = "low" | "medium" | "high" | "critical";

export interface Zone {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
}

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  phone: string | null;
  zone_id: string | null;
  dogs_added: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Dog {
  id: string;
  name: string | null;
  sex: DogSex;
  estimated_age: string | null;
  color: string | null;
  notes: string | null;
  zone_id: string;
  lat: number;
  lng: number;
  tnr_done: boolean;
  tnr_date: string | null;
  vaccinated: boolean;
  vacc_date: string | null;
  vacc_type: string | null;
  is_injured: boolean;
  is_deceased: boolean;
  photo_urls: string[];
  thumbnail_url: string | null;
  added_by: string;
  caught_at: string;
  last_seen_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profiles?: Pick<Profile, "display_name" | "avatar_url">;
  zones?: Pick<Zone, "name_en" | "name_ar">;
}

export interface Sighting {
  id: string;
  zone_id: string;
  lat: number | null;
  lng: number | null;
  count: number;
  description: string | null;
  urgency: SightingUrgency;
  photo_url: string | null;
  reported_by: string;
  resolved: boolean;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "avatar_url">;
  zones?: Pick<Zone, "name_en" | "name_ar">;
}

export interface ZoneStat {
  id: string;
  name_en: string;
  name_ar: string;
  lat: number;
  lng: number;
  total_dogs: number;
  tnr_count: number;
  vaccinated_count: number;
  injured_count: number;
  recent_sightings: number;
}

export type Database = {
  public: {
    Tables: {
      zones:         { Row: Zone };
      profiles:      { Row: Profile };
      dogs:          { Row: Dog };
      sightings:     { Row: Sighting };
      push_tokens:   { Row: { id: string; user_id: string; token: string; platform: string } };
      notifications: { Row: { id: string; user_id: string | null; title: string; body: string; data: Record<string,unknown>; sent_at: string; read_at: string | null } };
    };
    Views: {
      zone_stats: { Row: ZoneStat };
    };
  };
};

// ─── SecureStore adapter for session persistence ──────────────────────────────

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ─── Client ───────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: Platform.OS === "web" ? undefined : ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
