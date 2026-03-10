import { test, expect } from './fixtures';

test.describe('Settings', () => {
  test('settings page loads with tabs', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await expect(page.getByText('WhatsApp')).toBeVisible();
    await expect(page.getByText('Our Plans')).toBeVisible();
    await expect(page.getByText('Studio')).toBeVisible();
    await expect(page.getByText('Holidays')).toBeVisible();
    await expect(page.getByText('Invoices')).toBeVisible();
    await expect(page.getByText('Legal')).toBeVisible();
    await expect(page.getByText('Security')).toBeVisible();
  });

  test('Studio tab shows studio info form', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Studio').click();
    await expect(page.getByLabel('Studio Name')).toBeVisible();
    await expect(page.getByLabel('Address')).toBeVisible();
  });

  test('Studio tab saves studio name', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Studio').click();
    const nameInput = page.getByLabel('Studio Name');
    await nameInput.clear();
    await nameInput.fill('E2E Test Studio');
    await page.getByRole('button', { name: /save/i }).first().click();
    // Expect success feedback
    await expect(page.getByText(/saved|success/i)).toBeVisible({ timeout: 5_000 });
  });

  test('Our Plans tab shows membership plans', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Our Plans').click();
    // Should show default plans
    await expect(page.getByText('Monthly')).toBeVisible();
    await expect(page.getByText('Quarterly')).toBeVisible();
  });

  test('Holidays tab shows holiday management', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Holidays').click();
    // Should have add holiday button
    await expect(page.getByRole('button', { name: /add holiday/i })).toBeVisible();
  });

  test('Invoices tab shows numbering config', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Invoices').click();
    // Should show prefix and start number fields
    await expect(page.getByText(/Invoice Prefix|Prefix/i)).toBeVisible();
  });

  test('Legal tab shows terms editor', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Legal').click();
    await expect(page.getByText(/Terms & Conditions|Terms/i)).toBeVisible();
    await expect(page.getByText(/Health Disclaimer/i)).toBeVisible();
  });

  test('Security tab shows password change form', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Security').click();
    await expect(page.getByLabel('Current Password')).toBeVisible();
    await expect(page.getByLabel('New Password')).toBeVisible();
    await expect(page.getByLabel('Confirm Password')).toBeVisible();
  });

  test('Security tab rejects mismatched passwords', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Security').click();
    await page.getByLabel('Current Password').fill('admin123');
    await page.getByLabel('New Password').fill('newpass1');
    await page.getByLabel('Confirm Password').fill('different');
    await page.getByRole('button', { name: /change password/i }).click();
    await expect(page.getByText(/match|mismatch/i)).toBeVisible({ timeout: 5_000 });
  });

  test('Data Tools tab loads', async ({ adminPage: page }) => {
    await page.goto('/admin/settings');
    await page.getByText('Data Tools').click();
    await page.waitForTimeout(500);
    // Should show invoice data management
    await expect(page.getByText(/Invoice|Data/i)).toBeVisible();
  });
});
