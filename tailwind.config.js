/** @type {import('tailwindcss').Config} */
module.exports = {
  future: {
    hoverOnlyWhenSupported: true,
  },
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Outfit', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      spacing: {
        '4.5': '1.125rem',
      },
      boxShadow: {
        '2xs': '0 1px 1px 0 rgb(0 0 0 / 0.04)',
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}
