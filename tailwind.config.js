/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/flowbite-react/lib/**/*.{js,ts}",
  ],
  theme: {
    container: {
      center: true,
      padding: '1rem', 
    },
    extend: {
      colors: {
        primary: '#5470c6',  
        secondary: '#9cb4ff',
        lightGray: '#f9fafb',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], 
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), 
    require('flowbite/plugin')
  ],
}
