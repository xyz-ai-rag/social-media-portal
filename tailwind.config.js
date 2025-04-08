/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem', // ⬅️ Important, centers your dashboard content
    },
    extend: {
      colors: {
        primary: '#5470c6',   // You can customize based on your brand
        secondary: '#9cb4ff',
        lightGray: '#f9fafb',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // Use Inter font properly
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // ⬅️ This makes your inputs/selects look GOOD!
  ],
}
