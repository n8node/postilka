import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f5f5f5",
        surface: "#ffffff",
        text: "#09090b",
        muted: "#71717b",
        accent: "#2563eb",
        border: "#e5e5e5",
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgb(0 0 0 / 0.04)",
      },
      keyframes: {
        "wave-float-1": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(28px, -18px) scale(1.04)" },
          "66%": { transform: "translate(-16px, 12px) scale(0.98)" },
        },
        "wave-float-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "50%": { transform: "translate(-32px, 22px) scale(1.06)" },
        },
        "wave-float-3": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "40%": { transform: "translate(24px, -14px) scale(1.03)" },
          "80%": { transform: "translate(-20px, 18px) scale(0.99)" },
        },
        "wave-float-4": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "45%": { transform: "translate(-26px, -20px) scale(1.05)" },
        },
        "wave-drift": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "wave-float-1": "wave-float-1 20s ease-in-out infinite",
        "wave-float-2": "wave-float-2 24s ease-in-out infinite",
        "wave-float-3": "wave-float-3 28s ease-in-out infinite",
        "wave-float-4": "wave-float-4 22s ease-in-out infinite",
        "wave-drift": "wave-drift 45s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
