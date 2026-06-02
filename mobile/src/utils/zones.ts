// mobile/src/utils/zones.ts
export const ZONES = [
  { id: "suez_canal",  name_en: "Suez Canal Zone",  name_ar: "منطقة قناة السويس", lat: 29.9650, lng: 32.5480 },
  { id: "arbeen",      name_en: "Arbeen",            name_ar: "عربين",             lat: 29.9800, lng: 32.5400 },
  { id: "el_ganayen", name_en: "El Ganayen",        name_ar: "الجناين",           lat: 29.9550, lng: 32.5360 },
  { id: "faisal",     name_en: "Faisal District",   name_ar: "حي فيصل",          lat: 29.9720, lng: 32.5600 },
  { id: "el_salam",   name_en: "El Salam",          name_ar: "السلام",            lat: 29.9480, lng: 32.5520 },
  { id: "port_tawfiq",name_en: "Port Tawfiq",       name_ar: "بور توفيق",         lat: 29.9350, lng: 32.5600 },
  { id: "el_kornish", name_en: "El Kornish",        name_ar: "الكورنيش",          lat: 29.9600, lng: 32.5500 },
  { id: "al_shohada", name_en: "Al Shohada",        name_ar: "الشهداء",           lat: 29.9900, lng: 32.5450 },
  { id: "attaka",     name_en: "Attaka",            name_ar: "عتاقة",             lat: 29.9750, lng: 32.5300 },
  { id: "faysaliah",  name_en: "Faysaliah",         name_ar: "الفيصلية",          lat: 29.9450, lng: 32.5400 },
] as const;

export type ZoneId = typeof ZONES[number]["id"];
