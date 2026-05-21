import { expect, type Page } from '@playwright/test';

/**
 * Opens the first explore event that exposes the purchase card (#comprar).
 * Returns false if none found (caller should test.skip).
 */
export async function openFirstEventWithTickets(page: Page): Promise<boolean> {
  await page.goto('/explore');
  await page.waitForLoadState('domcontentloaded');

  const eventLinks = page.locator('a[href*="/events/"]');
  const count = await eventLinks.count();
  if (count === 0) return false;

  for (let i = 0; i < Math.min(count, 8); i++) {
    await eventLinks.nth(i).click();
    await page.waitForURL(/\/events\//, { timeout: 10_000 });
    const purchase = page.locator('#comprar');
    if (await purchase.isVisible().catch(() => false)) {
      return true;
    }
    await page.goto('/explore');
    await page.waitForLoadState('domcontentloaded');
  }

  return false;
}

/** Sets qty on first ticket row and clicks Agregar. */
export async function addFirstTicketToCart(page: Page) {
  const qtyInput = page.locator('#comprar input[type="number"]').first();
  await expect(qtyInput).toBeVisible({ timeout: 8_000 });
  await qtyInput.fill('1');
  await page.locator('#comprar').getByRole('button', { name: 'Agregar' }).first().click();
}
