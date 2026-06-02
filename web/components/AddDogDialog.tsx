"use client";
// Add / edit a dog. Captures GPS (or falls back to zone centre), uploads a
// photo to Hetzner via presigned URL, writes the dog + an activity-log event.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { uploadDogPhoto } from "@/lib/upload";
import { ZONES, zoneById, zoneForPoint } from "@/lib/zones";
import type { Dog, DogSex } from "@/lib/types";
import { Button, Field, Input, Textarea, Toggle } from "@/components/ui";

const AGES = ["age_puppy", "age_young", "age_adult", "age_senior"] as const;
const AGE_VALUE: Record<string, string> = {
  age_puppy: "puppy", age_young: "young", age_adult: "adult", age_senior: "senior",
};

export default function AddDogDialog({ dog, onClose }: { dog?: Dog | null; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useAuthStore();
  const editing = !!dog;

  const [name, setName] = useState(dog?.name ?? "");
  const [zoneId, setZoneId] = useState(dog?.zone_id ?? "");
  const [sex, setSex] = useState<DogSex>(dog?.sex ?? "unknown");
  const [ageKey, setAgeKey] = useState<string>(dog?.estimated_age ?? "");
  const [color, setColor] = useState(dog?.color ?? "");
  const [tnr, setTnr] = useState(dog?.tnr_done ?? false);
  const [vacc, setVacc] = useState(dog?.vaccinated ?? false);
  const [injured, setInjured] = useState(dog?.is_injured ?? false);
  const [notes, setNotes] = useState(dog?.notes ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(dog?.thumbnail_url ?? null);
  const [loc, setLoc] = useState<{ lat: number; lng: number } | null>(
    dog ? { lat: dog.lat, lng: dog.lng } : null,
  );
  const [locState, setLocState] = useState<"idle" | "loading" | "ok" | "error">(dog ? "ok" : "idle");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickFile = (f: File | null) => {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : preview);
  };

  const getLocation = () => {
    setLocState("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLoc({ lat, lng });
        setLocState("ok");
        // Auto-assign the neighbourhood the location falls in (nearest centre =
        // the Voronoi cell shown on the map). User can still override below.
        setZoneId(zoneForPoint(lat, lng).id);
      },
      () => setLocState("error"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const save = async () => {
    setError(null);
    if (!profile) return setError(t("sign_in_to_add"));
    if (!zoneId) return setError(t("error_required"));

    setSaving(true);
    const supabase = createClient();
    try {
      const zone = zoneById(zoneId)!;
      const finalLoc = loc ?? {
        lat: zone.lat + (Math.random() - 0.5) * 0.004,
        lng: zone.lng + (Math.random() - 0.5) * 0.004,
      };
      const dogId = dog?.id ?? crypto.randomUUID();

      let photoUrl = dog?.thumbnail_url ?? null;
      if (file) photoUrl = await uploadDogPhoto(file, dogId);

      const payload = {
        id: dogId,
        name: name || null,
        sex,
        estimated_age: ageKey ? AGE_VALUE[ageKey] : null,
        color: color || null,
        notes: notes || null,
        zone_id: zoneId,
        lat: finalLoc.lat,
        lng: finalLoc.lng,
        tnr_done: tnr,
        tnr_date: tnr ? (dog?.tnr_date ?? new Date().toISOString().slice(0, 10)) : null,
        vaccinated: vacc,
        vacc_date: vacc ? (dog?.vacc_date ?? new Date().toISOString().slice(0, 10)) : null,
        is_injured: injured,
        photo_urls: photoUrl ? [photoUrl] : dog?.photo_urls ?? [],
        thumbnail_url: photoUrl,
        added_by: dog?.added_by ?? profile.id,
        caught_at: dog?.caught_at ?? new Date().toISOString().slice(0, 10),
      };

      if (editing) {
        const { error } = await supabase.from("dogs").update(payload).eq("id", dogId);
        if (error) throw error;
        await supabase.from("dog_events").insert({ dog_id: dogId, user_id: profile.id, event_type: "updated" });
      } else {
        const { error } = await supabase.from("dogs").insert(payload);
        if (error) throw error;
        await supabase.from("dog_events").insert({ dog_id: dogId, user_id: profile.id, event_type: "created", details: { zone: zoneId } });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={editing ? t("edit_dog_title") : t("add_dog_title")} onClose={onClose}>
      {/* Photo */}
      <label data-tour="dog-photo" className="block mb-4 cursor-pointer">
        <div className="h-44 rounded-lg border-2 border-dashed border-border bg-surface overflow-hidden flex items-center justify-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-text-secondary">
              <div className="text-4xl">📷</div>
              <div className="text-sm">{t("photo_add")}</div>
            </div>
          )}
        </div>
        <input type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
      </label>

      <Field label={t("name_optional")}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name_placeholder")} />
      </Field>

      <Field label={t("zone")}>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {ZONES.map((z) => (
            <button key={z.id} type="button" onClick={() => setZoneId(z.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full border text-sm ${
                zoneId === z.id ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border"
              }`}>
              {lang === "ar" ? z.name_ar : z.name_en}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("location_pin")}>
        <button type="button" data-tour="dog-location" onClick={getLocation}
          className={`w-full flex items-center gap-2 rounded-md border p-3 text-sm ${
            locState === "ok" ? "border-success-border bg-success-bg text-success" : "border-info-border bg-info-bg text-info"
          }`}>
          <span>{locState === "ok" ? "✅" : locState === "loading" ? "⏳" : "📍"}</span>
          {locState === "ok" && loc
            ? `${t("location_captured")} · ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`
            : locState === "error" ? t("location_failed") : t("use_my_location")}
        </button>
      </Field>

      <Field label={t("sex")}>
        <ChipRow value={sex} options={(["male", "female", "unknown"] as DogSex[]).map((s) => ({ v: s, label: t(`sex_${s}`) }))} onChange={(v) => setSex(v as DogSex)} />
      </Field>

      <Field label={t("estimated_age")}>
        <ChipRow value={ageKey} options={AGES.map((a) => ({ v: a, label: t(a) }))} onChange={setAgeKey} />
      </Field>

      <Field label={t("color")}>
        <Input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Brown, black & white…" />
      </Field>

      <div data-tour="dog-tnr">
        <Toggle label={t("tnr_label")} icon="✂️" checked={tnr} onChange={setTnr} />
      </div>
      <Toggle label={t("vacc_label")} icon="💉" checked={vacc} onChange={setVacc} />
      <Toggle label={t("is_injured")} icon="🩹" checked={injured} onChange={setInjured} />

      <Field label={t("notes_label")}>
        <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes_placeholder")} />
      </Field>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="flex flex-col gap-2" data-tour="dog-save">
        <Button onClick={save} loading={saving} className="w-full">{saving ? t("saving") : t("save")}</Button>
        <Button onClick={onClose} variant="ghost" className="w-full">{t("cancel")}</Button>
      </div>
    </Modal>
  );
}

function ChipRow({ value, options, onChange }: {
  value: string; options: { v: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button key={o.v} type="button" onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 rounded-full border text-sm ${
            value === o.v ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border"
          }`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-surface border-b border-border px-4 h-14 flex items-center justify-between">
          <h2 className="font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-secondary text-xl">✕</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
