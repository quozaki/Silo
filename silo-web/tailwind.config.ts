import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // MASTER v2 §2 — exact hex, dark-only Precision Console
        bg: "#09090B",
        "bg-workspace": "#0C0C0E",
        "bg-sidebar": "#111113",
        surface: "#18181B",
        "surface-2": "#1F1F23",
        "surface-hover": "#27272A",
        "surface-active": "#27272A",
        border: "#27272A",
        "border-subtle": "#1E1E20",
        "border-strong": "#3F3F46",
        text: "#FAFAFA",
        "text-secondary": "#A1A1AA",
        "text-muted": "#71717A",
        muted: "#71717A",
        "text-dim": "#52525B",
        "text-faint": "#3F3F46",
        accent: "#6366F1",
        "accent-hover": "#818CF8",
        "accent-dim": "rgba(99,102,241,0.12)",
        "accent-ring": "rgba(99,102,241,0.35)",
        green: "#22C55E",
        "green-dim": "rgba(34,197,94,0.14)",
        "green-glow": "rgba(34,197,94,0.35)",
        warning: "#F59E0B",
        danger: "#EF4444",
        "danger-dim": "rgba(239,68,68,0.12)",
      },
    },
  },
  plugins: [],
};
export default config;
