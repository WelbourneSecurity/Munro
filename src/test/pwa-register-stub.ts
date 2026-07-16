/**
 * Test stand-in for `virtual:pwa-register`, which only exists when
 * vite-plugin-pwa runs (production builds). Tests inject their own
 * loadRegisterModule; this stub just keeps the module resolvable.
 */
export function registerSW(): () => Promise<void> {
  return () => Promise.resolve();
}
