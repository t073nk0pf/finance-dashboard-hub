import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        surface2: "var(--color-surface-2)",
        surfaceElevated: "var(--color-surface-elevated)",
        ink: "var(--color-ink)",
        muted: "var(--color-muted)",
        line: "var(--color-line)",
        primary: "var(--color-primary)",
        navy: "var(--color-navy)",
        positive: "var(--color-positive)",
        negative: "var(--color-negative)",
        warning: "var(--color-warning)",
        info: "var(--color-info)",
        accent: "var(--color-accent)",
        secondary: "var(--color-secondary)",
      },
      boxShadow: {
        panel: "0 24px 60px rgba(15, 23, 42, 0.10)",
        soft: "0 12px 30px rgba(15, 23, 42, 0.07)",
        card: "0 1px 2px rgba(15, 23, 42, 0.06), 0 14px 36px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;
