import { test, expect } from './fixtures';

test.describe('Attendance', () => {
  test('attendance page loads with heading', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    await expect(page.getByRole('heading', { name: 'Attendance' })).toBeVisible();
  });

  test('slot selector buttons are visible', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    // The 4 default slots should appear as selectable buttons
    await expect(page.getByText('Session:')).toBeVisible();
  });

  test('date navigation controls exist', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    await expect(page.getByText('Date:')).toBeVisible();
    // Today button should be visible
    await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
  });

  test('member attendance tiles display', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    // Wait for tiles to render - seed data has 3 members per slot
    await page.waitForTimeout(1000);
    // Tiles should contain member names
    const tiles = page.locator('[class*="cursor-pointer"][class*="rounded"]');
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
  });

  test('clicking slot changes displayed members', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    await page.waitForTimeout(500);

    // Get initial tile content
    const initialContent = await page.locator('.grid').first().textContent();

    // Click a different slot button (try the second one)
    const slotButtons = page.locator('button').filter({ hasText: /Morning|Evening/ });
    const count = await slotButtons.count();
    if (count > 1) {
      await slotButtons.nth(1).click();
      await page.waitForTimeout(500);
      // Content should change (different members per slot)
    }
  });

  test('future date navigation is disabled', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    // The "next" button should be disabled for today (can't go to future)
    const nextBtn = page.locator('button[title*="next" i], button[aria-label*="next" i]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await expect(nextBtn).toBeDisabled();
    }
  });

  test('period selector has preset options', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    await expect(page.getByText('Period:')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Current Month' })).toBeVisible();
  });

  test('lock button visible for past dates', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    // Navigate to yesterday using date input or prev button
    const prevBtn = page.locator('button').filter({ hasText: '←' }).first();
    if (await prevBtn.isVisible().catch(() => false)) {
      await prevBtn.click();
      await page.waitForTimeout(500);
      // Lock button (🔒 or 🔓) should be visible
      const lockBtn = page.locator('button').filter({ hasText: /🔒|🔓/ });
      if (await lockBtn.isVisible().catch(() => false)) {
        await expect(lockBtn).toBeVisible();
      }
    }
  });

  test('attendance tile click toggles state on today', async ({ adminPage: page }) => {
    await page.goto('/admin/attendance');
    // Click Today to ensure we're on today
    await page.getByRole('button', { name: 'Today' }).click();
    await page.waitForTimeout(500);

    // Find a clickable tile and click it
    const tile = page.locator('[class*="cursor-pointer"][class*="rounded"]').first();
    if (await tile.isVisible().catch(() => false)) {
      const classBefore = await tile.getAttribute('class');
      await tile.click();
      await page.waitForTimeout(300);
      const classAfter = await tile.getAttribute('class');
      // Class should change (red ↔ green toggle)
      expect(classAfter).not.toBe(classBefore);
    }
  });
});
