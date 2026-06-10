import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { open: true },
  build: {
    target: 'esnext',
    assetsInlineLimit: 0,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three', 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/environments/RoomEnvironment.js'],
        },
      },
    },
  }
});
