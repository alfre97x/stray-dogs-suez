"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, useAuthStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Colors } from "@/lib/theme";
import ReportSightingDialog from "@/components/ReportSightingDialog";

export default function ZonesPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { zoneStats } = useAppStore();
  const { profile } = useAuthStore();
  const [reportZone, setReportZone] = useState<string | null>(null);

  const num = (v: number | string) => Number(v) || 0;
  const totalDogs = zoneStats.reduce((a, z) => a + num(z.total_dogs), 0);
  const totalTnr = zoneStats.reduce((a, z) => a + num(z.tnr_count), 0);
  const totalVacc = zoneStats.reduce((a, z) => a + num(z.vaccinated_count), 0);
  const tnrPct = totalDogs ? Math.round((totalTnr / totalDogs) * 100) : 0;

  const openReport = (zoneId: string) => {
    if (!profile) return router.push("/auth?next=/zones");
    setReportZone(zoneId);
  };

  return (
    <div className="pb-4">
      <div className="bg-surface border-b border-border p-4">
        <h1 className="text-lg font-bold text-text-primary">{t("zones_title")}</h1>
        <p className="text-sm text-text-secondary">{t("zones_sub")}</p>
      </div>

      <div className="flex bg-surface border-b border-border">
        {[
          [totalDogs, t("total"), Colors.textPrimary],
          [totalTnr, t("tnr_done"), Colors.success],
          [totalVacc, t("vaccinated"), Colors.info],
          [`${tnrPct}%`, t("tnr_rate"), Colors.primary],
        ].map(([v, l, c], i) => (
          <div key={i} className="flex-1 text-center py-3 border-e border-border last:border-e-0">
            <div className="text-xl font-black" style={{ color: c as string }}>{v as string | number}</div>
            <div className="text-[9px] uppercase text-text-tertiary mt-0.5">{l as string}</div>
          </div>
        ))}
      </div>

      <div className="p-2 space-y-2">
        {zoneStats.map((z) => {
          const pct = num(z.total_dogs) ? Math.round((num(z.tnr_count) / num(z.total_dogs)) * 100) : 0;
          return (
            <div key={z.id} className="bg-surface border border-border rounded-lg p-4">
              <button onClick={() => router.push(`/map`)} className="text-base font-bold text-text-primary mb-2 block">
                📍 {lang === "ar" ? z.name_ar : z.name_en}
              </button>
              <div className="flex gap-2 mb-2">
                {[
                  [z.total_dogs, t("total"), Colors.textPrimary],
                  [z.tnr_count, t("tnr_done"), Colors.success],
                  [z.vaccinated_count, t("vaccinated"), Colors.info],
                ].map(([v, l, c], i) => (
                  <div key={i} className="flex-1 bg-background rounded-md py-2 text-center">
                    <div className="text-lg font-black" style={{ color: c as string }}>{v as number}</div>
                    <div className="text-[9px] uppercase text-text-tertiary">{l as string}</div>
                  </div>
                ))}
              </div>
              <div className="h-1.5 bg-surface-light rounded-full overflow-hidden mb-1">
                <div className="h-full bg-success rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-xs text-text-secondary mb-3">{pct}% {t("tnr_done")}</div>
              <button onClick={() => openReport(z.id)}
                className="w-full py-2 border border-primary text-primary rounded-md text-sm font-semibold">
                👁️ {t("report_sighting")}
              </button>
            </div>
          );
        })}
      </div>

      {reportZone && <ReportSightingDialog zoneId={reportZone} onClose={() => setReportZone(null)} />}
    </div>
  );
}
