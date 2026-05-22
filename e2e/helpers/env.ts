export const E2E_API_BASE_URL = process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:3001';

export const E2E_TENANT_ID = process.env.E2E_TENANT_ID ?? 'tenant-demo';

/** Required for login/API tests — no @demo.local defaults. */
export const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL?.trim().toLowerCase();
export const E2E_USER_PASSWORD = process.env.E2E_USER_PASSWORD;

/** Hotel owner with ACTIVE `HotelProfile` + membership (portal `/hotel`). */
export const E2E_HOTEL_EMAIL = process.env.E2E_HOTEL_EMAIL?.trim().toLowerCase();
export const E2E_HOTEL_PASSWORD = process.env.E2E_HOTEL_PASSWORD;

/** Admin for `/admin/categorias` tab Hoteles (falls back to E2E_USER_*). */
export const E2E_ADMIN_EMAIL = (
  process.env.E2E_ADMIN_EMAIL ?? process.env.E2E_USER_EMAIL
)?.trim().toLowerCase();
export const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? process.env.E2E_USER_PASSWORD;

export function hasE2eCredentials(): boolean {
  return Boolean(E2E_USER_EMAIL && E2E_USER_PASSWORD);
}

export function hasE2eHotelCredentials(): boolean {
  return Boolean(E2E_HOTEL_EMAIL && E2E_HOTEL_PASSWORD);
}

export function hasE2eAdminCredentials(): boolean {
  return Boolean(E2E_ADMIN_EMAIL && E2E_ADMIN_PASSWORD);
}

export function e2eCredentialsHelp(): string {
  return 'Set E2E_USER_EMAIL and E2E_USER_PASSWORD (e.g. felipe.e.salom@gmail.com)';
}

export function e2eHotelCredentialsHelp(): string {
  return 'Set E2E_HOTEL_EMAIL and E2E_HOTEL_PASSWORD (user with ACTIVE hotel profile and location on file)';
}

export function e2eAdminCredentialsHelp(): string {
  return 'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD (or use E2E_USER_* with Role.ADMIN)';
}

export function isApiAvailable(): boolean {
  return process.env.E2E_API_AVAILABLE === '1';
}
