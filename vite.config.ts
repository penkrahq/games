import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],
  root: 'apps/web',
  build: { outDir: '../../dist/web', emptyOutDir: true },
  server: {
    port: 5173,
    proxy: {
      '/sequence/api': 'http://localhost:3000',
      '/sequence/socket.io': { target: 'ws://localhost:3000', ws: true },
      '/connect4/api': 'http://localhost:3000',
      '/connect4/socket.io': { target: 'ws://localhost:3000', ws: true },
    },
  },
});
