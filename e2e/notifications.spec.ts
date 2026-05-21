import { test, expect } from '@playwright/test';
import { loginAsPortalUser } from './helpers/auth';
import { E2E_API_BASE_URL, e2eCredentialsHelp, hasE2eCredentials, isApiAvailable } from './helpers/env';
import { getApiToken } from './helpers/api-auth';
import { getUnreadCount, trySeedDemoNotification } from './helpers/notifications-api';
import { expectSection } from './helpers/portal';

test.describe('Notifications (/me/notifications)', () => {
  test('redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/me/notifications');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/callbackUrl=%2Fme%2Fnotifications/);
  });

  test.describe('with API', () => {
    test.describe.configure({ timeout: 90_000 });

    test.beforeEach(() => {
      test.skip(!isApiAvailable(), 'API en :3001 no disponible (pnpm dev:api + migrate)');
    });

    test('navbar shows Notificaciones link when logged in', async ({ page }) => {
      await loginAsPortalUser(page);
      await expect(
        page.getByRole('link', { name: 'Notificaciones' }).first(),
      ).toBeVisible({ timeout: 10_000 });
    });

    test('sidebar navigates to notifications page', async ({ page }) => {
      await loginAsPortalUser(page);
      await page
        .getByRole('navigation', { name: 'Menú del portal' })
        .getByRole('link', { name: 'Notificaciones' })
        .click();
      await expect(page).toHaveURL(/\/me\/notifications/);
      await expectSection(page, 'Notificaciones');
    });

    test('empty state when no notifications', async ({ page }) => {
      const token = await getApiToken();
      if (token) {
        await fetch(`${E2E_API_BASE_URL}/me/notifications/read-all`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      await loginAsPortalUser(page);
      await page.goto('/me/notifications');
      await expectSection(page, 'Notificaciones');
      await expect(page.getByText('No tenés notificaciones todavía')).toBeVisible({
        timeout: 15_000,
      });
    });

    test('shows seeded notification and mark as read', async ({ page }) => {
      const token = await getApiToken();
      test.skip(!token, 'No se pudo obtener token API — revisar E2E_USER_EMAIL / E2E_USER_PASSWORD');
      test.skip(
        !(await trySeedDemoNotification(token)),
        'Migración 20260603120000_user_notifications no aplicada (pnpm db:migrate)',
      );

      const unreadBefore = await getUnreadCount(token);
      expect(unreadBefore).toBeGreaterThan(0);

      await loginAsPortalUser(page);
      await page.goto('/me/notifications');
      await expectSection(page, 'Notificaciones');

      const item = page.getByText('E2E: Recordatorio de prueba');
      await expect(item).toBeVisible({ timeout: 15_000 });

      const markBtn = page.getByRole('button', { name: 'Leída' }).first();
      await expect(markBtn).toBeVisible();
      await markBtn.click();

      await expect(markBtn).toBeHidden({ timeout: 10_000 });
    });

    test('mark all as read', async ({ page }) => {
      const token = await getApiToken();
      test.skip(!token, 'No se pudo obtener token API');
      const seeded1 = await trySeedDemoNotification(token);
      const seeded2 = await trySeedDemoNotification(token);
      test.skip(!seeded1 || !seeded2, 'Migración user_notifications no aplicada');

      await loginAsPortalUser(page);
      await page.goto('/me/notifications');
      await expectSection(page, 'Notificaciones');

      const markAll = page.getByRole('button', { name: /marcar todas como leídas/i });
      await expect(markAll).toBeVisible({ timeout: 15_000 });
      await markAll.click();

      await expect(markAll).toBeHidden({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: 'Leída' })).toHaveCount(0);
    });

    test('navbar badge reflects unread count', async ({ page }) => {
      const token = await getApiToken();
      test.skip(!token, 'No se pudo obtener token API');
      test.skip(
        !(await trySeedDemoNotification(token)),
        'Migración user_notifications no aplicada',
      );

      await loginAsPortalUser(page);
      const navLink = page.getByRole('link', { name: 'Notificaciones' }).first();
      await expect(navLink).toBeVisible();
      await expect(navLink.locator('span')).toBeVisible({ timeout: 15_000 });

      await page.goto('/me/notifications');
      const markAll = page.getByRole('button', { name: /marcar todas como leídas/i });
      if (await markAll.isVisible().catch(() => false)) {
        await markAll.click();
        await expect(markAll).toBeHidden({ timeout: 10_000 });
      }

      await page.goto('/me');
      await expect(navLink.locator('span')).toBeHidden({ timeout: 15_000 });
    });
  });
});
