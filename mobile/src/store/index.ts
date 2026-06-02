// mobile/src/store/index.ts
import { create } from "zustand";
import { supabase, Profile, Dog, Sighting, ZoneStat } from "../services/supabase";
import type { Session } from "@supabase/supabase-js";

// ─── AUTH STORE ───────────────────────────────────────────────────────────────

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  signOut: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  loading: true,
  setSession: (session) => set({ session, loading: false }),
  setProfile: (profile) => set({ profile }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },
  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) set({ profile: data });
  },
}));

// ─── APP STORE ────────────────────────────────────────────────────────────────

interface AppState {
  lang: "en" | "ar";
  setLang: (lang: "en" | "ar") => void;

  // Realtime data
  dogs: Dog[];
  sightings: Sighting[];
  zoneStats: ZoneStat[];
  unreadNotifCount: number;

  setDogs: (dogs: Dog[]) => void;
  addDog: (dog: Dog) => void;
  updateDog: (id: string, update: Partial<Dog>) => void;
  setSightings: (sightings: Sighting[]) => void;
  addSighting: (sighting: Sighting) => void;
  setZoneStats: (stats: ZoneStat[]) => void;
  setUnreadCount: (n: number) => void;
  incrementUnread: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  lang: "en",
  setLang: (lang) => set({ lang }),

  dogs: [],
  sightings: [],
  zoneStats: [],
  unreadNotifCount: 0,

  setDogs: (dogs) => set({ dogs }),
  addDog: (dog) => set((s) => ({ dogs: [dog, ...s.dogs] })),
  updateDog: (id, update) =>
    set((s) => ({
      dogs: s.dogs.map((d) => (d.id === id ? { ...d, ...update } : d)),
    })),
  setSightings: (sightings) => set({ sightings }),
  addSighting: (sighting) =>
    set((s) => ({
      sightings: [sighting, ...s.sightings],
      unreadNotifCount: s.unreadNotifCount + 1,
    })),
  setZoneStats: (zoneStats) => set({ zoneStats }),
  setUnreadCount: (n) => set({ unreadNotifCount: n }),
  incrementUnread: () =>
    set((s) => ({ unreadNotifCount: s.unreadNotifCount + 1 })),
}));
