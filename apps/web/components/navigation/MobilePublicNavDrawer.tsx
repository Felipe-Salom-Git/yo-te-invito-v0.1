'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useFocusTrap, useReturnFocus } from '@/hooks/useOverlayA11y';
import { useRole } from '@/hooks/useRole';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  getMobilePublicNavDrawerItems,
  type PublicNavItem,
} from '@/lib/navigation/publicNavConfig';
import { getPortalHomeMenuLabel } from '@/lib/navigation/rolePortalHome';
import { getUserMenuLoggedInItems } from '@/lib/navigation/userNavConfig';
import { NavbarCitySelectField } from './NavbarCitySelectField';

const linkBase = `block rounded-lg px-3 py-2.5 text-base text-text transition-colors hover:bg-bg-muted ${navFocusRing}`;

interface MobilePublicNavDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobilePublicNavDrawer({ isOpen, onClose }: MobilePublicNavDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useReturnFocus(isOpen);
  useFocusTrap(panelRef, isOpen);
  const { session, status, isAuthenticated } = useRole();
  const publicItems = getMobilePublicNavDrawerItems();

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const email = session?.user?.email ?? '';
  const role = session?.user?.role;
  const accountMenuItems = getUserMenuLoggedInItems(email, role);
  const portalHomeLabel = getPortalHomeMenuLabel(email, role);

  const content = (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar menú de navegación"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-border bg-bg shadow-2xl"
        id="mobile-public-nav-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Menú de navegación"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text" id="mobile-public-nav-drawer-title">
            Menú
          </p>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex ${navTouchTarget} items-center justify-center rounded border border-border bg-bg-muted text-text-muted transition-colors hover:text-text ${navFocusRing}`}
            aria-label="Cerrar menú de navegación"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-label="Navegación pública">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Descubrir</p>
          <ul className="space-y-1">
            {publicItems.map((item) => (
              <li key={item.id}>
                <DrawerPublicLink item={item} onNavigate={onClose} />
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-border pt-4">
            <NavbarCitySelectField
              id="navbar-city-select-mobile-drawer"
              onCityApplied={onClose}
            />
          </div>

          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">Cuenta</p>
            {status === 'loading' ? (
              <p className="px-3 py-2 text-sm text-text-muted">Cargando…</p>
            ) : isAuthenticated && session?.user ? (
              <>
                {email ? (
                  <p className="mb-2 truncate px-3 text-xs text-text-muted">{email}</p>
                ) : null}
                <ul className="space-y-1">
                  {accountMenuItems.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={item.href}
                        className={`${linkBase}${item.id === 'logout' ? ' text-text-muted' : ''}`}
                        onClick={onClose}
                      >
                        {item.id === 'portal-home' ? portalHomeLabel : item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <ul className="space-y-1">
                <li>
                  <Link href="/login" className={`${linkBase} font-medium text-accent`} onClick={onClose}>
                    Iniciar sesión
                  </Link>
                </li>
                <li>
                  <Link href="/register" className={linkBase} onClick={onClose}>
                    Crear cuenta
                  </Link>
                </li>
              </ul>
            )}
          </div>
        </nav>

        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted">Tema</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function DrawerPublicLink({
  item,
  onNavigate,
}: {
  item: PublicNavItem;
  onNavigate: () => void;
}) {
  if (item.comingSoon || item.disabled) {
    return (
      <span
        className={`${linkBase} cursor-not-allowed text-text-muted opacity-70`}
        aria-disabled="true"
      >
        {item.label}
        <span className="ml-2 text-xs uppercase tracking-wide text-text-muted">Próximamente</span>
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${linkBase}${item.emphasized ? ' font-medium text-accent' : ''}`}
      aria-label={item.ariaLabel ?? item.label}
      onClick={onNavigate}
    >
      {item.label}
    </Link>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
