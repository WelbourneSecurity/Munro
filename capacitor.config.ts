import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor wraps the built web app (`dist/`) into native Android and iOS
 * shells. The native projects are not committed — CI generates them fresh
 * with `npx cap add` on every packaging run (see
 * `.github/workflows/mobile-packaging.yml`).
 */
const config: CapacitorConfig = {
  appId: 'uk.co.welbournesecurity.munro',
  appName: 'Munro',
  webDir: 'dist',
};

export default config;
