import { test, expect } from '@playwright/test';
import { adminLogin, resetSeedData } from './fixtures';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await resetSeedData(page);
  });

  test('redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
  });

  test('shows error for wrong password', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });

  test('successful admin login reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill('admin123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active Members')).toBeVisible();
  });

  test('login persists on page reload', async ({ page }) => {
    await adminLogin(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('member login page renders', async ({ page }) => {
    await page.goto('/member/login');
    await expect(page.getByLabel('Phone Number')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.locator('form').getByRole('button', { name: 'Login' })).toBeVisible();
  });
});
