import { expect, test } from '@playwright/test';

import {
  cleanupLeadByPhone,
  getAdminPassword,
  makeUniqueLeadData,
  prepareSeededMember,
  type SeededMember,
} from './support/rfsApi';

let adminPassword = '';
let seededMember: SeededMember;

test.describe('RFS live smoke suite', () => {
  test.beforeAll(async ({ request }) => {
    adminPassword = await getAdminPassword(request);
    seededMember = await prepareSeededMember(request);
  });

  test('guest home page renders primary CTAs', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { name: /welcome to/i })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Book Free Trial' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register Interest' })).toBeVisible();
  });

  test('logged-out admin route redirects to login', async ({ page }) => {
    await page.goto('/admin/dashboard');

    await page.waitForURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();
  });

  test('register form shows validation errors and allows successful submission', async ({ page, request }) => {
    const lead = makeUniqueLeadData();

    await page.goto('/register');
    await page.getByRole('button', { name: 'Submit Registration' }).click();

    await expect(page).toHaveURL(/\/register$/);
    await expect(page.locator('input:invalid')).toHaveCount(5);
    await expect(page.locator('select:invalid')).toHaveCount(2);

    await page.getByLabel('First Name').fill(lead.firstName);
    await page.getByLabel('Last Name').fill(lead.lastName);
    await page.getByLabel('Email').fill(lead.email);
    await page.getByLabel('Phone').fill(lead.phone);
    await page.getByLabel('Age').fill(lead.age);
    await page.getByRole('combobox').nth(0).selectOption('female');
    await page.getByRole('combobox').nth(1).selectOption({ index: 1 });
    await page.locator('#termsCheckbox').check();
    await page.locator('#disclaimerCheckbox').check();

    await page.getByRole('button', { name: 'Submit Registration' }).click();

    await expect(page.getByRole('heading', { name: 'Registration Successful!' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Book a Trial Session' })).toBeVisible();

    await page.getByRole('button', { name: 'Book a Trial Session' }).click();
    await page.waitForURL(/\/book-trial$/);
    await expect(page.getByRole('heading', { name: 'Book Your Free Trial Session' })).toBeVisible();

    await cleanupLeadByPhone(request, lead.phone);
  });

  test('book trial page loads slot availability UI', async ({ page }) => {
    await page.goto('/book-trial');

    await expect(page.getByRole('heading', { name: 'Book Your Free Trial Session' })).toBeVisible();
    await expect(page.getByText('Select Batch & Date')).toBeVisible();
    await expect(page.getByText('Sessions run Monday to Friday. Booking available from next working day onwards.')).toBeVisible();
    await expect(page.getByRole('button', { name: /Morning 7:30 AM/i }).first()).toBeVisible();
  });

  test('admin login reaches dashboard and shows RFS badge', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await page.waitForURL(/\/admin(\/dashboard)?$/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByText('RFS')).toBeVisible();
    await expect(page.getByText('Active Members')).toBeVisible();
  });

  test('member login reaches member portal with seeded credentials', async ({ page }) => {
    await page.goto('/member/login');

    await page.getByLabel('Phone Number').first().fill(seededMember.phone);
    await page.getByLabel('Password').fill(seededMember.password);
    await page.locator('form').getByRole('button', { name: 'Login' }).click();

    await page.waitForURL(/\/member$/);
    await expect(page.getByText(`Hi, ${seededMember.firstName}!`)).toBeVisible();
    await expect(page.getByText('Welcome to your yoga portal')).toBeVisible();
  });
});
