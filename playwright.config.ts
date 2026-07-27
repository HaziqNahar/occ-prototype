import { defineConfig } from '@playwright/test'

const frontendUrl = 'http://127.0.0.1:5183'
const backendUrl = 'http://127.0.0.1:8797'

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  outputDir: 'test-results',
  reporter: 'line',
  testDir: './e2e',
  timeout: 45_000,
  use: {
    baseURL: frontendUrl,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    viewport: { height: 720, width: 1280 },
  },
  webServer: [
    {
      command: 'npm run backend',
      env: {
        OCC_BACKEND_DATA_DIR: './.playwright-data',
        OCC_BACKEND_PORT: '8797',
      },
      name: 'OCC test backend',
      reuseExistingServer: false,
      timeout: 30_000,
      url: `${backendUrl}/api/health`,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1 --port 5183 --strictPort',
      env: {
        VITE_OCC_API_BASE: 'same-origin',
        VITE_OCC_PROXY_TARGET: backendUrl,
      },
      name: 'OCC test frontend',
      reuseExistingServer: false,
      timeout: 30_000,
      url: frontendUrl,
    },
  ],
  workers: 1,
})
