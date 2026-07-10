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
});
