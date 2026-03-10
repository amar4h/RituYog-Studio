import { test, expect } from './fixtures';

test.describe('Sidebar Navigation', () => {
  test('sidebar shows Dashboard link', async ({ adminPage: page }) => {
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  });

  test('sidebar People section links work', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Members' }).click();
    await page.waitForURL(/\/admin\/members/);
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();

    await page.getByRole('link', { name: 'Leads' }).click();
    await page.waitForURL(/\/admin\/leads/);
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();

    await page.getByRole('link', { name: 'Attendance' }).click();
    await page.waitForURL(/\/admin\/attendance/);
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible();
  });

  test('sidebar Billing section links work', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Subscriptions' }).click();
    await page.waitForURL(/\/admin\/subscriptions/);

    await page.getByRole('link', { name: 'Invoices' }).click();
    await page.waitForURL(/\/admin\/invoices/);

    await page.getByRole('link', { name: 'Payments' }).click();
    await page.waitForURL(/\/admin\/payments/);
  });

  test('sidebar Sessions section links work', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Time Slots' }).click();
    await page.waitForURL(/\/admin\/sessions/);

    await page.getByRole('link', { name: 'Asanas' }).click();
    await page.waitForURL(/\/admin\/asanas/);

    await page.getByRole('link', { name: 'Session Plans' }).click();
    await page.waitForURL(/\/admin\/session-plans/);
  });

  test('sidebar Inventory section links work', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Products' }).click();
    await page.waitForURL(/\/admin\/products/);

    await page.getByRole('link', { name: 'Stock' }).click();
    await page.waitForURL(/\/admin\/inventory/);

    await page.getByRole('link', { name: 'Expenses' }).click();
    await page.waitForURL(/\/admin\/expenses/);
  });

  test('sidebar Settings link works', async ({ adminPage: page }) => {
    await page.getByRole('link', { name: 'Settings' }).click();
    await page.waitForURL(/\/admin\/settings/);
  });

  test('all admin pages render without error', async ({ adminPage: page }) => {
    const pages = [
      '/admin/dashboard',
      '/admin/members',
      '/admin/leads',
      '/admin/attendance',
      '/admin/notifications',
      '/admin/subscriptions',
      '/admin/invoices',
      '/admin/payments',
      '/admin/sessions',
      '/admin/asanas',
      '/admin/session-plans',
      '/admin/session-allocations',
      '/admin/session-executions',
      '/admin/session-reports',
      '/admin/products',
      '/admin/inventory',
      '/admin/expenses',
      '/admin/settings',
    ];

    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');
      // Ensure no crash - error boundary or error page should NOT be visible
      const hasError = await page.getByText('Something went wrong').isVisible().catch(() => false);
      expect(hasError, `Page ${path} crashed`).toBe(false);
    }
  });
});

test.describe('Public Pages', () => {
  test('home page renders', async ({ adminPage: page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
  });

  test('register page renders', async ({ adminPage: page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('First Name')).toBeVisible();
  });

  test('book trial page renders', async ({ adminPage: page }) => {
    await page.goto('/book-trial');
    await expect(page.getByRole('heading', { name: /Book.*Trial/i })).toBeVisible();
  });
});
