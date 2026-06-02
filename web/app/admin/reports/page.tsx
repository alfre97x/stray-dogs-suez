"use client";
// Customizable dog report builder: filter by neighbourhood / status / date
// range / search, choose which columns to include, see live summary stats and a
// preview, then export to Excel-ready CSV or print to PDF.
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ZONES } from "@/lib/zones";
import { downloadCSV } from "@/lib/csv";
import type { Dog } from "@/lib/types";
import { Button, Spinner } from "@/components/ui";

type Col = { key: string; label: string; get: (d: Dog) => string | number };

const COLUMNS: Col[] = [
  { key: "name", label: "Name", get: (d) => d.name ?? "Unnamed" },
  { key: "zone", label: "Neighbourhood", get: (d) => d.zones?.name_en ?? d.zone_id },
  { key: "sex", label: "Sex", get: (d) => d.sex },
  { key: "estimated_age", label: "Age", get: (d) => d.estimated_age ?? "" },
  { key: "color", label: "Colour", get: (d) => d.color ?? "" },
  { key: "tnr_done", label: "TNR", get: (d) => (d.tnr_done ? "Yes" : "No") },
  { key: "tnr_date", label: "TNR date", get: (d) => d.tnr_date ?? "" },
  { key: "vaccinated", label: "Vaccinated", get: (d) => (d.vaccinated ? "Yes" : "No") },
  { key: "vacc_date", label: "Vacc date", get: (d) => d.vacc_date ?? "" },
  { key: "is_injured", label: "Injured", get: (d) => (d.is_injured ? "Yes" : "No") },
  { key: "is_deceased", label: "Deceased", get: (d) => (d.is_deceased ? "Yes" : "No") },
  { key: "caught_at", label: "Caught", get: (d) => d.caught_at ?? "" },
  { key: "created_at", label: "Added", get: (d) => d.created_at?.slice(0, 10) ?? "" },
  { key: "added_by", label: "Added by", get: (d) => d.profiles?.display_name ?? "" },
  { key: "notes", label: "Notes", get: (d) => d.notes ?? "" },
];

const DEFAULT_COLS = new Set(["name", "zone", "sex", "tnr_done", "vaccinated", "is_injured", "caught_at", "added_by"]);

type Status = "all" | "all_incl" | "tnr" | "needs_tnr" | "vaccinated" | "not_vaccinated" | "injured" | "deceased";
const STATUS_OPTS: { v: Status; label: string }[] = [
  { v: "all", label: "All (excl. deceased)" },
  { v: "all_incl", label: "All (incl. deceased)" },
  { v: "tnr", label: "TNR done" },
  { v: "needs_tnr", label: "Needs TNR" },
  { v: "vaccinated", label: "Vaccinated" },
  { v: "not_vaccinated", label: "Not vaccinated" },
  { v: "injured", label: "Injured" },
  { v: "deceased", label: "Deceased" },
];

function matchStatus(d: Dog, s: Status): boolean {
  switch (s) {
    case "all": return !d.is_deceased;
    case "all_incl": return true;
    case "tnr": return d.tnr_done && !d.is_deceased;
    case "needs_tnr": return !d.tnr_done && !d.is_deceased;
    case "vaccinated": return d.vaccinated && !d.is_deceased;
    case "not_vaccinated": return !d.vaccinated && !d.is_deceased;
    case "injured": return d.is_injured && !d.is_deceased;
    case "deceased": return d.is_deceased;
  }
}

