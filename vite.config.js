import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Folosim base: './' pentru ca aplicatia sa functioneze direct pe orice sub-ruta GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: './',
});
