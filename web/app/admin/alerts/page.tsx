"use client";
// The Alerts tab that was missing entirely from the original admin dashboard.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { URGENCY_CONFIG } from "@/lib/theme";
import { zoneById } from "@/lib/zones";
import type { Sighting } from "@/lib/types";
import { Spinner, EmptyState } from "@/components/ui";

export default function AdminAlerts() {
  const { t, lang } = useI18n();
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("sightings")
      .select("*, profiles(display_name)")
      .eq("resolved", false)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setSightings((data as Sighting[]) ?? []);
        setLoading(false);
      });
  }, []);

  const resolve = async (id: string) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("sightings")
      .update({ resolved: true, resolved_by: user?.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) setSightings((p) => p.filter((s) => s.id !== id));
  };

  if (loading) return <Spinner label={t("loading")} />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t("admin_alerts")}</h1>
      <p className="text-text-secondary mb-5">{t("unresolved_sightings")}</p>

      {sightings.length === 0 ? (
        <EmptyState icon="🔔" message={t("no_alerts")} />
      ) : (
        <div className="space-y-3">
          {sightings.map((s) => {
            const conf = URGENCY_CONFIG[s.urgency];
            const zone = zoneById(s.zone_id);
            return (
              <div key={s.id} className="bg-surface border border-border rounded-xl p-4 flex items-start gap-3">
                <span className="text-2xl" style={{ color: conf.color }}>{conf.emoji}</span>
                <div className="flex-1">
                  <div className="font-semibold">{s.count} dog(s) · {zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : s.zone_id}</div>
                  {s.description && <p className="text-sm text-text-secondary mt-0.5">{s.description}</p>}
                  <div className="text-xs text-text-tertiary mt-1">{s.profiles?.display_name ?? ""} · {new Date(s.created_at).toLocaleString()}</div>
                </div>
                <button onClick={() => resolve(s.id)} className="text-success border border-success-border rounded-md px-3 py-1 text-sm">
                  {t("resolve")}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
