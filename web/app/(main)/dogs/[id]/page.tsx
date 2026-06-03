"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAppStore, useAuthStore, DOG_SELECT } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { zoneById } from "@/lib/zones";
import { Colors } from "@/lib/theme";
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

  const markDeceased = async () => {
    if (!dog || !confirm(t("confirm_deceased"))) return;
    await setStatus({ is_deceased: true }, "deceased");
    removeDog(dog.id); // archived — drops off the active map/list
    router.push("/dogs");
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
          {dog.is_deceased ? (
            <span className="text-xs px-2 py-1 rounded-full bg-surface border border-border text-text-secondary">☠️ {t("status_deceased")}</span>
          ) : dog.tnr_pending && !dog.tnr_done ? (
            <span className="text-xs px-2 py-1 rounded-full bg-surface border" style={{ color: Colors.pending, borderColor: Colors.pending }}>⏳ {t("status_pending")}</span>
          ) : dog.tnr_done ? (
            <span className="text-xs px-2 py-1 rounded-full bg-success-bg text-success border border-success-border">✂️ {dog.vaccinated ? t("status_tnr_vacc") : t("status_tnr_only")}</span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-surface border" style={{ color: Colors.primary, borderColor: Colors.primary }}>{t("status_needs_tnr")}</span>
          )}
          {dog.is_injured && <span className="text-xs px-2 py-1 rounded-full bg-danger-bg text-danger border border-danger-border">🩹 {t("is_injured")}</span>}
        </div>

        {dog.notes && <p className="text-sm text-text-secondary mt-4 whitespace-pre-wrap">{dog.notes}</p>}

        {canEdit && !dog.is_deceased && (
          <div className="mt-5 flex flex-col gap-2">
            {!dog.tnr_done && !dog.tnr_pending && (
              <Button onClick={() => setStatus({ tnr_pending: true }, "catching_started")}>⏳ {t("mark_start_catching")}</Button>
            )}
            {dog.tnr_pending && !dog.tnr_done && (
              <>
                <Button onClick={() => setStatus({ tnr_done: true, vaccinated: true, tnr_pending: false }, "tnr_returned")}>✅ {t("mark_returned")}</Button>
                <Button variant="secondary" onClick={() => setStatus({ tnr_pending: false }, "catching_cancelled")}>{t("cancel_catching")}</Button>
              </>
            )}
            {dog.tnr_done && !dog.vaccinated && (
              <Button variant="secondary" onClick={() => setStatus({ vaccinated: true }, "vaccinated")}>💉 {t("mark_vaccinated")}</Button>
            )}
            <Button variant="secondary" onClick={() => setStatus({ is_injured: !dog.is_injured }, dog.is_injured ? "injured_cleared" : "injured")}>
              🩹 {dog.is_injured ? t("mark_injured_off") : t("mark_injured_on")}
            </Button>
            <Button variant="secondary" onClick={() => setEditing(true)}>✏️ {t("edit_dog_title")}</Button>
            <Button variant="danger" onClick={markDeceased}>☠️ {t("mark_deceased")}</Button>
            <Button variant="ghost" onClick={del}>🗑️ {t("delete_dog")}</Button>
          </div>
        )}
        {canEdit && dog.is_deceased && (
          <div className="mt-5">
            <Button variant="secondary" onClick={() => setStatus({ is_deceased: false }, "restored")}>↩️ Restore</Button>
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
