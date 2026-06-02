import type { Config } from "tailwindcss";

// Color tokens mirror the mobile design system (mobile/src/utils/theme.ts)
// so the web and native apps stay visually identical.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#C8860A", dark: "#A87008", light: "#EAC06A", bg: "#2A1F0E" },
        success: { DEFAULT: "#4AAA6A", bg: "#1A3A25", border: "#2A5A35" },
        info: { DEFAULT: "#4A90D0", bg: "#1A2A3A", border: "#2A4A5A" },
        warning: { DEFAULT: "#E8A020", bg: "#3A2A10", border: "#5A4A20" },
        danger: { DEFAULT: "#E84040", bg: "#3A1A1A", border: "#5A2A2A" },
        background: "#1A1209",
        surface: { DEFAULT: "#2A1F0E", light: "#3A2A14" },
        border: { DEFAULT: "#4A3520", light: "#5A4530" },
        text: { primary: "#F0E6D3", secondary: "#A08060", tertiary: "#605040", disabled: "#504030" },
      },
      borderRadius: { sm: "6px", md: "10px", lg: "14px", xl: "20px" },
    },
  },
  plugins: [],
};

export default config;
