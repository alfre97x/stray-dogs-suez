// Suez City zones — kept in sync with the seed in 001_initial_schema.sql.
// Used as a client-side fallback for names/coordinates without a round-trip.
import type { Zone } from "./types";

export const ZONES: readonly Zone[] = [
  { id: "suez_canal", name_en: "Suez Canal Zone", name_ar: "منطقة قناة السويس", lat: 29.965, lng: 32.548 },
  { id: "arbeen", name_en: "Arbeen", name_ar: "عربين", lat: 29.98, lng: 32.54 },
  { id: "el_ganayen", name_en: "El Ganayen", name_ar: "الجناين", lat: 29.955, lng: 32.536 },
  { id: "faisal", name_en: "Faisal District", name_ar: "حي فيصل", lat: 29.972, lng: 32.56 },
  { id: "el_salam", name_en: "El Salam", name_ar: "السلام", lat: 29.948, lng: 32.552 },
  { id: "port_tawfiq", name_en: "Port Tawfiq", name_ar: "بور توفيق", lat: 29.935, lng: 32.56 },
  { id: "el_kornish", name_en: "El Kornish", name_ar: "الكورنيش", lat: 29.96, lng: 32.55 },
  { id: "al_shohada", name_en: "Al Shohada", name_ar: "الشهداء", lat: 29.99, lng: 32.545 },
  { id: "attaka", name_en: "Attaka", name_ar: "عتاقة", lat: 29.975, lng: 32.53 },
  { id: "faysaliah", name_en: "Faysaliah", name_ar: "الفيصلية", lat: 29.945, lng: 32.54 },
] as const;

export const SUEZ_CENTER = { lat: 29.965, lng: 32.548 };

export function zoneById(id: string): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

// The neighbourhood a coordinate belongs to = the nearest zone centre, which is
// exactly the Voronoi cell drawn on the map (see lib/zoneBoundaries.ts). Used to
// auto-assign a dog to its neighbourhood from GPS.
//
// IMPORTANT: this must use the SAME metric as the precomputed Voronoi cells
// (raw lng/lat Euclidean, no cos-latitude scaling) so a dog is always assigned
// to the neighbourhood it visually sits in. The cos-lat distortion is
// negligible across a single city.
export function zoneForPoint(lat: number, lng: number): Zone {
  let best = ZONES[0];
  let bestD = Infinity;
  for (const z of ZONES) {
    const dLat = z.lat - lat;
    const dLng = z.lng - lng;
    const d = dLat * dLat + dLng * dLng;
    if (d < bestD) {
      bestD = d;
      best = z;
    }
  }
  return best;
}
