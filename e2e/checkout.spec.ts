import { test, expect } from '@playwright/test';

test.describe('Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dev/seed');
    await page.getByRole('button', { name: 'Seed' }).click().catch(() => {});
    await page.waitForTimeout(500);
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user@demo.local');
    await page.getByLabel(/password/i).fill('demo');
    await page.getByRole('button', { name: /sign in|iniciar/i }).click();
    await expect(page).toHaveURL(/\/(home|cuenta|admin|producer|gastro|referrer)/);
  });

  test('checkout page loads when event has tickets', async ({ page }) => {
    await page.goto('/explore');
    await page.waitForLoadState('networkidle');
    const eventCards = page.locator('a[href*="/events/"]');
    const count = await eventCards.count();
    if (count === 0) test.skip();
    await eventCards.first().click();
    await page.waitForURL(/\/events\//);
    const buyLink = page.getByRole('link', { name: /comprar|entradas|reservar/i });
    if ((await buyLink.count()) === 0) test.skip();
    await buyLink.first().click();
    await page.waitForURL(/\/checkout\//);
    await expect(page.locator('h1, h2').filter({ hasText: /checkout|entradas|seleccionar/i })).toBeVisible({ timeout: 5000 });
  });
});
