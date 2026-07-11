import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // shared/leveling.js อยู่นอก client/ — dev server ต้องได้รับอนุญาตให้เสิร์ฟไฟล์นอก root
    fs: { allow: ['..'] },
    proxy: {
      '/api': {
        target:      'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
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
