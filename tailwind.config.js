/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf6',
          100: '#d1fae9',
          200: '#a7f3d5',
          300: '#6ee7bc',
          400: '#34d39d',
          500: '#10b982', // Nuanța exactă extrasă din logo-ul TNmemo
          600: '#059669',
          700: '#047854',
          800: '#065f44',
          900: '#064e38',
          950: '#022c20',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
