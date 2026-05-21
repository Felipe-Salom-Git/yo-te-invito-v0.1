import { test, expect } from '@playwright/test';
import { loginAsPortalUser } from './helpers/auth';
import { e2eCredentialsHelp, hasE2eCredentials, isApiAvailable } from './helpers/env';

test.describe('Checkout', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    test.skip(!isApiAvailable(), 'API en :3001 no disponible (pnpm dev:api)');
    test.skip(!hasE2eCredentials(), e2eCredentialsHelp());
  });

  test.beforeEach(async ({ page }) => {
    await loginAsPortalUser(page);
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
    await expect(page.locator('h1, h2').filter({ hasText: /checkout|entradas|seleccionar/i })).toBeVisible({
      timeout: 5000,
    });
  });
});
