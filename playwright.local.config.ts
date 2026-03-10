import { defineConfig, devices } from '@playwright/test';

/**
 * Local E2E tests - runs against npm run dev with localStorage seed data.
 * No API backend required.
 *
 * Usage:
 *   npm run e2e           # Run all local E2E tests (headed)
 *   npm run e2e:headless  # Run headless (CI)
 *   npm run e2e:ui        # Open Playwright UI
 */
export default defineConfig({
  testDir: './e2e/local',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report/local', open: 'never' }],
  ],
  timeout: 30_000,

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'] },
      testMatch: /navigation\.spec\.ts/,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 15_000,
  },
});
