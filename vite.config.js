import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 3000
  },
  resolve: {
    alias: {
      'canvg': path.resolve(__dirname, 'src/lib/canvg-stub.js')
    }
  },
  optimizeDeps: {
    exclude: ['canvg']
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: ['canvg']
    }
  }
})

