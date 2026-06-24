import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:      'http://localhost:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target:      'http://localhost:3001',
        ws:           true,
        changeOrigin: true,
      },
    },
  },
});

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0F1115',
          surface: '#151922',
          elevated: '#1B2130',
        },
        gold: '#E8A027',
        borderDark: '#2A3142',
        success: '#3A8A5C',
        danger: '#B34747',
        text: {
          main: '#F5F5F5',
          muted: '#D1D5DB',
        }
      },
      fontFamily: {
        mitr: ['Mitr', 'sans-serif'],
        prompt: ['Prompt', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
