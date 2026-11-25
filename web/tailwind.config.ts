import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#090A0F",
        card: "#11141E",
        line: "#1E222D",
        primary: "#00F0FF",
        purple: "#8B5CF6",
        success: "#00E599",
        warn: "#FF3B30",
      },
    },
  },
} satisfies Config;
