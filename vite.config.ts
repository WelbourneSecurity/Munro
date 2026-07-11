import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from the domain root at https://munro.welbournesecurity.com
// (public/CNAME binds the custom domain), so the base is '/'. PR previews
// override this at build time with --base=/pr-preview/pr-<N>/ — see
// .github/workflows/pr-preview.yml.
export default defineConfig({
  base: '/Munro/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // New service workers activate as soon as they are downloaded; the
      // refreshed shell is picked up on the next visit with no prompts.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Munro',
        short_name: 'Munro',
        description:
          'A calm, local-first peak bagging logbook built around a dark topographic map.',
        background_color: '#111713',
        theme_color: '#111713',
        display: 'standalone',
        icons: [
          { sizes: '192x192', src: 'icons/icon-192.png', type: 'image/png' },
          { sizes: '512x512', src: 'icons/icon-512.png', type: 'image/png' },
          {
            purpose: 'maskable',
            sizes: '512x512',
            src: 'icons/icon-maskable-512.png',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        // Precache the app shell only: HTML, bundled JS/CSS (peak and
        // boundary JSON is bundled into the JS) and the committed icons.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The bundled Wainwright + boundary data pushes the main chunk past
        // workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Deliberately no runtime caching: OpenFreeMap tiles, AWS terrain
        // tiles and style assets stay network-only, respecting the free
        // providers instead of hoarding their tiles on-device.
        runtimeCaching: [],
      },
    }),
  ],
});
