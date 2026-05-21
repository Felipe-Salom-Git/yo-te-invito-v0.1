import { expect, type Page } from '@playwright/test';

const PAGE_LOADER: Partial<Record<string, RegExp>> = {
  'Mi espacio': /Cargando tu panel/i,
  Carrito: /Cargando carrito/i,
  Actividad: /Cargando actividad/i,
  'Mi cuenta': /Cargando cuenta/i,
};

/** Waits for a portal section title (h2) after optional page loader. */
export async function expectSection(page: Page, title: string, timeout = 45_000) {
  const loaderRx = PAGE_LOADER[title];
  if (loaderRx) {
    const loader = page.getByText(loaderRx);
    const appeared = await loader
      .waitFor({ state: 'visible', timeout: 5_000 })
      .then(() => true)
      .catch(() => false);
    if (appeared) {
      await expect(loader).toBeHidden({ timeout });
    }
  }
  await expect(page.locator('h2').filter({ hasText: title }).first()).toBeVisible({ timeout });
}

/** Waits for activity transfers tab content. */
export async function waitForPortalLoaders(page: Page, timeout = 20_000) {
  const loader = page.getByText(/Cargando transferencias/i);
  if (await loader.isVisible().catch(() => false)) {
    await expect(loader).toBeHidden({ timeout });
  }
}
