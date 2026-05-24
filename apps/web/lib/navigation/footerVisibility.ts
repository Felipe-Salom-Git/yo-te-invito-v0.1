/**
 * Footer variant by route — Slice 2 (public footer block).
 * Used by RouteAwareFooter in root layout (client pathname).
 */

export type FooterVariant = 'full' | 'minimal' | 'hidden';

const PORTAL_PREFIXES = [
  '/me',
  '/producer',
  '/admin',
  '/gastro',
  '/hotel',
  '/referrer',
  '/cuenta',
] as const;

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname || pathname === '') return '/';
  const base = pathname.split('?')[0]?.split('#')[0] ?? '/';
  if (base.length > 1 && base.endsWith('/')) return base.slice(0, -1);
  return base;
}

function matchesPrefix(path: string, prefix: string): boolean {
  return path === prefix || path.startsWith(`${prefix}/`);
}

function isPortalRoute(path: string): boolean {
  return PORTAL_PREFIXES.some((prefix) => matchesPrefix(path, prefix));
}

function isLegalRoute(path: string): boolean {
  return path === '/legal' || path.startsWith('/legal/');
}

function isCheckoutRoute(path: string): boolean {
  return path === '/checkout' || path.startsWith('/checkout/');
}

function isAuthRoute(path: string): boolean {
  return (
    path === '/login' ||
    path === '/logout' ||
    path === '/register' ||
    path.startsWith('/register/')
  );
}

/** Gateway editorial screen — uses CategoryGatewayFooter instead of global footer. */
function isCategoryGatewayRoute(path: string): boolean {
  return path === '/categorias';
}

/**
 * Resolves which footer chrome to render for the current pathname.
 */
export function getFooterVariant(pathname: string | null | undefined): FooterVariant {
  const path = normalizePathname(pathname);

  if (isPortalRoute(path)) return 'hidden';
  if (isCategoryGatewayRoute(path)) return 'hidden';
  if (isAuthRoute(path)) return 'hidden';
  if (path.startsWith('/r/')) return 'hidden';

  if (isLegalRoute(path)) return 'minimal';
  if (isCheckoutRoute(path)) return 'minimal';

  return 'full';
}
