import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/experience/',
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  build: {
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        embed: resolve(__dirname, 'embed.html'),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'embed') return 'assets/embed.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: (chunk) => {
          if (chunk.name === 'scene' || chunk.facadeModuleId?.includes('/scene.js')) {
            return 'assets/scene.js';
          }
          return 'assets/[name]-[hash].js';
        },
        assetFileNames: (assetInfo) => {
          const primary = assetInfo.names?.[0] ?? assetInfo.name ?? '';
          if (primary === 'embed.css' || primary.includes('embed-host')) return 'assets/embed.css';
          if (primary.includes('style.css') || primary === 'scene.css') return 'assets/scene.css';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
  },
});
