/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1E517B',
          light: '#7DFEE3',
          dark: '#39B197'
        },
        secondary: {
          DEFAULT: '#EEEEEE',
          accent: '#FD9B7B'
        }
      },
      animation: {
        'menu-expand': 'menu-expand 0.3s ease-out',
        'menu-collapse': 'menu-collapse 0.3s ease-out',
      },
      keyframes: {
        'menu-expand': {
          '0%': { width: '5rem' },
          '100%': { width: '16rem' },
        },
        'menu-collapse': {
          '0%': { width: '16rem' },
          '100%': { width: '5rem' },
        },
      },
    },
  },
  plugins: [],
};