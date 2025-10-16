/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-dark': '#161514',
        'gray': {
          50: '#DEDBCC',
          100: '#C7C5B7',
          200: '#B1AFA3',
          300: '#9B998E',
          400: '#85837A',
          500: '#6F6D66',
          600: '#585751',
          700: '#42413D',
          800: '#2C2B28',
          900: '#161514'
        },
        'blue': {
          DEFAULT: '#DEDBCC',
          hover: '#C7C5B7',
          dark: '#B1AFA3'
        },
        'primary': {
          DEFAULT: '#DEDBCC',
          hover: '#C7C5B7',
          dark: '#B1AFA3'
        },
        'purple': {
          DEFAULT: '#9B998E',
          hover: '#85837A',
          dark: '#6F6D66'
        },
        'green': {
          DEFAULT: '#00b894',
          hover: '#00a383',
          dark: '#009178'
        },
        'peach': {
          DEFAULT: '#B1AFA3',
          hover: '#9B998E',
          dark: '#85837A'
        },
        'red': {
          DEFAULT: '#ff7675',
          hover: '#ff6b6a',
          dark: '#ff5f5e'
        }
      },
      fontFamily: {
        sans: ['Candara', 'sans-serif']
      }
    },
  },
  plugins: [],
}
