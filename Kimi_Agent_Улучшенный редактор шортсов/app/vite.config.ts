import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"
import { inspectAttr } from 'kimi-plugin-inspect-react'

export default defineConfig({
  base: './',
  plugins: [
    inspectAttr(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['host.jpg', 'scene-product.jpg', 'scene-interview.jpg', 'scene-store.jpg'],
      manifest: {
        name: 'Postilka — редактор шортсов',
        short_name: 'Postilka',
        description: 'Редактор вертикальных видео для SMM-специалистов',
        theme_color: '#4987f4',
        background_color: '#f5f7fa',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { port: 3000 },
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
})
