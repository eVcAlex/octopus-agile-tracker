import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Octopus Agile Tracker',
        short_name: 'Agile Tracker',
        description:
          'Track Octopus Energy Agile electricity prices and gas unit rates',
        theme_color: '#7c3aed',
        background_color: '#1a1b1e',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/proxy/forecast': {
        target: 'https://prices.fly.dev',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/proxy\/forecast/, '/api') + '/?format=json',
      },
      '/proxy/wholesale': {
        target: 'https://dataportal-api.nordpoolgroup.com',
        changeOrigin: true,
        rewrite: (path) =>
          path.replace(/^\/proxy\/wholesale/, '/api/DayAheadPrices'),
      },
    },
  },
  base: '/',
});
