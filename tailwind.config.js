/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          dark: '#06060c',
          panel: 'rgba(10, 10, 20, 0.75)',
          cyan: '#00f3ff',
          magenta: '#ff007f',
          green: '#00ff66',
          gold: '#ffaa00',
          blue: '#1a1a3a',
          border: 'rgba(0, 243, 255, 0.25)',
        }
      },
      boxShadow: {
        'neon-cyan': '0 0 15px rgba(0, 243, 255, 0.5), inset 0 0 15px rgba(0, 243, 255, 0.2)',
        'neon-magenta': '0 0 15px rgba(255, 0, 127, 0.5), inset 0 0 15px rgba(255, 0, 127, 0.2)',
        'neon-green': '0 0 15px rgba(0, 255, 102, 0.5), inset 0 0 15px rgba(0, 255, 102, 0.2)',
        'neon-gold': '0 0 15px rgba(255, 170, 0, 0.5), inset 0 0 15px rgba(255, 170, 0, 0.2)',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
      }
    },
  },
  plugins: [],
}
