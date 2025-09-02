/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['"Barlow Condensed"', 'Helvetica', 'Arial', 'Lucida', 'sans-serif', 'Lora', 'Georgia'],
        'serif': ['Lora', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}