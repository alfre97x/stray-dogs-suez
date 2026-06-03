// Non-Tailwind design tokens needed as JS values (e.g. MapLibre marker colors,
// status config). Mirrors mobile/src/utils/theme.ts.

export const Colors = {
  primary: "#C8860A",
  success: "#4AAA6A",
  info: "#4A90D0",
  warning: "#E8A020",
  danger: "#E84040",
  pending: "#A06CD5",
  background: "#1A1209",
  surface: "#2A1F0E",
  border: "#4A3520",
  textPrimary: "#F0E6D3",
  textSecondary: "#A08060",
  textTertiary: "#605040",
} as const;

export const URGENCY_CONFIG = {
  low: { color: Colors.textTertiary, emoji: "👁️" },
  medium: { color: Colors.warning, emoji: "⚠️" },
  high: { color: Colors.danger, emoji: "🔴" },
  critical: { color: "#FF2020", emoji: "🚨" },
} as const;

// Marker color for a dog by its status. Order matters: injured (urgent) first,
// then in-progress catching (pending), then TNR/vaccination state.
export function dogMarkerColor(d: {
  is_injured: boolean;
  tnr_done: boolean;
  tnr_pending?: boolean;
  vaccinated: boolean;
}): string {
  if (d.is_injured) return Colors.danger;
  if (d.tnr_pending && !d.tnr_done) return Colors.pending;
  if (d.tnr_done && d.vaccinated) return Colors.success;
  if (d.tnr_done) return Colors.info;
  return Colors.primary;
}
