import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#090d16",
        foreground: "#f3f4f6",
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          glow: "#818cf8",
        },
        accent: {
          cyan: "#06b6d4",
          purple: "#a855f7",
          amber: "#f59e0b",
          emerald: "#10b981",
        },
        glass: {
          DEFAULT: "rgba(17, 24, 39, 0.7)",
          border: "rgba(255, 255, 255, 0.12)",
          hover: "rgba(31, 41, 55, 0.8)",
          card: "rgba(15, 23, 42, 0.65)",
        },
      },
      backdropBlur: {
        xs: "2px",
        glass: "16px",
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(99, 102, 241, 0.4)",
        "cyan-glow": "0 0 25px -5px rgba(6, 182, 212, 0.4)",
        "purple-glow": "0 0 25px -5px rgba(168, 85, 247, 0.4)",
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.8" },
          "50%": { opacity: "1" },
        },
        slideRight: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "slide-right": "slideRight 0.3s ease-out forwards",
      },
    },
  },
  plugins: [],
};
export default config;
