import type { Config } from "tailwindcss";

// Dark-grey UI with badge-yellow accents; see ../DESIGN.md.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1F1F23",
        panel: "#2A2A2F",
        card: "#323238",
        line: "#55555C",
        ink: "#F5F5F5",
        accent: "#F2B90D",
        sun: "#FFD84A",
        alert: "#2BD67B",
      },
      fontFamily: {
        pixel: ["var(--font-pixel)", "monospace"],
        sans: ["var(--font-grotesk)", "system-ui", "sans-serif"],
      },
    },
  },
} satisfies Config;
