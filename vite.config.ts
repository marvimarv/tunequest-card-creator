import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/tunequest-card-generator/',   // <‑‑ WICHTIG für Unterpfad
  plugins: [react()],
});