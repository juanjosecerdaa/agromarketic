import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18221d",
        forest: "#244b37",
        leaf: "#3d7450",
        cream: "#f6f6f1",
        sand: "#e8e5d9",
        terracotta: "#c77646"
      },
      fontFamily: {
        sans: ["var(--font-inter)"],
        display: ["var(--font-manrope)"]
      },
      boxShadow: {
        soft: "0 14px 45px rgba(36, 75, 55, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
