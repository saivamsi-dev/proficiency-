/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0A0A',
        bg2: '#111111',
        surface: '#161616',
        accent: '#FFFFFF',
        blue: '#4F8EF7',
        green: '#22C55E',
        yellow: '#EAB308',
        red: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"Geist Mono"', '"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      borderColor: {
        DEFAULT: 'rgba(255,255,255,0.07)',
        hover: 'rgba(255,255,255,0.14)',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.06)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.12)',
      },
    },
  },
  plugins: [],
}