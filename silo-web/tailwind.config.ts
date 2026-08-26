import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        surface: "#111111",
        "surface-2": "#161616",
        "surface-hover": "#1a1a1a",
        border: "rgba(255,255,255,0.08)",
        "border-subtle": "rgba(255,255,255,0.04)",
        "border-strong": "rgba(255,255,255,0.16)",
        muted: "#666666",
        "text-secondary": "#a0a0a0",
        text: "#ffffff",
        accent: "#ffffff",
        green: "#22c55e",
      },
    },
  },
  plugins: [],
};
export default config;
