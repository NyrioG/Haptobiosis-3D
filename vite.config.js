import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0
  }
});
