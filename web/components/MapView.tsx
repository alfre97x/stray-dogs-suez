"use client";
// MapLibre map of Suez with dog + sighting markers. Free OSM raster tiles by
// default (no API key, no billing); override with NEXT_PUBLIC_MAP_STYLE to use
// a vector style (MapTiler/Protomaps) in production for crisper tiles.
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MLMap, Marker } from "maplibre-gl";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { Colors, URGENCY_CONFIG, dogMarkerColor } from "@/lib/theme";
import { SUEZ_CENTER, ZONES, zoneById } from "@/lib/zones";
import { ZONE_BOUNDARIES } from "@/lib/zoneBoundaries";

type Filter = "all" | "tnr" | "needs_tnr" | "injured";

const OSM_STYLE = {
  version: 8 as const,
  sources: {
    osm: {
      type: "raster" as const,
      tiles: ["https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster" as const, source: "osm" }],
};

function makeEl(color: string, emoji: string, size = 34): HTMLDivElement {
  const el = document.createElement("div");
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;background:${Colors.surface};border:3px solid ${color};display:flex;align-items:center;justify-content:center;font-size:${size * 0.5}px;box-shadow:0 2px 6px rgba(0,0,0,.5);cursor:pointer`;
  el.textContent = emoji;
  return el;
}

export default function MapView({ onAddDog }: { onAddDog: () => void }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const { dogs, sightings } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const zoneLabelsRef = useRef<Marker[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [ready, setReady] = useState(false);
  const [showZones, setShowZones] = useState(false);

  // Init map once
  useEffect(() => {
    let cancelled = false;
    let ro: ResizeObserver | undefined;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;
      const styleEnv = process.env.NEXT_PUBLIC_MAP_STYLE;
      const map = new maplibregl.Map({
        container: containerRef.current,
        style: styleEnv ? styleEnv : (OSM_STYLE as never),
        center: [SUEZ_CENTER.lng, SUEZ_CENTER.lat],
        zoom: 12,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
      map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "bottom-right");
      map.on("load", () => {
        if (cancelled) return;
        map.resize(); // container may have sized after init

        // Neighbourhood divisions overlay (polygons; hidden until toggled).
        // Labels are drawn as HTML markers (handles Arabic, needs no glyphs).
        map.addSource("zone-areas", { type: "geojson", data: ZONE_BOUNDARIES as never });
        map.addLayer({
          id: "zone-fill", type: "fill", source: "zone-areas",
          layout: { visibility: "none" },
          paint: { "fill-color": Colors.primary, "fill-opacity": 0.08 },
        });
        map.addLayer({
          id: "zone-outline", type: "line", source: "zone-areas",
          layout: { visibility: "none" },
          paint: { "line-color": Colors.primary, "line-width": 1.5, "line-opacity": 0.8 },
        });
        setReady(true);
      });
      mapRef.current = map;

      // MapLibre doesn't watch its container for size changes; keep the canvas
      // in sync (fixes the canvas being stuck at the 300px fallback height).
      ro = new ResizeObserver(() => map.resize());
      ro.observe(containerRef.current);
    })();
    return () => {
      cancelled = true;
      ro?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Render markers whenever data/filter/lang change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let active = true;

    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (!active) return;
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const filtered = dogs.filter((d) => {
        if (d.is_deceased) return false;
        if (filter === "tnr") return d.tnr_done;
        if (filter === "needs_tnr") return !d.tnr_done;
        if (filter === "injured") return d.is_injured;
        return true;
      });

      for (const dog of filtered) {
        const el = makeEl(dogMarkerColor(dog), "🐕");
        el.onclick = () => router.push(`/dogs/${dog.id}`);
        const zone = zoneById(dog.zone_id);
        const popup = new maplibregl.Popup({ offset: 18, closeButton: false }).setHTML(
          `<div style="min-width:160px"><strong>${dog.name || t("unnamed_dog")}</strong><br/>
           <span style="color:${Colors.textSecondary};font-size:12px">📍 ${zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : dog.zone_id}</span><br/>
           ${dog.tnr_done ? "✂️ TNR " : ""}${dog.vaccinated ? "💉 " : ""}${dog.is_injured ? "🩹" : ""}</div>`,
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([dog.lng, dog.lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }

      for (const s of sightings) {
        if (s.resolved) continue;
        const conf = URGENCY_CONFIG[s.urgency];
        const zone = zoneById(s.zone_id);
        const lng = s.lng ?? zone?.lng ?? SUEZ_CENTER.lng;
        const lat = s.lat ?? zone?.lat ?? SUEZ_CENTER.lat;
        const el = makeEl(conf.color, conf.emoji, 30);
        const popup = new maplibregl.Popup({ offset: 16, closeButton: false }).setHTML(
          `<div style="min-width:160px"><strong style="color:${conf.color}">${conf.emoji} ${s.count} dog(s)</strong><br/>
           <span style="color:${Colors.textSecondary};font-size:12px">📍 ${zone ? (lang === "ar" ? zone.name_ar : zone.name_en) : s.zone_id}</span>
           ${s.description ? `<br/><span style="font-size:12px">${s.description}</span>` : ""}</div>`,
        );
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map);
        markersRef.current.push(marker);
      }
    })();

    return () => { active = false; };
  }, [dogs, sightings, filter, ready, lang, router, t]);

  // Toggle the neighbourhood-divisions overlay (fill/outline layers + HTML name
  // labels). Re-runs on language change to relabel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    let active = true;

    const vis = showZones ? "visible" : "none";
    if (map.getLayer("zone-fill")) map.setLayoutProperty("zone-fill", "visibility", vis);
    if (map.getLayer("zone-outline")) map.setLayoutProperty("zone-outline", "visibility", vis);

    zoneLabelsRef.current.forEach((m) => m.remove());
    zoneLabelsRef.current = [];

    if (showZones) {
      (async () => {
        const maplibregl = (await import("maplibre-gl")).default;
        if (!active) return;
        for (const z of ZONES) {
          const el = document.createElement("div");
          el.textContent = lang === "ar" ? z.name_ar : z.name_en;
          el.style.cssText = `color:${Colors.primary};font-size:11px;font-weight:700;text-shadow:0 0 3px ${Colors.background},0 0 3px ${Colors.background};pointer-events:none;white-space:nowrap`;
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([z.lng, z.lat])
            .addTo(map);
          zoneLabelsRef.current.push(marker);
        }
      })();
    }
    return () => { active = false; };
  }, [showZones, ready, lang]);

  const filters: Filter[] = ["all", "needs_tnr", "tnr", "injured"];
  const filterLabel: Record<Filter, string> = {
    all: t("filter_all"),
    needs_tnr: t("filter_needs_tnr"),
    tnr: t("filter_tnr"),
    injured: t("filter_injured"),
  };

  return (
    <div className="relative h-[calc(100dvh_-_7.5rem)]">
      <div ref={containerRef} data-tour="map" className="h-full w-full" />

      {/* Filter bar */}
      <div data-tour="filters" className="absolute top-3 inset-x-0 flex justify-center gap-1.5 px-3 z-10">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow ${
              filter === f ? "bg-primary text-white border-primary" : "bg-surface text-text-secondary border-border"
            }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>

      {/* Neighbourhoods toggle */}
      <label data-tour="zones-toggle" className="absolute top-14 start-3 z-10 flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5 shadow cursor-pointer select-none">
        <input
          type="checkbox"
          checked={showZones}
          onChange={(e) => setShowZones(e.target.checked)}
          className="accent-primary"
        />
        <span className="text-xs font-semibold text-text-secondary">🏘️ {t("show_neighbourhoods")}</span>
      </label>

      {/* Legend */}
      <div className="absolute bottom-4 start-3 bg-surface border border-border rounded-md p-2.5 text-[10px] z-10">
        <div className="uppercase text-text-secondary font-semibold mb-1">{t("legend")}</div>
        {[
          [Colors.success, t("legend_tnr_vacc")],
          [Colors.info, t("legend_tnr")],
          [Colors.primary, t("legend_not_tnr")],
          [Colors.danger, t("legend_injured")],
        ].map(([c, label]) => (
          <div key={label} className="flex items-center gap-1.5 mt-0.5">
            <span className="w-2 h-2 rounded-full" style={{ background: c }} />
            <span className="text-text-secondary">{label}</span>
          </div>
        ))}
      </div>

      {/* Add FAB */}
      <button
        onClick={onAddDog}
        data-tour="add"
        className="absolute bottom-4 end-3 w-14 h-14 rounded-full bg-primary text-white text-3xl shadow-lg flex items-center justify-center z-10"
        aria-label={t("add_dog")}
      >
        +
      </button>
    </div>
  );
}
