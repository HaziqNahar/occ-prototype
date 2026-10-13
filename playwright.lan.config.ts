import { defineConfig } from '@playwright/test'

// LAN rehearsal: the production build served by the bundled server, as on the
// host PC, with one trainer and two trainees in separate browser profiles.
// Run with: npm run test:lan
const hostUrl = 'http://127.0.0.1:8799'

export default defineConfig({
  expect: {
    timeout: 15_000,
  },
  fullyParallel: false,
  outputDir: 'test-results/lan',
  reporter: 'line',
  testDir: './e2e-lan',
  timeout: 180_000,
  use: {
    baseURL: hostUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { height: 900, width: 1440 },
  },
  webServer: {
    command: 'npm run host:build && node scripts/lan-test-host.mjs',
    name: 'OCC LAN host (production build)',
    reuseExistingServer: false,
    timeout: 240_000,
    url: `${hostUrl}/api/health`,
  },
  workers: 1,
})
