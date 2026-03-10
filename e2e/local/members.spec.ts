import { test, expect } from './fixtures';

test.describe('Members', () => {
  test('member list page loads with seed data', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    await expect(page.getByText('Manage your yoga studio members')).toBeVisible();
    // Seed data has 12 members - table should have rows
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('search filters members', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    const search = page.getByPlaceholder('Search by name, email, or phone...');
    await search.fill('Priya');
    // Should filter to matching members
    await page.waitForTimeout(300); // debounce
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('add member button navigates to form', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForURL(/\/admin\/members\/new/);
    await expect(page.getByRole('heading', { name: 'Add New Member' })).toBeVisible();
  });

  test('create new member form has required fields', async ({ adminPage: page }) => {
    await page.goto('/admin/members/new');
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Age')).toBeVisible();
    await expect(page.getByLabel('Gender')).toBeVisible();
    await expect(page.getByText('Basic Information')).toBeVisible();
    await expect(page.getByText('Emergency Contact')).toBeVisible();
  });

  test('create new member successfully', async ({ adminPage: page }) => {
    await page.goto('/admin/members/new');
    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('TestMember');
    await page.getByLabel('Email').fill('e2e.test@yoga.com');
    await page.getByLabel('Phone').fill('9999900001');
    await page.getByLabel('Age').fill('30');
    await page.getByLabel('Gender').selectOption('female');

    // Submit the form
    await page.getByRole('button', { name: /save|create|submit/i }).click();

    // Should redirect to member detail or list
    await page.waitForURL(/\/admin\/members/);
  });

  test('view member detail page', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    // Click first member row
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/admin\/members\/[a-zA-Z0-9-]+$/);
    // Should show member info
    await expect(page.getByText(/Active|Expired|Inactive/i)).toBeVisible();
  });

  test('member detail shows subscription section', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/admin\/members\//);
    // Should have subscription or attendance info
    const hasSubscription = await page.getByText(/Subscription|Membership/i).isVisible().catch(() => false);
    const hasNoSub = await page.getByText(/No subscription/i).isVisible().catch(() => false);
    expect(hasSubscription || hasNoSub).toBe(true);
  });

  test('edit member button works', async ({ adminPage: page }) => {
    await page.goto('/admin/members');
    // Click Edit on first row
    await page.locator('table tbody tr').first().getByRole('button', { name: 'Edit' }).click();
    await page.waitForURL(/\/admin\/members\/.*\/edit/);
    await expect(page.getByRole('heading', { name: 'Edit Member' })).toBeVisible();
  });
});
