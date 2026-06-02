"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import type { ZoneStat, Dog } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";
import { downloadCSV } from "@/lib/csv";

export default function AdminOverview() {
  const { t } = useI18n();
  const [zones, setZones] = useState<ZoneStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("zone_stats").select("*").order("total_dogs", { ascending: false }).then(({ data }) => {
      setZones(data ?? []);
      setLoading(false);
    });
  }, []);

  const num = (v: number | string) => Number(v) || 0;
  const totalDogs = zones.reduce((a, z) => a + num(z.total_dogs), 0);
  const totalTnr = zones.reduce((a, z) => a + num(z.tnr_count), 0);
  const totalVacc = zones.reduce((a, z) => a + num(z.vaccinated_count), 0);
  const tnrPct = totalDogs ? Math.round((totalTnr / totalDogs) * 100) : 0;

  const exportCSV = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("dogs")
      .select("*, profiles(display_name), zones(name_en)")
      .order("created_at", { ascending: false });
    const rows = ((data as Dog[]) ?? []).map((d) => ({
      id: d.id, name: d.name ?? "Unnamed", zone: d.zones?.name_en ?? d.zone_id,
      tnr_done: d.tnr_done, vaccinated: d.vaccinated, is_injured: d.is_injured,
      is_deceased: d.is_deceased, caught_at: d.caught_at,
      added_by: d.profiles?.display_name ?? d.added_by,
    }));
    downloadCSV(rows, `suez-dogs-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  if (loading) return <Spinner label={t("loading")} />;

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t("admin_overview")}</h1>
      <p className="text-text-secondary mb-6">Real-time status across all Suez City zones</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          [totalDogs, t("total_dogs_tracked"), "#F0E6D3"],
          [totalTnr, t("tnr_done"), "#4AAA6A"],
          [totalVacc, t("vaccinated"), "#4A90D0"],
          [`${tnrPct}%`, t("tnr_rate"), "#C8860A"],
        ].map(([v, l, c], i) => (
          <div key={i} className="bg-surface border border-border rounded-xl p-5">
            <div className="text-3xl font-black" style={{ color: c as string }}>{v as string | number}</div>
            <div className="text-xs text-text-secondary mt-1">{l as string}</div>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <span className="font-bold">Zone breakdown</span>
          <Button onClick={exportCSV} className="!h-9 !px-4 text-sm">⬇ {t("export_csv")}</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background text-text-tertiary text-xs uppercase">
                {["Zone", "Total", "TNR", "Vacc", "Injured", "TNR %"].map((h) => (
                  <th key={h} className="text-start px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {zones.map((z) => {
                const pct = num(z.total_dogs) ? Math.round((num(z.tnr_count) / num(z.total_dogs)) * 100) : 0;
                return (
                  <tr key={z.id} className="border-t border-border">
                    <td className="px-4 py-3 font-semibold">{z.name_en}</td>
                    <td className="px-4 py-3">{z.total_dogs}</td>
                    <td className="px-4 py-3 text-success">{z.tnr_count}</td>
                    <td className="px-4 py-3 text-info">{z.vaccinated_count}</td>
                    <td className="px-4 py-3" style={{ color: num(z.injured_count) > 0 ? "#E84040" : "#A08060" }}>{z.injured_count}</td>
                    <td className="px-4 py-3 font-bold" style={{ color: pct >= 70 ? "#4AAA6A" : pct >= 40 ? "#C8860A" : "#E84040" }}>{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
