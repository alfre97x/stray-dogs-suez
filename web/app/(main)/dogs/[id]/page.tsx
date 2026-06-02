"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore, useAuthStore, DOG_SELECT } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { zoneById } from "@/lib/zones";
import type { Dog, DogEvent } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";
import AddDogDialog from "@/components/AddDogDialog";

export default function DogDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, lang } = useI18n();
  const router = useRouter();
  const { profile } = useAuthStore();
  const { dogs, patchDog, removeDog } = useAppStore();

  const [dog, setDog] = useState<Dog | null>(dogs.find((d) => d.id === id) ?? null);
  const [events, setEvents] = useState<DogEvent[]>([]);
  const [loading, setLoading] = useState(!dog);
  const [editing, setEditing] = useState(false);

  const canEdit = !!profile && (profile.id === dog?.added_by || profile.role === "admin" || profile.role === "coordinator");

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      if (!dog) {
        const { data } = await supabase.from("dogs").select(DOG_SELECT).eq("id", id).single();
        setDog((data as Dog) ?? null);
        setLoading(false);
      }
      const { data: ev } = await supabase
        .from("dog_events")
        .select("*, profiles(display_name)")
        .eq("dog_id", id)
        .order("created_at", { ascending: false });
      setEvents((ev as DogEvent[]) ?? []);
    })();
  }, [id, dog]);

  const setStatus = async (patch: Partial<Dog>, eventType: string) => {
    if (!dog || !profile) return;
    const supabase = createClient();
    const datePatch: Partial<Dog> = {};
    if (patch.tnr_done) datePatch.tnr_date = new Date().toISOString().slice(0, 10);
    if (patch.vaccinated) datePatch.vacc_date = new Date().toISOString().slice(0, 10);
    if (patch.is_deceased) datePatch.deceased_date = new Date().toISOString().slice(0, 10);
    const merged = { ...patch, ...datePatch };
    const { error } = await supabase.from("dogs").update(merged).eq("id", dog.id);
    if (!error) {
      setDog({ ...dog, ...merged });
      patchDog(dog.id, merged);
      await supabase.from("dog_events").insert({ dog_id: dog.id, user_id: profile.id, event_type: eventType });
    }
  };

  const del = async () => {
    if (!dog || !confirm(t("delete_confirm"))) return;
    const supabase = createClient();
    const { error } = await supabase.from("dogs").delete().eq("id", dog.id);
    if (!error) {
      removeDog(dog.id);
      router.push("/dogs");
    }
  };

  if (loading) return <Spinner label={t("loading")} />;
  if (!dog) return <div className="p-8 text-center text-text-tertiary">🐕 {t("no_dogs_found")}</div>;

  const zone = zoneById(dog.zone_id);

  return (
    <div className="pb-6">
      <div className="h-56 bg-surface flex items-center justify-center overflow-hidden">
        {dog.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dog.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl">🐕</span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-black text-text-primary">{dog.name || t("unnamed_dog")}</h1>
            <p className="text-sm text-text-secondary">📍 {zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : dog.zone_id}</p>
          </div>
          <button onClick={() => router.back()} className="text-text-secondary text-sm border border-border rounded-md px-3 py-1">✕</button>
        </div>

        <div className="flex flex-wrap gap-2 mt-3">
          {dog.tnr_done && <span className="text-xs px-2 py-1 rounded-full bg-success-bg text-success border border-success-border">✂️ {t("tnr_done")}</span>}
          {dog.vaccinated && <span className="text-xs px-2 py-1 rounded-full bg-info-bg text-info border border-info-border">💉 {t("vaccinated")}</span>}
          {dog.is_injured && <span className="text-xs px-2 py-1 rounded-full bg-danger-bg text-danger border border-danger-border">🩹 {t("is_injured")}</span>}
        </div>

        {dog.notes && <p className="text-sm text-text-secondary mt-4 whitespace-pre-wrap">{dog.notes}</p>}

        {canEdit && (
          <div className="mt-5 flex flex-col gap-2">
            <div className="flex gap-2">
              {!dog.tnr_done && <Button variant="secondary" className="flex-1" onClick={() => setStatus({ tnr_done: true }, "tnr_done")}>✂️ {t("mark_tnr")}</Button>}
              {!dog.vaccinated && <Button variant="secondary" className="flex-1" onClick={() => setStatus({ vaccinated: true }, "vaccinated")}>💉 {t("mark_vaccinated")}</Button>}
            </div>
            <Button variant="secondary" onClick={() => setEditing(true)}>✏️ {t("edit_dog_title")}</Button>
            <Button variant="danger" onClick={del}>🗑️ {t("delete_dog")}</Button>
          </div>
        )}

        <h3 className="text-xs uppercase text-text-secondary font-semibold mt-6 mb-2">{t("activity_log")}</h3>
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="text-sm text-text-secondary flex justify-between border-b border-border pb-2">
              <span>{e.event_type} · {e.profiles?.display_name ?? ""}</span>
              <span className="text-text-tertiary">{new Date(e.created_at).toLocaleDateString()}</span>
            </li>
          ))}
        </ul>
      </div>

      {editing && <AddDogDialog dog={dog} onClose={() => { setEditing(false); }} />}
    </div>
  );
}
