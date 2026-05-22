import { expect, type Page } from '@playwright/test';
import { E2E_HOTEL_EMAIL, E2E_HOTEL_PASSWORD, hasE2eHotelCredentials } from './env';

/**
 * Login as hotel owner and enter portal `/hotel` via profile selector.
 */
export async function loginAsHotelUser(page: Page) {
  if (!hasE2eHotelCredentials() || !E2E_HOTEL_EMAIL || !E2E_HOTEL_PASSWORD) {
    throw new Error('E2E_HOTEL_EMAIL and E2E_HOTEL_PASSWORD are required');
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(E2E_HOTEL_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_HOTEL_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });

  const hotelCard = page.getByRole('article').filter({ hasText: /Hotel/i });
  const enter = hotelCard.getByRole('link', { name: /Entrar/i });
  await expect(enter).toBeVisible({ timeout: 10_000 });
  await enter.click();
  await expect(page).toHaveURL(/\/hotel/, { timeout: 15_000 });
}
