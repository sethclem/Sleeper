/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sleeper: {
          primary: '#00ceb8',
          secondary: '#ff6b35',
          dark: '#0d1421',
          gray: '#1a202c',
        }
      }
    },
  },
  plugins: [],
}