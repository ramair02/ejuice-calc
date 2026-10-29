import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' so the built dist/ folder works from any path or static host.
export default defineConfig({
  base: './',
  plugins: [react()],
});
