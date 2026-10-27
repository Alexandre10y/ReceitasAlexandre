import colors from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Cinza neutro: escuro de verdade no dark, branco de verdade no light.
        slate: {
          ...colors.neutral,
          950: '#0a0a0a',
        },
        indigo: colors.neutral,
        violet: colors.neutral,
        fuchsia: colors.neutral,
        sky: colors.neutral,
      },
    },
  },
  plugins: [],
}
