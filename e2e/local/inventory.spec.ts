import { test, expect } from './fixtures';

test.describe('Products', () => {
  test('product list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/products');
    await expect(page.getByRole('heading', { name: /Products/i })).toBeVisible();
  });

  test('create product form loads', async ({ adminPage: page }) => {
    await page.goto('/admin/products/new');
    await expect(page.getByLabel(/Name/i)).toBeVisible();
  });
});

test.describe('Inventory', () => {
  test('inventory/stock page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/inventory');
    await expect(page.getByRole('heading', { name: /Stock|Inventory/i })).toBeVisible();
  });
});

test.describe('Expenses', () => {
  test('expense list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/expenses');
    await expect(page.getByRole('heading', { name: /Expenses/i })).toBeVisible();
  });

  test('create expense form loads', async ({ adminPage: page }) => {
    await page.goto('/admin/expenses/new');
    await expect(page.getByText(/Vendor|Expense/i)).toBeVisible();
  });
});

test.describe('Financial Reports', () => {
  test('financial reports page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading', { name: /Financial|Reports/i })).toBeVisible();
  });

  test('sales report page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/sales/report');
    await expect(page.getByRole('heading', { name: /Sales/i })).toBeVisible();
  });
});
