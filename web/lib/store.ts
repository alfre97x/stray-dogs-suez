"use client";
// Client data store + auth state. Mirrors the mobile Zustand store
// (mobile/src/store/index.ts) so logic stays consistent across platforms.
import { create } from "zustand";
import type { Dog, Sighting, ZoneStat, Profile } from "./types";
import type { Session } from "@supabase/supabase-js";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  authReady: boolean;
  setSession: (s: Session | null) => void;
  setProfile: (p: Profile | null) => void;
  setAuthReady: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  authReady: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setAuthReady: (authReady) => set({ authReady }),
}));

interface AppState {
  dogs: Dog[];
  sightings: Sighting[];
  zoneStats: ZoneStat[];
  setDogs: (d: Dog[]) => void;
  upsertDog: (d: Dog) => void;
  patchDog: (id: string, patch: Partial<Dog>) => void;
  removeDog: (id: string) => void;
  setSightings: (s: Sighting[]) => void;
  upsertSighting: (s: Sighting) => void;
  patchSighting: (id: string, patch: Partial<Sighting>) => void;
  setZoneStats: (z: ZoneStat[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  dogs: [],
  sightings: [],
  zoneStats: [],
  setDogs: (dogs) => set({ dogs }),
  upsertDog: (dog) =>
    set((s) => ({
      dogs: s.dogs.some((d) => d.id === dog.id)
        ? s.dogs.map((d) => (d.id === dog.id ? { ...d, ...dog } : d))
        : [dog, ...s.dogs],
    })),
  patchDog: (id, patch) =>
    set((s) => ({ dogs: s.dogs.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
  removeDog: (id) => set((s) => ({ dogs: s.dogs.filter((d) => d.id !== id) })),
  setSightings: (sightings) => set({ sightings }),
  upsertSighting: (sighting) =>
    set((s) => ({
      sightings: s.sightings.some((x) => x.id === sighting.id)
        ? s.sightings.map((x) => (x.id === sighting.id ? { ...x, ...sighting } : x))
        : [sighting, ...s.sightings],
    })),
  patchSighting: (id, patch) =>
    set((s) => ({ sightings: s.sightings.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
  setZoneStats: (zoneStats) => set({ zoneStats }),
}));

export const DOG_SELECT =
  "*, profiles(display_name, avatar_url), zones(name_en, name_ar)";
export const SIGHTING_SELECT =
  "*, profiles(display_name, avatar_url), zones(name_en, name_ar)";
