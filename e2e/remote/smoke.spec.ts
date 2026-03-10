/**
 * Smoke Tests — Run on BOTH RFS and Production.
 * Read-only: no data creation or mutation.
 * Verifies all pages load without errors.
 */

import { test, expect } from '@playwright/test';
import { getAdminPassword, getEnvConfig } from '../support/envApi';

let adminPassword = '';

test.beforeAll(async ({ request }) => {
  adminPassword = await getAdminPassword(request);
});

// ============================================
// PUBLIC PAGES
// ============================================

test.describe('Public Pages', () => {
  test('home page renders CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /welcome to/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book Free Trial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register Interest' })).toBeVisible();
  });

  test('register page loads form', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByLabel('First Name')).toBeVisible();
    await expect(page.getByLabel('Last Name')).toBeVisible();
    await expect(page.getByLabel('Phone')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Registration' })).toBeVisible();
  });

  test('book trial page loads slot UI', async ({ page }) => {
    await page.goto('/book-trial');
    await expect(page.getByRole('heading', { name: 'Book Your Free Trial Session' })).toBeVisible();
    await expect(page.getByText('Select Batch & Date')).toBeVisible();
    await expect(page.getByRole('button', { name: /Morning 7:30 AM/i }).first()).toBeVisible();
  });

  test('unauthenticated admin access redirects to login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('member login page renders', async ({ page }) => {
    await page.goto('/member/login');
    await expect(page.getByLabel('Phone Number')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
  });
});

// ============================================
// ADMIN LOGIN & DASHBOARD
// ============================================

test.describe('Admin Login & Dashboard', () => {
  test('admin login reaches dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin(\/dashboard)?$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('Active Members', { exact: true })).toBeVisible();
    await expect(page.getByText('Pending Leads', { exact: true })).toBeVisible();
    await expect(page.getByText('Expiring Soon', { exact: true })).toBeVisible();
  });

  test('environment badge shows correctly', async ({ page }) => {
    const config = getEnvConfig();
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');

    if (config.target === 'rfs') {
      await expect(page.getByText('RFS')).toBeVisible();
    }
    // Production has no badge
  });
});

// ============================================
// ALL ADMIN PAGES SMOKE TEST
// ============================================

test.describe('Admin Page Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/admin/, { timeout: 60_000 });
    await page.waitForLoadState('networkidle');
  });

  const adminPages = [
    { path: '/admin/dashboard', heading: 'Dashboard' },
    { path: '/admin/members', heading: 'Members' },
    { path: '/admin/leads', heading: 'Leads' },
    { path: '/admin/attendance', heading: 'Attendance' },
    { path: '/admin/notifications', heading: /Notification/i },
    { path: '/admin/subscriptions', heading: /Subscription/i },
    { path: '/admin/invoices', heading: /Invoice/i },
    { path: '/admin/payments', heading: /Payment/i },
    { path: '/admin/sessions', heading: /Time Slot|Session/i },
    { path: '/admin/asanas', heading: /Asana/i },
    { path: '/admin/session-plans', heading: /Session Plan/i },
    { path: '/admin/session-allocations', heading: /Allocation/i },
    { path: '/admin/session-executions', heading: /Session|Execution/i },
    { path: '/admin/session-reports', heading: /Session Report|Report/i },
    { path: '/admin/products', heading: /Product/i },
    { path: '/admin/inventory', heading: /Stock|Inventory/i },
    { path: '/admin/expenses', heading: /Expense/i },
    { path: '/admin/reports', heading: /Financial|Report/i },
    { path: '/admin/settings', heading: /Setting/i },
  ];

  for (const { path, heading } of adminPages) {
    test(`${path} loads without error`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('domcontentloaded');

      // Page should NOT show error boundary
      const hasError = await page.getByText('Something went wrong').isVisible().catch(() => false);
      expect(hasError, `${path} crashed with error boundary`).toBe(false);

      // Heading should be visible
      await expect(page.getByRole('heading', { name: heading }).first()).toBeVisible({ timeout: 15_000 });
    });
  }
});
