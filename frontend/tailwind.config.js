/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'mlb-blue': '#002D72',
        'mlb-red': '#D50032',
        'zone-strike': '#22c55e',
        'zone-ball': '#ef4444',
        'zone-umpire': '#3b82f6',
        'zone-batter': '#f59e0b',
      }
    },
  },
  plugins: [],
}
