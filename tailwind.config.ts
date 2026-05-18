import { type Config } from "tailwindcss";
import daisyui from "daisyui";

export default {
  content: [
    "{routes,islands,components}/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "'Inter'",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        malayalam: [
          "'Noto Sans Malayalam'",
          "'Manjari'",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [daisyui],
  daisyui: {
    themes: [
      {
        kerala: {
          "primary": "#0d9488",
          "primary-content": "#ffffff",
          "secondary": "#1e3a8a",
          "secondary-content": "#ffffff",
          "accent": "#f59e0b",
          "neutral": "#1f2937",
          "base-100": "#ffffff",
          "base-200": "#f8fafc",
          "base-300": "#e2e8f0",
          "info": "#0284c7",
          "success": "#15803d",
          "warning": "#d97706",
          "error": "#b91c1c",
          "--rounded-btn": "0.5rem",
          "--rounded-box": "0.75rem",
        },
        keralaDark: {
          "primary": "#2dd4bf",
          "primary-content": "#0f172a",
          "secondary": "#93c5fd",
          "secondary-content": "#0f172a",
          "accent": "#fbbf24",
          "neutral": "#0f172a",
          "base-100": "#0b1220",
          "base-200": "#0f172a",
          "base-300": "#1e293b",
          "info": "#38bdf8",
          "success": "#4ade80",
          "warning": "#fbbf24",
          "error": "#f87171",
        },
      },
    ],
    darkTheme: "keralaDark",
    logs: false,
  },
} satisfies Config;
