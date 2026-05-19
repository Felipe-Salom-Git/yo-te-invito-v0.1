/**
 * Role-based dashboard URLs.
 * Used for post-login redirect and "Cuenta" / account link in navbar.
 */
import type { Role } from '@yo-te-invito/shared';

export function getDashboardForRole(role: string | undefined): string {
  if (!role) return '/home';
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'PRODUCER_OWNER':
    case 'PRODUCER_STAFF':
      return '/producer';
    case 'GASTRO_OWNER':
      return '/gastro';
    case 'HOTEL_OWNER':
      return '/hotel';
    case 'REFERRER':
      return '/referrer';
    case 'SCANNER':
      return '/dev/scanner-sim';
    default:
      return '/cuenta';
  }
}
