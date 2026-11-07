/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#070b14',
          card: '#0e1626',
          'card-hover': '#141e33',
          border: '#1e2d4a',
          'border-bright': '#2b3f66',
          primary: '#0284c7', // Sky 600
          'primary-hover': '#0369a1',
          accent: '#06b6d4', // Cyan 500
          text: '#f1f5f9',
          muted: '#94a3b8',
          subtle: '#64748b',
          // Severity & Risk Palette
          critical: '#ef4444', // Red 500
          high: '#f97316',     // Orange 500
          medium: '#eab308',   // Yellow 500
          low: '#10b981',      // Emerald 500
          minimal: '#3b82f6',  // Blue 500
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'cyber-sm': '0 1px 3px 0 rgba(0, 0, 0, 0.4), 0 1px 2px 0 rgba(0, 0, 0, 0.24)',
        'cyber-md': '0 4px 12px -2px rgba(0, 0, 0, 0.5), 0 2px 6px -1px rgba(0, 0, 0, 0.3)',
        'cyber-glow': '0 0 15px -3px rgba(6, 182, 212, 0.3)',
        'cyber-glow-red': '0 0 15px -3px rgba(239, 68, 68, 0.3)',
      }
    },
  },
  plugins: [],
}
