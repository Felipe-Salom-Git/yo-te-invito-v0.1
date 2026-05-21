import { expect, type Page } from '@playwright/test';
import { E2E_USER_EMAIL, E2E_USER_PASSWORD, hasE2eCredentials } from './env';

/**
 * Credentials login + enter "Mis Tickets" profile (/me).
 * Post-login flow always lands on /profiles first.
 */
export async function loginAsPortalUser(page: Page) {
  if (!hasE2eCredentials() || !E2E_USER_EMAIL || !E2E_USER_PASSWORD) {
    throw new Error('E2E_USER_EMAIL and E2E_USER_PASSWORD are required');
  }
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(E2E_USER_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_USER_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });

  const ticketsCard = page.getByRole('article').filter({ hasText: 'Mis Tickets' });
  await ticketsCard.getByRole('link', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/me/, { timeout: 10_000 });
}
