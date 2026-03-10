import { test, expect } from './fixtures';

test.describe('Session Planning - Asanas', () => {
  test('asana list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/asanas');
    await expect(page.getByRole('heading', { name: /Asanas/i })).toBeVisible();
  });

  test('create new asana form loads', async ({ adminPage: page }) => {
    await page.goto('/admin/asanas/new');
    await expect(page.getByRole('heading', { name: /Add.*Asana|New.*Asana/i })).toBeVisible();
    await expect(page.getByLabel(/Name/i)).toBeVisible();
  });

  test('create asana with required fields', async ({ adminPage: page }) => {
    await page.goto('/admin/asanas/new');
    await page.getByLabel('English Name').fill('E2E Test Pose');
    await page.getByLabel('Sanskrit Name').fill('TestAsana');
    // Select type
    const typeSelect = page.getByLabel('Type');
    if (await typeSelect.isVisible().catch(() => false)) {
      await typeSelect.selectOption('asana');
    }
    // Select difficulty
    const diffSelect = page.getByLabel('Difficulty');
    if (await diffSelect.isVisible().catch(() => false)) {
      await diffSelect.selectOption('beginner');
    }
    await page.getByRole('button', { name: /save|create/i }).click();
    // Should redirect or show success
    await page.waitForTimeout(1000);
  });
});

test.describe('Session Planning - Plans', () => {
  test('session plan list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/session-plans');
    await expect(page.getByRole('heading', { name: /Session Plans/i })).toBeVisible();
  });

  test('create session plan form has 5 sections', async ({ adminPage: page }) => {
    await page.goto('/admin/session-plans/new');
    await expect(page.getByRole('heading', { name: /Create.*Plan|New.*Plan/i })).toBeVisible();
    // 5 fixed sections
    await expect(page.getByText('Warm Up')).toBeVisible();
    await expect(page.getByText('Surya Namaskara')).toBeVisible();
    await expect(page.getByText(/Asana Sequence|Main.*Sequence/i)).toBeVisible();
    await expect(page.getByText('Pranayama')).toBeVisible();
    await expect(page.getByText('Shavasana')).toBeVisible();
  });
});

test.describe('Session Planning - Allocations', () => {
  test('allocation page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/session-allocations');
    await expect(page.getByRole('heading', { name: /Allocation/i })).toBeVisible();
  });
});

test.describe('Session Planning - Executions', () => {
  test('execution list page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/session-executions');
    await expect(page.getByRole('heading', { name: /Session|Execution/i })).toBeVisible();
  });

  test('record execution page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/session-executions/record');
    await expect(page.getByRole('heading', { name: /Today|Record|Session/i })).toBeVisible();
  });
});

test.describe('Session Planning - Reports', () => {
  test('session reports page loads', async ({ adminPage: page }) => {
    await page.goto('/admin/session-reports');
    await expect(page.getByRole('heading', { name: /Session Reports|Reports/i })).toBeVisible();
  });
});
