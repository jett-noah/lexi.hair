/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#FAF6F0',
          dark: '#F0E9DF',
          card: '#FFFDF9'
        },
        espresso: {
          DEFAULT: '#2C221E',
          light: '#5C4D46',
          muted: '#8C7B73'
        },
        terracotta: {
          DEFAULT: '#C89D88',
          hover: '#B58770'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}