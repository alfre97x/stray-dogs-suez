"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ZONES } from "@/lib/zones";
import type { Dog } from "@/lib/types";
import { Spinner } from "@/components/ui";

export default function AdminDogs() {
  const { t } = useI18n();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [zone, setZone] = useState("");
  const [tnr, setTnr] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("dogs")
      .select("*, profiles(display_name), zones(name_en)")
      .order("created_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setDogs((data as Dog[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      dogs.filter((d) => {
        if (zone && d.zone_id !== zone) return false;
        if (tnr === "yes" && !d.tnr_done) return false;
        if (tnr === "no" && d.tnr_done) return false;
        if (search && !(d.name ?? "Unnamed").toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [dogs, zone, tnr, search],
  );

  const del = async (id: string) => {
    if (!confirm(t("delete_confirm"))) return;
    const supabase = createClient();
    const { error } = await supabase.from("dogs").delete().eq("id", id);
    if (!error) setDogs((prev) => prev.filter((d) => d.id !== id));
  };

  if (loading) return <Spinner label={t("loading")} />;

  const sel = "bg-surface border border-border rounded-md px-3 py-2 text-sm";

  return (
    <div>
      <h1 className="text-2xl font-extrabold mb-1">{t("admin_dogs")}</h1>
      <p className="text-text-secondary mb-5">{filtered.length} of {dogs.length}</p>

      <div className="flex flex-wrap gap-2 mb-4">
        <input className={sel} placeholder={t("search_placeholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={sel} value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">All zones</option>
          {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name_en}</option>)}
        </select>
        <select className={sel} value={tnr} onChange={(e) => setTnr(e.target.value)}>
          <option value="">TNR: All</option>
          <option value="yes">TNR done</option>
          <option value="no">Needs TNR</option>
        </select>
      </div>

      <div className="bg-surface border border-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background text-text-tertiary text-xs uppercase">
              {["Name", "Zone", "Added by", "Caught", "TNR", "Vacc", "Injured", ""].map((h) => (
                <th key={h} className="text-start px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 300).map((d) => (
              <tr key={d.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-semibold">{d.name ?? "—"}{d.is_deceased && <span className="text-text-tertiary"> †</span>}</td>
                <td className="px-4 py-2.5 text-text-secondary">{d.zones?.name_en ?? d.zone_id}</td>
                <td className="px-4 py-2.5 text-text-secondary">{d.profiles?.display_name ?? "—"}</td>
                <td className="px-4 py-2.5 text-text-tertiary">{d.caught_at}</td>
                <td className="px-4 py-2.5">{d.tnr_done ? "✅" : "❌"}</td>
                <td className="px-4 py-2.5">{d.vaccinated ? "✅" : "❌"}</td>
                <td className="px-4 py-2.5">{d.is_injured ? "🩹" : "—"}</td>
                <td className="px-4 py-2.5">
                  <button onClick={() => del(d.id)} className="text-danger border border-danger-border rounded-md px-2 py-1 text-xs">
                    {t("delete_dog")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-text-tertiary">{t("no_dogs_found")}</div>}
      </div>
    </div>
  );
}
