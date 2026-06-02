"use client";
import { useAppStore, useAuthStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { URGENCY_CONFIG } from "@/lib/theme";
import { zoneById } from "@/lib/zones";
import { createClient } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui";

export default function AlertsPage() {
  const { t, lang } = useI18n();
  const { sightings, patchSighting } = useAppStore();
  const { profile } = useAuthStore();

  const canResolve = profile?.role === "admin" || profile?.role === "coordinator";

  const resolve = async (id: string) => {
    if (!profile) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("sightings")
      .update({ resolved: true, resolved_by: profile.id, resolved_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) patchSighting(id, { resolved: true });
  };

  const open = sightings.filter((s) => !s.resolved);

  return (
    <div>
      <div className="bg-surface border-b border-border p-4">
        <h1 className="text-lg font-bold text-text-primary">{t("alerts_title")}</h1>
      </div>

      {open.length === 0 ? (
        <EmptyState icon="🔔" message={t("no_alerts")} />
      ) : (
        <ul className="divide-y divide-border">
          {open.map((s) => {
            const conf = URGENCY_CONFIG[s.urgency];
            const zone = zoneById(s.zone_id);
            return (
              <li key={s.id} className="p-4">
                <div className="flex items-start gap-2">
                  <span className="text-xl" style={{ color: conf.color }}>{conf.emoji}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-text-primary">
                      {s.count} dog(s) · {zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : s.zone_id}
                    </div>
                    {s.description && <p className="text-sm text-text-secondary mt-0.5">{s.description}</p>}
                    <div className="text-xs text-text-tertiary mt-1">
                      {s.profiles?.display_name ?? ""} · {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  {canResolve && (
                    <button onClick={() => resolve(s.id)} className="text-xs text-success border border-success-border rounded-md px-2 py-1">
                      {t("resolve")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
