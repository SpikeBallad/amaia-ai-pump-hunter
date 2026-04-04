/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      boxShadow: {
        panel: '0 24px 90px rgba(2, 6, 23, 0.5)',
        glow: '0 0 0 1px rgba(34, 211, 238, 0.12), 0 12px 60px rgba(6, 182, 212, 0.18)',
      },
      colors: {
        ink: '#050816',
        ember: '#f59e0b',
        pulse: '#34d399',
        signal: '#22d3ee',
      },
    },
  },
  plugins: [],
};
