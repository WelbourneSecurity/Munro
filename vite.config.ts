import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The app is served from the domain root at https://munro.welbournesecurity.com
// (public/CNAME binds the custom domain), so the base is '/'. PR previews
// override this at build time with --base=/pr-preview/pr-<N>/ — see
// .github/workflows/pr-preview.yml.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    // The main chunk is dominated by maplibre-gl and the bundled hill-profile
    // data — both accepted as the product (see "Performance budget" in
    // wiki/operations.md). Vite's default 500 kB warning would fire on every
    // build and carry no signal; this limit sits just above the measured
    // chunk size so the warning returns only when the budget is exceeded.
    chunkSizeWarningLimit: 2500,
  },
});
