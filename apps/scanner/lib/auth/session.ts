import type { AuthLoginResponse } from '@yo-te-invito/shared';

const LS_TOKEN = 'scanner:token';
const LS_USER = 'scanner:user';

export type ScannerSessionUser = AuthLoginResponse['user'];

export type ScannerSession = {
  token: string;
  user: ScannerSessionUser;
};

export function getScannerSession(): ScannerSession | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(LS_TOKEN);
  const raw = localStorage.getItem(LS_USER);
  if (!token || !raw) return null;
  try {
    const user = JSON.parse(raw) as ScannerSessionUser;
    return { token, user };
  } catch {
    return null;
  }
}

export function setScannerSession(session: ScannerSession): void {
  localStorage.setItem(LS_TOKEN, session.token);
  localStorage.setItem(LS_USER, JSON.stringify(session.user));
}

export function clearScannerSession(): void {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_USER);
}

export function getAuthHeaders(): HeadersInit {
  const session = getScannerSession();
  if (session?.token) {
    return { Authorization: `Bearer ${session.token}` };
  }
  return {};
}
