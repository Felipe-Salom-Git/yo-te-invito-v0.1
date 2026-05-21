import { test, expect } from '@playwright/test';
import {
  E2E_USER_EMAIL,
  E2E_USER_PASSWORD,
  e2eCredentialsHelp,
  hasE2eCredentials,
  isApiAvailable,
} from './helpers/env';

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('login with credentials redirects after sign-in', async ({ page }, testInfo) => {
    test.skip(!isApiAvailable(), 'API en :3001 no disponible (pnpm dev:api)');
    test.skip(!hasE2eCredentials(), e2eCredentialsHelp());
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(E2E_USER_EMAIL);
    await page.getByLabel(/password/i).fill(E2E_USER_PASSWORD);
    await page.getByRole('button', { name: /sign in|iniciar/i }).click();
    await expect(page).toHaveURL(/\/(profiles|home|me|cuenta|admin|producer|gastro|referrer)/);
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in|iniciar/i }).click();
    await expect(page.getByText(/incorrecto|invalid|incorrect/i)).toBeVisible({ timeout: 5000 });
  });
});
