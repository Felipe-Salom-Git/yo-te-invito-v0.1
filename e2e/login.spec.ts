import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('shows login form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /iniciar sesión/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test('login with demo user redirects to dashboard', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('user@demo.local');
    await page.getByLabel(/password/i).fill('demo');
    await page.getByRole('button', { name: /sign in|iniciar/i }).click();
    await expect(page).toHaveURL(/\/(home|cuenta|admin|producer|gastro|referrer)/);
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrong');
    await page.getByRole('button', { name: /sign in|iniciar/i }).click();
    await expect(page.getByText(/incorrecto|invalid|incorrect/i)).toBeVisible({ timeout: 5000 });
  });
});
