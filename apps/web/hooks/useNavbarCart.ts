'use client';

import { useEffect, useState } from 'react';
import { useRole } from '@/hooks/useRole';
import { useCart } from '@/context/CartContext';
import { useMeCart } from '@/lib/query/me-portal';

export const NAVBAR_CART_HREF_GUEST = '/checkout';
export const NAVBAR_CART_HREF_AUTHENTICATED = '/me/cart';

export interface NavbarCartState {
  href: string;
  /** Resolved item count (0 when not ready). */
  count: number;
  /** Safe to show badge (avoids hydration flash and false loading counts). */
  showBadge: boolean;
  badgeText: string;
  ariaLabel: string;
  sessionPending: boolean;
  countPending: boolean;
}

function formatBadgeCount(count: number): string {
  if (count > 99) return '99+';
  return String(count);
}

function buildAriaLabel(count: number, ready: boolean): string {
  if (!ready) return 'Abrir carro';
  if (count <= 0) return 'Abrir carro';
  return count === 1 ? 'Abrir carro con 1 ítem' : `Abrir carro con ${count} ítems`;
}

/**
 * Navbar cart count — guest: CartContext (after client hydrate); auth: useMeCart API.
 * Does not fetch directly; does not add storage.
 */
export function useNavbarCart(): NavbarCartState {
  const { status, isAuthenticated } = useRole();
  const { totalItems: guestTotal } = useCart();
  const [hydrated, setHydrated] = useState(false);

  const sessionPending = status === 'loading';
  const authResolved = status === 'authenticated' && isAuthenticated;

  const cartQuery = useMeCart(authResolved);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const href = authResolved ? NAVBAR_CART_HREF_AUTHENTICATED : NAVBAR_CART_HREF_GUEST;

  let count = 0;
  let countPending = sessionPending;

  if (!sessionPending) {
    if (authResolved) {
      if (cartQuery.isPending) {
        countPending = true;
        count = 0;
      } else if (cartQuery.isError) {
        countPending = false;
        count = 0;
      } else {
        countPending = false;
        count = Math.max(0, cartQuery.data?.itemCount ?? 0);
      }
    } else if (!hydrated) {
      countPending = true;
      count = 0;
    } else {
      countPending = false;
      count = Math.max(0, guestTotal);
    }
  }

  const showBadge = !countPending && count > 0;
  const badgeText = formatBadgeCount(count);
  const ariaLabel = buildAriaLabel(count, !countPending);

  return {
    href,
    count,
    showBadge,
    badgeText,
    ariaLabel,
    sessionPending,
    countPending,
  };
}
