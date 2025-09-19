/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fffbf0',
          100: '#fff7e6',
          200: '#ffedcc',
          300: '#ffd999',
          400: '#ffc566',
          500: '#ffb905',
          600: '#e6a700',
          700: '#cc9500',
          800: '#b38300',
          900: '#997100',
        },
        dark: {
          50: '#f5f5f5',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#000000',
        },
      },
    },
  },
  plugins: [],
} 