export default function AdminReports() {
  const { t } = useI18n();
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("Suez Stray Dogs — Report");
  const [zone, setZone] = useState("");
  const [status, setStatus] = useState<Status>("all");
  const [dateField, setDateField] = useState<"caught_at" | "created_at">("caught_at");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [cols, setCols] = useState<Set<string>>(new Set(DEFAULT_COLS));

  useEffect(() => {
    createClient()
      .from("dogs")
      .select("*, profiles(display_name), zones(name_en)")
      .order("caught_at", { ascending: false })
      .limit(5000)
      .then(({ data }) => {
        setDogs((data as Dog[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dogs.filter((d) => {
      if (zone && d.zone_id !== zone) return false;
      if (!matchStatus(d, status)) return false;
      const dt = (d[dateField] ?? "").slice(0, 10);
      if (from && dt && dt < from) return false;
      if (to && dt && dt > to) return false;
      if (q && !(d.name ?? "Unnamed").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dogs, zone, status, dateField, from, to, search]);

  const selectedCols = COLUMNS.filter((c) => cols.has(c.key));

  const kpis = useMemo(() => {
    const total = filtered.length;
    const tnr = filtered.filter((d) => d.tnr_done).length;
    const vacc = filtered.filter((d) => d.vaccinated).length;
    const injured = filtered.filter((d) => d.is_injured).length;
    return { total, tnr, vacc, injured, tnrPct: total ? Math.round((tnr / total) * 100) : 0 };
  }, [filtered]);

  const exportCSV = () => {
    const rows = filtered.map((d) =>
      Object.fromEntries(selectedCols.map((c) => [c.label, c.get(d)])),
    );
    downloadCSV(rows, `suez-report-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const toggleCol = (key: string) =>
    setCols((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  if (loading) return <Spinner label={t("loading")} />;

  const inputCls = "bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary";
  const filterSummary = [
    zone ? ZONES.find((z) => z.id === zone)?.name_en : "All neighbourhoods",
    STATUS_OPTS.find((s) => s.v === status)?.label,
    from || to ? `${dateField === "caught_at" ? "Caught" : "Added"} ${from || "…"} → ${to || "…"}` : null,
    search ? `“${search}”` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="no-print">
        <h1 className="text-2xl font-extrabold mb-1">{t("admin_reports")}</h1>
        <p className="text-text-secondary mb-5">Build, customize, export and print dog reports.</p>

        {/* Filters */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs text-text-secondary">Report title
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">Neighbourhood
            <select className={inputCls} value={zone} onChange={(e) => setZone(e.target.value)}>
              <option value="">All neighbourhoods</option>
              {ZONES.map((z) => <option key={z.id} value={z.id}>{z.name_en}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">Status
            <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUS_OPTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">Date field
            <select className={inputCls} value={dateField} onChange={(e) => setDateField(e.target.value as "caught_at" | "created_at")}>
              <option value="caught_at">Caught date</option>
              <option value="created_at">Date added</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">From
            <input type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary">To
            <input type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-text-secondary sm:col-span-2 lg:col-span-3">Search by name
            <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="e.g. Brownie" />
          </label>
        </div>

        {/* Column picker */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-4">
          <div className="text-xs text-text-secondary uppercase font-semibold mb-2">Columns</div>
          <div className="flex flex-wrap gap-2">
            {COLUMNS.map((c) => (
              <label key={c.key} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs cursor-pointer ${cols.has(c.key) ? "bg-primary/20 border-primary text-primary" : "border-border text-text-secondary"}`}>
                <input type="checkbox" className="accent-primary" checked={cols.has(c.key)} onChange={() => toggleCol(c.key)} />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Button onClick={exportCSV} disabled={!selectedCols.length}>⬇ {t("export_csv")}</Button>
          <Button variant="secondary" onClick={() => window.print()} disabled={!selectedCols.length}>🖨 {t("print_report")}</Button>
        </div>
      </div>

      {/* Printable report area */}
      <div className="report-area">
        <div className="mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-text-secondary">
            {filterSummary} · {filtered.length} dogs · generated {new Date().toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            [kpis.total, "Total"],
            [kpis.tnr, "TNR'd"],
            [kpis.vacc, "Vaccinated"],
            [`${kpis.tnrPct}%`, "TNR rate"],
          ].map(([v, l], i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-3 text-center">
              <div className="text-xl font-black text-primary">{v as string | number}</div>
              <div className="text-[11px] text-text-secondary">{l as string}</div>
            </div>
          ))}
        </div>

        {selectedCols.length === 0 ? (
          <p className="text-text-tertiary">Select at least one column.</p>
        ) : filtered.length === 0 ? (
          <p className="text-text-tertiary">{t("no_dogs_found")}</p>
        ) : (
          <div className="bg-surface border border-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-background text-text-tertiary text-xs uppercase">
                  {selectedCols.map((c) => <th key={c.key} className="text-start px-3 py-2 font-semibold">{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} className="border-t border-border">
                    {selectedCols.map((c) => (
                      <td key={c.key} className="px-3 py-1.5 text-text-secondary">{c.get(d)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
