import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// The app is served from the domain root at https://munro.welbournesecurity.com
// (public/CNAME binds the custom domain), so the base is '/'. PR previews
// override this at build time with --base=/pr-preview/pr-<N>/ — see
// .github/workflows/pr-preview.yml.
export default defineConfig({
  base: '/',
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
        // Precache the app shell plus the lazy-loaded hill-list chunks.
        // Each list's peak data is a dynamic-import chunk (~20-80 kB, plus
        // ~380 kB for the UK-wide Marilyns), so it never bloats the initial
        // shell load; precaching them in the background keeps switching
        // lists working offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // The bundled boundary + hill-profile data pushes the main chunk
        // past workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Deliberately no runtime caching: OpenFreeMap tiles, AWS terrain
        // tiles and style assets stay network-only, respecting the free
        // providers instead of hoarding their tiles on-device.
        runtimeCaching: [],
      },
    }),
  ],
  build: {
    // The main chunk is dominated by maplibre-gl and the bundled hill-profile
    // data — both accepted as the product (see "Performance budget" in
    // wiki/operations.md). Vite's default 500 kB warning would fire on every
    // build and carry no signal; this limit sits just above the measured
    // chunk size so the warning returns only when the budget is exceeded.
    chunkSizeWarningLimit: 2500,
  },
});
