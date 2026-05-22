import { test, expect } from '@playwright/test';
import { loginAsHotelUser } from './helpers/hotel-auth';
import { loginAsAdminUser } from './helpers/admin-auth';
import { fetchHotelMe, fetchPublicHotelByEvent } from './helpers/hotel-api';
import {
  E2E_HOTEL_EMAIL,
  E2E_HOTEL_PASSWORD,
  E2E_TENANT_ID,
  e2eAdminCredentialsHelp,
  e2eHotelCredentialsHelp,
  hasE2eAdminCredentials,
  hasE2eHotelCredentials,
  isApiAvailable,
} from './helpers/env';

test.describe('Hoteles — reglas públicas (sin auth)', () => {
  test('gateway /categorias no incluye tile Hoteles', async ({ page }) => {
    await page.goto('/categorias');
    await expect(page.getByRole('list', { name: /Categorías de experiencias/i })).toBeVisible();

    await expect(page.getByRole('button', { name: /EVENTOS:/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /GASTRONOMÍA:/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /EQUIPOS Y RENTALS:/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /EXCURSIONES:/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /HOTELES:/i })).toHaveCount(0);
  });

  test('/hoteles muestra estado Próximamente', async ({ page }) => {
    await page.goto('/hoteles');
    await expect(page.getByRole('heading', { name: /Hoteles — Próximamente/i })).toBeVisible();
  });
});

test.describe('Hoteles — portal y ficha (credenciales hotel)', () => {
  test.describe.configure({ timeout: 120_000 });

  test.beforeEach(() => {
    test.skip(!isApiAvailable(), 'API en :3001 no disponible (pnpm dev:api + migrate)');
    test.skip(!hasE2eHotelCredentials(), e2eHotelCredentialsHelp());
  });

  test('accede a /hotel desde perfiles', async ({ page }) => {
    await loginAsHotelUser(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText(/Completitud de la ficha/i)).toBeVisible();
    await expect(page.getByRole('link', { name: /Editar ficha/i })).toBeVisible();
  });

  test('edita y guarda ficha básica', async ({ page }) => {
    await loginAsHotelUser(page);
    await page.getByRole('link', { name: /Editar ficha/i }).click();
    await expect(page).toHaveURL(/\/hotel\/editar/);

    const nameInput = page.getByLabel(/Nombre comercial/i);
    const current = await nameInput.inputValue();
    const stamp = `E2E ${Date.now()}`;
    await nameInput.fill(`${current.replace(/^E2E \d+$/, '').trim() || 'Hotel'} ${stamp}`.trim());

    await page.getByRole('button', { name: /Guardar ficha/i }).click();
    await expect(page).toHaveURL(/\/hotel$/, { timeout: 20_000 });
  });

  test('ficha pública /hoteles/[id] carga sin CTAs de reserva', async ({ page }) => {
    const me = await fetchHotelMe(E2E_HOTEL_EMAIL!, E2E_HOTEL_PASSWORD!);
    const eventId = me?.profile?.publicEventId;
    test.skip(!eventId, 'Perfil hotel sin publicEventId — guardá la ficha en /hotel/editar primero');

    const publicApi = await fetchPublicHotelByEvent(eventId!, E2E_TENANT_ID);
    test.skip(!publicApi, 'GET /public/hotel-locations/by-event no disponible');

    await page.goto(`/hoteles/${eventId}?tenantId=${E2E_TENANT_ID}`);
    await expect(page.getByText(/Ficha informativa/i)).toBeVisible({ timeout: 15_000 });
    await expect(publicApi!.displayName.length).toBeGreaterThan(0);
    await expect(page.getByRole('heading', { name: /Reservas en la plataforma/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Reservar ahora/i })).toHaveCount(0);
    await expect(page.getByRole('button', { name: /Comprar/i })).toHaveCount(0);
  });

  test('valoraciones hotel en /hotel/valoraciones', async ({ page }) => {
    await loginAsHotelUser(page);
    await page.getByRole('navigation', { name: 'Menú del portal' })
      .getByRole('link', { name: 'Valoraciones' })
      .click();
    await expect(page).toHaveURL(/\/hotel\/valoraciones/);
    await expect(page.getByRole('heading', { name: /Valoraciones de huéspedes/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe('Hoteles — admin subcategorías', () => {
  test.beforeEach(() => {
    test.skip(!isApiAvailable(), 'API en :3001 no disponible');
    test.skip(!hasE2eAdminCredentials(), e2eAdminCredentialsHelp());
  });

  test('tab Hoteles en /admin/categorias muestra Próximamente', async ({ page }) => {
    await loginAsAdminUser(page);
    await page.goto('/admin/categorias');
    await expect(page.getByRole('heading', { name: /Subcategorías/i })).toBeVisible();

    await page.getByRole('tab', { name: /Hoteles/i }).click();
    await expect(page.getByText(/Hoteles — Próximamente/i)).toBeVisible();
    await expect(
      page.getByText(/No es posible crear ni editar subcategorías de hotel/i),
    ).toBeVisible();
  });
});
