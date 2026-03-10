/**
 * Member Portal Tests — Run on BOTH RFS and Production.
 * Seeds a temporary password for an existing member, then tests the portal.
 */

import { test, expect } from '@playwright/test';
import { prepareSeededMember, type SeededMember } from '../support/envApi';

let member: SeededMember;

test.beforeAll(async ({ request }) => {
  member = await prepareSeededMember(request);
});

test.describe('Member Portal', () => {
  test('member login succeeds', async ({ page }) => {
    await page.goto('/member/login');
    await page.getByLabel('Phone Number').first().fill(member.phone);
    await page.getByLabel('Password').fill(member.password);
    await page.locator('form').getByRole('button', { name: 'Login' }).click();

    await page.waitForURL(/\/member$/);
    await expect(page.getByText(`Hi, ${member.firstName}!`)).toBeVisible();
    await expect(page.getByText('Welcome to your yoga portal')).toBeVisible();
  });

  test('member can view attendance page', async ({ page }) => {
    await page.goto('/member/login');
    await page.getByLabel('Phone Number').first().fill(member.phone);
    await page.getByLabel('Password').fill(member.password);
    await page.locator('form').getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/member$/);

    await page.goto('/member/attendance');
    await page.waitForLoadState('domcontentloaded');
    const hasError = await page.getByText('Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('member can view membership page', async ({ page }) => {
    await page.goto('/member/login');
    await page.getByLabel('Phone Number').first().fill(member.phone);
    await page.getByLabel('Password').fill(member.password);
    await page.locator('form').getByRole('button', { name: 'Login' }).click();
    await page.waitForURL(/\/member$/);

    await page.goto('/member/membership');
    await page.waitForLoadState('domcontentloaded');
    const hasError = await page.getByText('Something went wrong').isVisible().catch(() => false);
    expect(hasError).toBe(false);
  });

  test('member wrong password shows error', async ({ page }) => {
    await page.goto('/member/login');
    await page.getByLabel('Phone Number').first().fill(member.phone);
    await page.getByLabel('Password').fill('WrongPassword123');
    await page.locator('form').getByRole('button', { name: 'Login' }).click();
    await expect(page.getByText(/invalid|incorrect|wrong/i)).toBeVisible();
  });
});
