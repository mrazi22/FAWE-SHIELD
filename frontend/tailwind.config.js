/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        fawe: {
          navy: "#0F172A",
          green: "#16A34A",
          greenDark: "#15803D",
          greenSoft: "#DCFCE7",
          red: "#DC2626",
          redSoft: "#FEE2E2",
          amber: "#F59E0B",
          amberSoft: "#FEF3C7",
          slate: "#64748B",
          background: "#F8FAFC",
        },
      },
      boxShadow: {
        soft: "0 20px 60px rgba(15, 23, 42, 0.10)",
      },
    },
  },
  plugins: [],
};