/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef8f3', 100: '#d5ede1', 200: '#aedbc6', 300: '#79c3a1',
          400: '#4ba87c', 500: '#2f8d62', 600: '#22714f', 700: '#1d5b41',
          800: '#1a4935', 900: '#163c2d', 950: '#0b2219',
        },
        surface: { 0: '#ffffff', 50: '#f8fafb', 100: '#f0f2f4', 200: '#e2e5e9', 300: '#c8cdd4' },
        ink: { 50: '#f5f5f6', 100: '#e5e5e7', 200: '#cfcfd3', 300: '#a9a9af', 400: '#7c7c84', 500: '#616169', 600: '#52525a', 700: '#46464c', 800: '#3d3d41', 900: '#27272a', 950: '#141416' },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      keyframes: {
        'fade-in-up': { '0%': { opacity: 0, transform: 'translateY(16px)' }, '100%': { opacity: 1, transform: 'translateY(0)' } },
        'stamp-in': { '0%': { opacity: 0, transform: 'scale(1.6) rotate(-12deg)' }, '60%': { opacity: 1, transform: 'scale(0.95) rotate(2deg)' }, '100%': { opacity: 1, transform: 'scale(1) rotate(0)' } },
        'check-draw': { '0%': { 'stroke-dashoffset': 24 }, '100%': { 'stroke-dashoffset': 0 } },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.5s ease-out both',
        'stamp-in': 'stamp-in 0.55s cubic-bezier(0.22,1,0.36,1) both',
        'check-draw': 'check-draw 0.4s ease-out 0.3s both',
      },
    },
  },
  plugins: [],
};
