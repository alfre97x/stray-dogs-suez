// mobile/src/utils/theme.ts
import { Platform } from "react-native";

export const Colors = {
  // Primary palette — warm desert amber
  primary:       "#C8860A",
  primaryDark:   "#A87008",
  primaryLight:  "#EAC06A",
  primaryBg:     "#2A1F0E",

  // Status
  success:       "#4AAA6A",
  successBg:     "#1A3A25",
  successBorder: "#2A5A35",

  info:          "#4A90D0",
  infoBg:        "#1A2A3A",
  infoBorder:    "#2A4A5A",

  warning:       "#E8A020",
  warningBg:     "#3A2A10",
  warningBorder: "#5A4A20",

  danger:        "#E84040",
  dangerBg:      "#3A1A1A",
  dangerBorder:  "#5A2A2A",

  // Neutrals
  background:    "#1A1209",
  surface:       "#2A1F0E",
  surfaceLight:  "#3A2A14",
  border:        "#4A3520",
  borderLight:   "#5A4530",

  // Text
  textPrimary:   "#F0E6D3",
  textSecondary: "#A08060",
  textTertiary:  "#605040",
  textDisabled:  "#504030",

  // Urgency colours
  urgency: {
    low:      "#806040",
    medium:   "#E8A020",
    high:     "#E84040",
    critical: "#FF2020",
  },

  white: "#FFFFFF",
  black: "#000000",
  transparent: "transparent",
};

export const Typography = {
  fontFamily: Platform.select({
    ios: "System",
    android: "Roboto",
    default: "System",
  }),

  sizes: {
    xs:   11,
    sm:   12,
    base: 14,
    md:   15,
    lg:   17,
    xl:   20,
    xxl:  24,
    hero: 32,
  },

  weights: {
    regular: "400" as const,
    medium:  "500" as const,
    semibold:"600" as const,
    bold:    "700" as const,
    black:   "900" as const,
  },
};

export const Spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  base: 16,
  lg:   20,
  xl:   24,
  xxl:  32,
  xxxl: 48,
};

export const Radius = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
};

export const Shadows = {
  sm: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 4 },
    android: { elevation: 3 },
    default: {},
  }),
  md: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12 },
    android: { elevation: 8 },
    default: {},
  }),
  lg: Platform.select({
    ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 24 },
    android: { elevation: 16 },
    default: {},
  }),
};

// Urgency config
export const URGENCY_CONFIG = {
  low:      { color: Colors.textTertiary,   label_en: "Low",      label_ar: "منخفض",  emoji: "👁️" },
  medium:   { color: Colors.warning,        label_en: "Medium",   label_ar: "متوسط",  emoji: "⚠️" },
  high:     { color: Colors.danger,         label_en: "High",     label_ar: "مرتفع",  emoji: "🔴" },
  critical: { color: Colors.urgency.critical, label_en: "Critical", label_ar: "حرج",   emoji: "🚨" },
};

export const STATUS_CONFIG = {
  tnr:        { color: Colors.success, label_en: "TNR done",    label_ar: "تعقيم",    bg: Colors.successBg },
  vaccinated: { color: Colors.info,    label_en: "Vaccinated",  label_ar: "تطعيم",    bg: Colors.infoBg },
  injured:    { color: Colors.danger,  label_en: "Injured",     label_ar: "مصاب",     bg: Colors.dangerBg },
  needs_tnr:  { color: Colors.warning, label_en: "Needs TNR",   label_ar: "بحاجة تعقيم", bg: Colors.warningBg },
};
