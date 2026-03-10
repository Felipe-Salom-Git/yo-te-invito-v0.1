import { test, expect } from '@playwright/test';

test.describe('Home', () => {
  test('loads and shows home content', async ({ page }) => {
    await page.goto('/home');
    await expect(page).toHaveTitle(/Yo Te Invito/);
    await expect(page.getByRole('link', { name: /eventos/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /explorar/i }).first()).toBeVisible();
  });

  test('navigates to explore', async ({ page }) => {
    await page.goto('/home');
    await page.getByRole('link', { name: /explorar/i }).first().click();
    await expect(page).toHaveURL(/\/explore/);
    await expect(page.getByRole('heading', { name: /explorar/i })).toBeVisible();
  });
});
