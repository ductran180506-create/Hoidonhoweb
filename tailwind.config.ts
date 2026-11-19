import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Bảng màu chuẩn MangaVerse từ ảnh thiết kế
        manga: {
          bg: "#0B0F19",       // Neutral base
          card: "#121826",     // Surface card
          subtle: "#182234",   // Subtle background
          border: "#1F293D",   // Clean border
          hover: "#26334D",    // Hover border/surface
          text: "#F3F4F6",     // Main text
          muted: "#9CA3AF",    // Muted text
          darkMuted: "#6B7280",// Low-contrast text
        },
        primary: {
          DEFAULT: "#8B5CF6", // Tím MangaVerse
          hover: "#7C3AED",
          light: "#A78BFA",
          dark: "#6D28D9",
          bg: "#2E1065",
        },
        secondary: {
          DEFAULT: "#EC4899", // Hồng Magenta
          hover: "#DB2777",
          light: "#F472B6",
          bg: "#500724",
        },
        tertiary: {
          DEFAULT: "#F59E0B", // Vàng Hổ Phách / Xu
          hover: "#D97706",
          light: "#FBBF24",
          bg: "#451A03",
        },
      },
      fontFamily: {
        headline: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        body: ["'Inter'", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
