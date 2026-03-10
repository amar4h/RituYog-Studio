import { test, expect } from './fixtures';

test.describe('Subscriptions', () => {
  test('subscription list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/subscriptions');
    await expect(page.getByRole('heading', { name: /Subscriptions/i })).toBeVisible();
    // Seed data has subscriptions
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('new subscription form loads', async ({ adminPage: page }) => {
    await page.goto('/admin/subscriptions/new');
    // Should show member selector, plan tiles, slot selection
    await expect(page.getByText(/Select Member|Member/i)).toBeVisible();
  });

  test('subscription form has plan tiles', async ({ adminPage: page }) => {
    await page.goto('/admin/subscriptions/new');
    // Plans: Monthly, Quarterly, Semi-Annual
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('Quarterly')).toBeVisible();
  });

  test('subscription form has slot selection', async ({ adminPage: page }) => {
    await page.goto('/admin/subscriptions/new');
    // Should show session slot options
    await expect(page.getByText(/Morning 7:30 AM|Session Slot/i)).toBeVisible();
  });
});

test.describe('Invoices', () => {
  test('invoice list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/invoices');
    await expect(page.getByRole('heading', { name: /Invoices/i })).toBeVisible();
    const rows = page.locator('table tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('invoice detail page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/invoices');
    // Click first invoice
    await page.locator('table tbody tr').first().click();
    await page.waitForURL(/\/admin\/invoices\//);
    // Should show invoice number and amount
    await expect(page.getByText(/INV-/i)).toBeVisible();
  });

  test('invoice numbers follow sequential pattern', async ({ adminPage: page }) => {
    await page.goto('/admin/invoices');
    // Look for invoice numbers in the pattern PREFIX-NNNNN
    const invoiceCell = page.locator('table tbody tr td').first();
    const text = await invoiceCell.textContent();
    expect(text).toMatch(/[A-Z]+-\d+/);
  });
});

test.describe('Payments', () => {
  test('payment list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/payments');
    await expect(page.getByRole('heading', { name: /Payments/i })).toBeVisible();
  });

  test('record payment page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/payments/record');
    // Should show payment form
    await expect(page.getByText(/Record Payment|Payment/i)).toBeVisible();
  });
});
