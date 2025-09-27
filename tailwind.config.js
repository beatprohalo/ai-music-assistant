/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/renderer/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#0f0f0f',
        'dark-surface': '#1a1a1a',
        'dark-card': '#262626',
        'dark-border': '#404040',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb'
      }
    },
  },
  plugins: [],
  darkMode: 'class'
}
