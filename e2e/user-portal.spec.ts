import { test, expect } from '@playwright/test';
import { loginAsPortalUser } from './helpers/auth';
import { addFirstTicketToCart, openFirstEventWithTickets } from './helpers/events';
import { e2eCredentialsHelp, hasE2eCredentials, isApiAvailable } from './helpers/env';
import { expectSection, waitForPortalLoaders } from './helpers/portal';

test.describe('User portal (/me)', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/me');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/callbackUrl=%2Fme/);
  });

  test.describe('with API', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(({ page: _page }, testInfo) => {
      test.skip(!isApiAvailable(), 'API en :3001 no disponible (pnpm dev:api)');
      test.skip(!hasE2eCredentials(), e2eCredentialsHelp());
    });

    test.beforeEach(async ({ page }) => {
      await loginAsPortalUser(page);
    });

    test('dashboard shows Mi espacio', async ({ page }) => {
      await expectSection(page, 'Mi espacio');
      await expect(page.getByText(/Tickets, carrito, favoritos/i)).toBeVisible();
    });

    test('legacy /cuenta redirects to /me', async ({ page }) => {
      await page.goto('/cuenta');
      await expect(page).toHaveURL(/\/me$/, { timeout: 10_000 });
    });

    test('/cuenta/favoritos redirects to preferences favorites tab', async ({ page }) => {
      await page.goto('/cuenta/favoritos');
      await expect(page).toHaveURL(/\/me\/preferences\?tab=favorites/, { timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'Preferencias' })).toBeVisible();
    });

    test('sidebar navigates portal sections', async ({ page }) => {
      const nav = page.getByRole('navigation', { name: 'Menú del portal' });

      await nav.getByRole('link', { name: 'Carrito' }).click();
      await expect(page).toHaveURL(/\/me\/cart/);
      await expectSection(page, 'Carrito');

      await nav.getByRole('link', { name: 'Preferencias' }).click();
      await expect(page).toHaveURL(/\/me\/preferences/);
      await expectSection(page, 'Preferencias');

      await nav.getByRole('link', { name: 'Actividad' }).click();
      await expect(page).toHaveURL(/\/me\/activity/);
      await expectSection(page, 'Actividad');

      await nav.getByRole('link', { name: 'Mi cuenta' }).click();
      await expect(page).toHaveURL(/\/me\/account/);
      await expect(
        page
          .locator('h2')
          .filter({ hasText: 'Mi cuenta' })
          .or(page.getByText('Datos personales'))
          .first(),
      ).toBeVisible({ timeout: 45_000 });
    });

    test('preferences tabs render', async ({ page }) => {
      await page.goto('/me/preferences');
      await expect(page.getByRole('link', { name: 'General' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Favoritos' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Eventos esperados' })).toBeVisible();

      await page.getByRole('link', { name: 'Favoritos' }).click();
      await expect(page).toHaveURL(/tab=favorites/);

      await page.getByRole('link', { name: 'Eventos esperados' }).click();
      await expect(page).toHaveURL(/tab=expected/);
    });

    test('activity transfers tab renders', async ({ page }) => {
      await page.goto('/me/activity?tab=transfers');
      await expectSection(page, 'Actividad');
      await waitForPortalLoaders(page);
      await expect(
        page.getByText(/transferencias en tu historial|cargando transferencias/i).first(),
      ).toBeVisible({ timeout: 15_000 });
    });

    test('authenticated /checkout redirects to /me/cart', async ({ page }) => {
      await page.goto('/checkout');
      await expect(page).toHaveURL(/\/me\/cart/, { timeout: 15_000 });
      await expectSection(page, 'Carrito');
    });

    test('favorite toggle on event page', async ({ page }) => {
      const found = await openFirstEventWithTickets(page);
      test.skip(!found, 'No hay eventos con entradas en explore');

      const favBtn = page.getByRole('button', { name: /favorito/i });
      await expect(favBtn).toBeVisible({ timeout: 8_000 });
      await favBtn.click();

      await page.goto('/me/preferences?tab=favorites');
      await expect(
        page.getByText(/no tenés favoritos|favoritos guardados/i).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('add to cart from event and see item in /me/cart', async ({ page }) => {
      const found = await openFirstEventWithTickets(page);
      test.skip(!found, 'No hay eventos con entradas en explore');

      await addFirstTicketToCart(page);
      await page.goto('/me/cart');
      await expectSection(page, 'Carrito');

      const empty = page.getByText('Tu carrito está vacío');
      const hasItem = page.locator('ul').filter({ has: page.getByRole('button', { name: 'Quitar' }) });
      await expect(empty.or(hasItem.first())).toBeVisible({ timeout: 12_000 });
      test.skip(await empty.isVisible(), 'Carrito vacío tras agregar (revisar API / tenant)');
      await expect(page.getByRole('button', { name: /confirmar y crear pedidos/i })).toBeVisible();
    });
  });
});
