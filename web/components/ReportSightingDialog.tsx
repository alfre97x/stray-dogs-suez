"use client";
// Report a sighting. Inserting a row fires the notify-whatsapp webhook which
// pushes an alert to everyone (web + native).
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { ZONES, zoneById } from "@/lib/zones";
import type { SightingUrgency } from "@/lib/types";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { Modal } from "@/components/AddDogDialog";

const URGENCIES: SightingUrgency[] = ["low", "medium", "high", "critical"];

export default function ReportSightingDialog({ zoneId: initialZone, onClose }: { zoneId?: string; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { profile } = useAuthStore();

  const [zoneId, setZoneId] = useState(initialZone ?? "");
  const [count, setCount] = useState(1);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<SightingUrgency>("low");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    if (!profile) return setError(t("sign_in_to_add"));
    if (!zoneId) return setError(t("error_required"));

    setSaving(true);
    const supabase = createClient();
    try {
      const zone = zoneById(zoneId);
      // Try to attach GPS; fall back to null (zone centre used on display).
      const coords = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
          () => resolve(null),
          { timeout: 8000 },
        );
      });

      const { error } = await supabase.from("sightings").insert({
        zone_id: zoneId,
        lat: coords?.lat ?? zone?.lat ?? null,
        lng: coords?.lng ?? zone?.lng ?? null,
        count,
        description: description || null,
        urgency,
        reported_by: profile.id,
      });
      if (error) throw error;
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("error_save"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={t("report_title")} onClose={onClose}>
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

      <Field label={t("count_label")}>
        <Input type="number" min={1} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value)))} />
      </Field>

      <Field label={t("urgency_label")}>
        <div className="flex flex-col gap-1.5">
          {URGENCIES.map((u) => (
            <button key={u} type="button" onClick={() => setUrgency(u)}
              className={`text-start px-3 py-2 rounded-md border text-sm ${
                urgency === u ? "bg-primary/20 border-primary text-primary" : "bg-surface border-border text-text-secondary"
              }`}>
              {t(`urgency_${u}`)}
            </button>
          ))}
        </div>
      </Field>

      <Field label={t("description_label")}>
        <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description_placeholder")} />
      </Field>

      {error && <p className="text-sm text-danger mb-3">{error}</p>}

      <div className="flex flex-col gap-2">
        <Button onClick={save} loading={saving} className="w-full">{t("send_alert")}</Button>
        <Button onClick={onClose} variant="ghost" className="w-full">{t("cancel")}</Button>
      </div>
    </Modal>
  );
}
