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
        background: "#0b0f19",
        foreground: "#f8fafc",
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
        },
        slate: {
          850: "#111827",
          900: "#0f172a",
          950: "#070a12",
        },
        glass: {
          DEFAULT: "rgba(15, 23, 42, 0.8)",
          border: "rgba(255, 255, 255, 0.08)",
          hover: "rgba(30, 41, 59, 0.9)",
          card: "rgba(17, 24, 39, 0.75)",
        },
      },
      boxShadow: {
        soft: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        card: "0 4px 20px rgba(0, 0, 0, 0.3)",
      },
    },
  },
  plugins: [],
};
export default config;
