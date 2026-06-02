"use client";
// App-wide client providers: i18n, auth session bootstrap, data load + realtime,
// and service-worker registration. Mounted once in the root layout.
import { useEffect, type ReactNode } from "react";
import { I18nProvider } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import {
  useAuthStore, useAppStore, DOG_SELECT, SIGHTING_SELECT,
} from "@/lib/store";
import type { Dog, Sighting } from "@/lib/types";

function AuthAndData() {
  const { setSession, setProfile, setAuthReady } = useAuthStore();
  const { setDogs, setSightings, setZoneStats, upsertDog, patchDog, removeDog, upsertSighting } =
    useAppStore();

  useEffect(() => {
    const supabase = createClient();

    const loadProfile = async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      setProfile(data ?? null);
    };

    // Session bootstrap + listener
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session);
      if (session?.user) loadProfile(session.user.id);
      else setProfile(null);
    });

    // Initial data load (public read via RLS — works for guests too)
    const load = async () => {
      const [{ data: dogs }, { data: sightings }, { data: zoneStats }] = await Promise.all([
        supabase.from("dogs").select(DOG_SELECT).eq("is_deceased", false)
          .order("created_at", { ascending: false }),
        supabase.from("sightings").select(SIGHTING_SELECT).eq("resolved", false)
          .order("created_at", { ascending: false }).limit(100),
        supabase.from("zone_stats").select("*").order("total_dogs", { ascending: false }),
      ]);
      if (dogs) setDogs(dogs as Dog[]);
      if (sightings) setSightings(sightings as Sighting[]);
      if (zoneStats) setZoneStats(zoneStats);
    };
    load();

    // Realtime: keep map/lists live across devices.
    const channel = supabase
      .channel("public-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dogs" }, async (p) => {
        const { data } = await supabase.from("dogs").select(DOG_SELECT).eq("id", p.new.id).single();
        if (data) upsertDog(data as Dog);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "dogs" }, (p) => {
        patchDog(p.new.id as string, p.new as Partial<Dog>);
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "dogs" }, (p) => {
        removeDog((p.old as { id: string }).id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sightings" }, async (p) => {
        const { data } = await supabase.from("sightings").select(SIGHTING_SELECT).eq("id", p.new.id).single();
        if (data) upsertSighting(data as Sighting);
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function ServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <AuthAndData />
      <ServiceWorker />
      {children}
    </I18nProvider>
  );
}
