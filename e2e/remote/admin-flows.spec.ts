/**
 * Admin Flow Tests — Run on BOTH RFS and Production.
 * Read-only: navigates pages and verifies data displays correctly.
 * No data mutation.
 */

import { test, expect } from '@playwright/test';
import { getAdminPassword, getActiveMembers, getInvoices } from '../support/envApi';

let adminPassword = '';

test.beforeAll(async ({ request }) => {
  adminPassword = await getAdminPassword(request);
});

test.describe('Members Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('member list shows data in table', async ({ page }) => {
    await page.goto('/admin/members');
    await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
    // Table should have at least one row
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  });

  test('member search filters results', async ({ page }) => {
    await page.goto('/admin/members');
    const search = page.getByPlaceholder(/Search/i);
    await search.fill('a');
    await page.waitForTimeout(500);
    // Should still show results (most names have 'a')
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('member detail page loads from table click', async ({ page }) => {
    await page.goto('/admin/members');
    await page.locator('table tbody tr a[href*="/admin/members/"]').first().click();
    await page.waitForURL(/\/admin\/members\//);
    // Should show member info sections
    await expect(page.getByText(/Active|Expired|Inactive/i).first()).toBeVisible();
  });
});

test.describe('Leads Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('lead list renders', async ({ page }) => {
    await page.goto('/admin/leads');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible();
    await expect(page.getByText('New Leads')).toBeVisible();
  });
});

test.describe('Attendance Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('attendance page shows slots and date controls', async ({ page }) => {
    await page.goto('/admin/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible();
    await expect(page.getByText('Session:')).toBeVisible();
    await expect(page.getByText('Date:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('attendance tiles render for selected slot', async ({ page }) => {
    await page.goto('/admin/attendance');
    await page.waitForTimeout(2000);
    // Should show member tiles (colored divs with names)
    const content = await page.locator('.grid').first().textContent();
    expect(content?.length).toBeGreaterThan(0);
  });
});

test.describe('Invoices Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('invoice list shows data', async ({ page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Invoice/i })).toBeVisible();
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  });

  test('invoice detail page loads', async ({ page }) => {
    await page.goto('/admin/invoices');
    await page.getByRole('link', { name: 'View' }).first().click();
    await page.waitForURL(/\/admin\/invoices\//);
    await expect(page.getByText(/INV-|HINV-/i)).toBeVisible();
  });
});

test.describe('Settings Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('settings tabs render', async ({ page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByRole('button', { name: 'WhatsApp' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Our Plans' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Studio' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Security' })).toBeVisible();
  });

  test('studio tab loads form', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: 'Studio' }).click();
    await expect(page.getByLabel('Studio Name')).toBeVisible();
  });

  test('plans tab shows membership plans', async ({ page }) => {
    await page.goto('/admin/settings');
    await page.getByRole('button', { name: 'Our Plans' }).click();
    await expect(page.getByRole('heading', { name: 'Monthly' }).first()).toBeVisible();
  });
});

test.describe('Subscriptions & Payments', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('subscription list renders', async ({ page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page.getByRole('heading', { name: /Subscription/i })).toBeVisible();
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  });

  test('payment list renders', async ({ page }) => {
    await page.goto('/admin/payments');
    await expect(page.getByRole('heading', { name: 'Payments' })).toBeVisible();
  });
});

test.describe('Session Planning Pages', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('asana list renders', async ({ page }) => {
    await page.goto('/admin/asanas');
    await expect(page.getByRole('heading', { name: /Asana/i })).toBeVisible();
  });

  test('session plans list renders', async ({ page }) => {
    await page.goto('/admin/session-plans');
    await expect(page.getByRole('heading', { name: /Session Plan/i })).toBeVisible();
  });

  test('session allocation page renders', async ({ page }) => {
    await page.goto('/admin/session-allocations');
    await expect(page.getByRole('heading', { name: /Allocation/i })).toBeVisible();
  });

  test('record execution page renders', async ({ page }) => {
    await page.goto('/admin/session-executions/record');
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('session reports page renders', async ({ page }) => {
    await page.goto('/admin/session-reports');
    await expect(page.getByRole('heading', { name: /Session Report|Report/i }).first()).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Inventory & Expenses', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  test('products page renders', async ({ page }) => {
    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: /Product/i })).toBeVisible();
  });

  test('inventory page renders', async ({ page }) => {
    await page.goto('/admin/inventory');
    await expect(page.getByRole('heading', { name: /Stock|Inventory/i })).toBeVisible();
  });

  test('expenses page renders', async ({ page }) => {
    await page.goto('/admin/expenses');
    await expect(page.getByRole('heading', { name: 'Expenses' })).toBeVisible();
  });

  test('financial reports page renders', async ({ page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /Financial|Report/i })).toBeVisible();
  });
});
