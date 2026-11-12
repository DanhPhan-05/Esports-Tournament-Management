import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5178', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node tests/e2e/backend-fixture.mjs',
      url: 'http://127.0.0.1:5201/api/health',
      timeout: 180000,
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5178',
      url: 'http://127.0.0.1:5178',
      env: { VITE_PROXY_TARGET: 'http://127.0.0.1:5201' },
      timeout: 60000,
      reuseExistingServer: false,
    },
  ],
});
