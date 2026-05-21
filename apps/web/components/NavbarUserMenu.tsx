'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { useCart } from '@/context/CartContext';
import { useMeCart, useMeNotificationsUnread } from '@/lib/query/me-portal';

export function NavbarUserMenu() {
  const { session, status, isAuthenticated } = useRole();
  const { totalItems: localCartItems } = useCart();
  const { data: apiCart } = useMeCart(isAuthenticated);
  const { data: unreadData } = useMeNotificationsUnread(isAuthenticated);
  const unreadNotifications = unreadData?.unreadCount ?? 0;
  const totalItems = isAuthenticated
    ? (apiCart?.itemCount ?? 0)
    : localCartItems;
  const cartHref = isAuthenticated ? '/me/cart' : '/checkout';
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (status === 'loading') {
    return <span className="text-sm text-text-muted">…</span>;
  }

  const email = session?.user?.email ?? 'User';

  return (
    <div className="flex items-center gap-3">
      {isAuthenticated && (
        <Link
          href="/me/notifications"
          className="relative rounded border border-border bg-bg-muted px-3 py-1.5 text-sm text-text hover:bg-border transition-colors"
          aria-label="Notificaciones"
        >
          Notificaciones
          {unreadNotifications > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs text-bg">
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>
      )}
      <Link
        href={cartHref}
        className="relative rounded border border-border bg-bg-muted px-3 py-1.5 text-sm text-text hover:bg-border transition-colors"
      >
        Mi Carro
        {totalItems > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-xs text-bg">
            {totalItems}
          </span>
        )}
      </Link>
      {!isAuthenticated || !session?.user ? (
        <div className="flex items-center gap-2">
          <Link
            href="/register"
            className="rounded border border-border px-3 py-1.5 text-sm text-text-muted hover:text-text hover:border-border/80 transition-colors"
          >
            Registrarse
          </Link>
          <Link
            href="/login"
            className="rounded border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            Iniciar sesión
          </Link>
        </div>
      ) : (
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded border border-border bg-bg-muted px-3 py-1.5 text-sm text-text hover:bg-border transition-colors"
            aria-expanded={open}
            aria-haspopup="true"
          >
            <span className="max-w-[120px] truncate text-text-muted">{email}</span>
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded border border-border bg-bg py-1 shadow-lg">
              <div className="border-b border-border px-3 py-2 text-xs text-text-muted">
                {email}
              </div>
              <Link
                href="/profiles"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Cambiar perfil
              </Link>
              <Link
                href="/me"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Inicio
              </Link>
              <Link
                href="/me/cart"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Mi Carro
              </Link>
              <Link
                href="/me/tickets"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Mis tickets
              </Link>
              <Link
                href="/me/orders"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Mis pedidos
              </Link>
              <Link
                href="/logout"
                className="block px-3 py-2 text-sm text-text hover:bg-bg-muted"
                onClick={() => setOpen(false)}
              >
                Sign out
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
