// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tunequest-card-generator/',
  server: {
    proxy: {
      '/api/musicbrainz': {
        target: 'http://127.0.0.1:3005', // dein lokales Express-Backend
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/musicbrainz/, '/musicbrainz')
      }
    }
  },
  build: {
    terserOptions: {
      compress: {
        drop_console: false
      }
    }
  }
})

// import { defineConfig } from 'vite';
// import react from '@vitejs/plugin-react';

// export default defineConfig({
//   base: '/tunequest-card-generator/',   // <‑‑ WICHTIG für Unterpfad
//   plugins: [react()],
// });