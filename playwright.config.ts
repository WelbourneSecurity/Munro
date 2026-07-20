import { defineConfig, devices } from '@playwright/test';

// Environments with a pre-provisioned browser (no download allowed) can point
// PLAYWRIGHT_CHROMIUM_EXECUTABLE at a system Chromium; CI leaves this unset
// and uses the browsers installed by `npx playwright install`.
const chromiumExecutable = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

export default defineConfig({
  fullyParallel: true,
  // MapLibre, terrain workers and real canvas export are GPU/CPU intensive.
  // Ten concurrent workers starved otherwise healthy journeys locally and on
  // hosted CI; two keeps independent browser tests parallel without making
  // clicks wait minutes for a stable frame. Pure Vitest checks stay parallel.
  workers: 2,
  reporter: [['list'], ['html', { open: 'never' }]],
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:4173/',
    trace: 'on-first-retry',
    ...(chromiumExecutable
      ? { launchOptions: { executablePath: chromiumExecutable } }
      : {}),
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: 'http://127.0.0.1:4173/',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
    {
      // iPhone-13-class emulation for the phone-critical journeys only. The
      // suite stays chromium-only, so browserName overrides the profile's
      // webkit default and the PLAYWRIGHT_CHROMIUM_EXECUTABLE escape hatch
      // above keeps working for this project too.
      name: 'mobile',
      testMatch: /(smoke|core-flow)\.spec\.ts/,
      use: {
        ...devices['iPhone 13'],
        browserName: 'chromium',
      },
    },
  ],
});
