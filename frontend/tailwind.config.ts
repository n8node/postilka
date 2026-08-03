import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f8fafc",
        surface: "#ffffff",
        text: "#0f172a",
        muted: "#64748b",
        accent: "#2563eb",
      },
    },
  },
  plugins: [],
};

export default config;
