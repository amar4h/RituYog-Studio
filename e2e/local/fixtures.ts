import { test as base, expect, type Page } from '@playwright/test';

/**
 * Shared fixtures for local E2E tests.
 * The app uses localStorage with seed data (12 members, 2 leads, 4 slots, 3 plans).
 * Default admin password: 'admin123'
 */

const ADMIN_PASSWORD = 'admin123';

/** Login as admin and navigate to dashboard */
export async function adminLogin(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/admin/);
}

/** Reset localStorage to fresh seed data */
export async function resetSeedData(page: Page) {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    location.reload();
  });
  await page.waitForLoadState('networkidle');
}

/** Navigate to an admin page (assumes already logged in) */
export async function navigateTo(page: Page, path: string) {
  await page.goto(`/admin/${path}`);
  await page.waitForLoadState('domcontentloaded');
}

/** Wait for any loading spinners to disappear */
export async function waitForPageLoad(page: Page) {
  // Wait for any loading indicators to disappear
  const loader = page.locator('.animate-spin');
  if (await loader.isVisible({ timeout: 1000 }).catch(() => false)) {
    await loader.waitFor({ state: 'hidden', timeout: 10_000 });
  }
}

// Extended test fixture that auto-logs in as admin
export const test = base.extend<{ adminPage: Page }>({
  adminPage: async ({ page }, use) => {
    await resetSeedData(page);
    await adminLogin(page);
    await use(page);
  },
});

export { expect };
