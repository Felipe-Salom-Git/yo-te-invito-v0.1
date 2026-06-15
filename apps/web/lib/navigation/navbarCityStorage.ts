export const NAVBAR_CITY_STORAGE_KEY = 'yti:navbarCity';

export function readStoredNavbarCity(): string {
  if (typeof window === 'undefined') return '';
  try {
    return localStorage.getItem(NAVBAR_CITY_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

export function writeStoredNavbarCity(city: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = city.trim();
    if (trimmed) localStorage.setItem(NAVBAR_CITY_STORAGE_KEY, trimmed);
    else localStorage.removeItem(NAVBAR_CITY_STORAGE_KEY);
  } catch {
    /* ignore quota / private mode */
  }
}
