import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // This is crucial for GitHub Pages to load assets correctly
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
});