/**
 * Playwright config for remote E2E tests (RFS & Production).
 *
 * Usage:
 *   npm run e2e:rfs              # Run all tests against RFS
 *   npm run e2e:rfs:headed       # Run headed against RFS
 *   npm run e2e:prod             # Run smoke-only against Production
 *   npm run e2e:prod:headed      # Run headed against Production
 */

import { defineConfig } from '@playwright/test';
import fs from 'node:fs';

const browserCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
];

const executablePath = browserCandidates.find(c => fs.existsSync(c));

if (!executablePath) {
  throw new Error('No local Chrome or Edge executable found for Playwright.');
}

const target = process.env.E2E_TARGET || 'rfs';
const baseUrls: Record<string, string> = {
  rfs: 'https://rfs.rituyog.com',
  prod: 'https://admin.rituyog.com',
};

export default defineConfig({
  testDir: './e2e/remote',
  timeout: 90_000,
  fullyParallel: false,
  workers: 2,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: `playwright-report/${target}`, open: 'never' }],
  ],
  use: {
    baseURL: baseUrls[target] || baseUrls.rfs,
    headless: true,
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: `${target}-chromium`,
      use: {
        browserName: 'chromium',
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
