import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3737',
      '/assets': 'http://localhost:3737',
      '/manifest.json': 'http://localhost:3737',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
