import { expect, type Page } from '@playwright/test';
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  hasE2eAdminCredentials,
} from './env';

/** Login and open admin area (user must have Role.ADMIN). */
export async function loginAsAdminUser(page: Page) {
  if (!hasE2eAdminCredentials() || !E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD) {
    throw new Error('E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD are required');
  }

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(E2E_ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_ADMIN_PASSWORD);
  await page.getByRole('button', { name: /iniciar sesión/i }).click();

  await expect(page).toHaveURL(/\/profiles/, { timeout: 15_000 });
  await page.goto('/admin/categorias');
  await expect(page).toHaveURL(/\/admin\/categorias/, { timeout: 15_000 });
}
