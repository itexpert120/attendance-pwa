import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'phone-number',
              test: /node_modules[\\/]libphonenumber-js/,
              priority: 3,
            },
            {
              name: 'offline-data',
              test: /node_modules[\\/](dexie|dexie-export-import)/,
              priority: 2,
            },
            {
              name: 'ui-vendor',
              test: /node_modules[\\/](svelte|bits-ui|phosphor-svelte)/,
              priority: 2,
            },
            {
              name: 'vendor',
              test: /node_modules/,
              priority: 1,
              maxSize: 450_000,
            },
          ],
        },
      },
    },
  },
  plugins: [
    tailwindcss(),
    svelte(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'Students Attendance Register',
        short_name: 'Attendance',
        description: 'Offline students attendance and fee register for schools.',
        theme_color: '#166534',
        background_color: '#fafafa',
        display: 'standalone',
        orientation: 'any',
        start_url: './',
        scope: './',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff,woff2}'],
      },
    }),
  ],
})
