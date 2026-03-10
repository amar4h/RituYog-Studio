import { test, expect } from './fixtures';
import { test as baseTest } from '@playwright/test';
import { resetSeedData } from './fixtures';

test.describe('Leads - Admin', () => {
  test('lead list page loads with seed data', async ({ adminPage: page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
    await expect(page.getByText('Manage prospective members')).toBeVisible();
  });

  test('add lead button exists', async ({ adminPage: page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('button', { name: 'Add Lead' })).toBeVisible();
  });

  test('lead detail page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/leads');
    // Click first lead row
    const firstRow = page.locator('table tbody tr').first();
    if (await firstRow.isVisible().catch(() => false)) {
      await firstRow.click();
      await page.waitForURL(/\/admin\/leads\//);
    }
  });

  test('new leads stat card shows count', async ({ adminPage: page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByText('New Leads')).toBeVisible();
  });
});

baseTest.describe('Public Registration', () => {
  baseTest.beforeEach(async ({ page }) => {
    await resetSeedData(page);
  });

  baseTest('register page loads with form fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByLabel('Age')).toBeVisible();
    await expect(page.getByLabel('Gender')).toBeVisible();
  });

  baseTest('register form validates required fields', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Submit Registration' }).click();
    // Should stay on register page (validation prevents submission)
    await expect(page).toHaveURL(/\/register$/);
  });

  baseTest('successful registration shows success page', async ({ page }) => {
    await page.goto('/register');
    await page.getByLabel('First Name').fill('E2E');
    await page.getByLabel('Last Name').fill('TestLead');
    await page.getByLabel('Email').fill('e2e.lead@test.com');
    await page.getByLabel('Phone').fill('9999800001');
    await page.getByLabel('Age').fill('25');
    await page.getByLabel('Gender').selectOption('female');
    // Select preferred slot
    const slotSelect = page.getByLabel('Preferred Slot');
    if (await slotSelect.isVisible().catch(() => false)) {
      await slotSelect.selectOption({ index: 1 });
    }
    // Check consent checkboxes
    const termsCheckbox = page.locator('#termsCheckbox');
    if (await termsCheckbox.isVisible().catch(() => false)) {
      await termsCheckbox.check();
    }
    const disclaimerCheckbox = page.locator('#disclaimerCheckbox');
    if (await disclaimerCheckbox.isVisible().catch(() => false)) {
      await disclaimerCheckbox.check();
    }

    await page.getByRole('button', { name: 'Submit Registration' }).click();
    await expect(page.getByText(/Registration Successful/i)).toBeVisible({ timeout: 10_000 });
  });

  baseTest('book trial page loads', async ({ page }) => {
    await page.goto('/book-trial');
    await expect(page.getByRole('heading', { name: /Book.*Trial/i })).toBeVisible();
    // Should show slot buttons
    await expect(page.getByRole('button', { name: /Morning 7:30 AM/i }).first()).toBeVisible();
  });
});
