/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#050508',
        surface: '#1a1a1a',
        muted: '#888888',
        border: 'rgba(255,255,255,0.07)',
      },
    },
  },
  plugins: [],
}
