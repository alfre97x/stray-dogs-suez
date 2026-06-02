"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { dogMarkerColor } from "@/lib/theme";
import { zoneById } from "@/lib/zones";
import { Input, EmptyState } from "@/components/ui";

export default function DogsPage() {
  const { t, lang } = useI18n();
  const { dogs } = useAppStore();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return dogs.filter((d) => {
      if (d.is_deceased) return false;
      if (!needle) return true;
      const zone = zoneById(d.zone_id);
      return (
        (d.name ?? "").toLowerCase().includes(needle) ||
        (zone?.name_en ?? "").toLowerCase().includes(needle) ||
        (d.notes ?? "").toLowerCase().includes(needle)
      );
    });
  }, [dogs, q]);

  return (
    <div>
      <div className="bg-surface border-b border-border p-4 sticky top-14 z-10">
        <h1 className="text-lg font-bold text-text-primary mb-2">{t("all_dogs")} · {filtered.length}</h1>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search_placeholder")} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="🐕" message={t("no_dogs_found")} />
      ) : (
        <ul className="divide-y divide-border">
          {filtered.map((d) => {
            const zone = zoneById(d.zone_id);
            return (
              <li key={d.id}>
                <Link href={`/dogs/${d.id}`} className="flex items-center gap-3 p-3 active:bg-surface">
                  <div className="w-12 h-12 rounded-lg bg-surface border border-border overflow-hidden flex items-center justify-center shrink-0">
                    {d.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={d.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🐕</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-text-primary truncate">{d.name || t("unnamed_dog")}</div>
                    <div className="text-xs text-text-secondary">📍 {zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : d.zone_id}</div>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    {d.tnr_done && <span>✂️</span>}
                    {d.vaccinated && <span>💉</span>}
                    {d.is_injured && <span>🩹</span>}
                    <span className="w-2.5 h-2.5 rounded-full ms-1" style={{ background: dogMarkerColor(d) }} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
