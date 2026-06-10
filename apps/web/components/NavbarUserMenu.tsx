'use client';

import { useState, useRef, useEffect, useId } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useRole } from '@/hooks/useRole';
import { useIsMasterUser } from '@/hooks/useIsMasterUser';
import { shouldUseStandardUserPortal } from '@/lib/navigation/rolePortalHome';
import { useFocusTrap } from '@/hooks/useOverlayA11y';
import { useMeNotificationsUnread } from '@/lib/query/me-portal';
import { getUserMenuLoggedInItems } from '@/lib/navigation/userNavConfig';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';

const menuLinkClass = `block px-3 py-2.5 text-sm text-text transition-colors hover:bg-bg-muted ${navFocusRing}`;

const actionBtn = `inline-flex shrink-0 items-center justify-center rounded border border-border bg-bg-muted text-sm text-text transition-colors hover:bg-border ${navFocusRing}`;

export function NavbarUserMenu() {
  const { session, status, isAuthenticated, role } = useRole();
  const isMaster = useIsMasterUser();
  const showBuyerNav = shouldUseStandardUserPortal(session?.user?.email, role);
  const { data: unreadData } = useMeNotificationsUnread(isAuthenticated && showBuyerNav);
  const unreadNotifications = unreadData?.unreadCount ?? 0;
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number; width: number } | null>(
    null,
  );

  useFocusTrap(menuRef, open);

  useEffect(() => {
    if (!open) {
      setMenuPosition(null);
      return;
    }

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const panelWidth = 256;
      const left = Math.min(
        Math.max(8, rect.right - panelWidth),
        window.innerWidth - panelWidth - 8,
      );
      setMenuPosition({
        top: rect.bottom + 8,
        left,
        width: panelWidth,
      });
    }

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open]);

  if (status === 'loading') {
    return (
      <span
        className="hidden min-h-9 min-w-9 items-center justify-center text-sm text-text-muted md:inline-flex"
        aria-live="polite"
        aria-busy="true"
      >
        Cargando cuenta…
      </span>
    );
  }

  const email = session?.user?.email ?? '';
  const menuItems = getUserMenuLoggedInItems(email, role);

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {isAuthenticated && showBuyerNav && (
        <Link
          href="/me/notifications"
          className={`${actionBtn} relative hidden p-2 lg:inline-flex lg:px-3 lg:py-1.5`}
          aria-label={
            unreadNotifications > 0
              ? `Notificaciones, ${unreadNotifications} sin leer`
              : 'Notificaciones'
          }
        >
          <BellIcon />
          <span className="hidden lg:inline">Notificaciones</span>
          {unreadNotifications > 0 && (
            <span
              className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-xs text-bg ring-1 ring-bg"
              aria-hidden
            >
              {unreadNotifications > 9 ? '9+' : unreadNotifications}
            </span>
          )}
        </Link>
      )}
      {!isAuthenticated || !session?.user ? (
        <div className="flex shrink-0 items-center gap-1.5">
          <Link
            href="/register"
            className={`${actionBtn} hidden px-3 py-1.5 text-text-muted hover:text-text sm:inline-flex`}
          >
            Crear cuenta
          </Link>
          <Link
            href="/login"
            className={`inline-flex ${navTouchTarget} shrink-0 items-center rounded border border-accent px-2.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/10 sm:px-3`}
            aria-label="Iniciar sesión"
          >
            <span className="sm:hidden">Entrar</span>
            <span className="hidden sm:inline">Iniciar sesión</span>
          </Link>
        </div>
      ) : (
        <div className="relative" ref={triggerRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className={`${actionBtn} ${navTouchTarget} max-w-[7.5rem] gap-2 px-2.5 py-2 sm:max-w-[10rem] sm:px-3`}
            aria-expanded={open}
            aria-haspopup="menu"
            aria-controls={menuId}
            aria-label={
              email ? `Abrir menú de usuario, sesión de ${email}` : 'Abrir menú de usuario'
            }
          >
            <UserIcon />
            <span className="hidden truncate text-text-muted sm:inline" aria-hidden>
              {email}
            </span>
          </button>
          {open && menuPosition && typeof document !== 'undefined'
            ? createPortal(
                <div
                  ref={menuRef}
                  id={menuId}
                  className="fixed z-[60] max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-bg py-1 shadow-2xl"
                  style={{
                    top: menuPosition.top,
                    left: menuPosition.left,
                    width: menuPosition.width,
                  }}
                  role="menu"
                  aria-label="Menú de cuenta"
                >
                  <div
                    className="border-b border-border px-3 py-2 text-xs text-text-muted"
                    role="presentation"
                  >
                    {email}
                  </div>
                  {menuItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      role="menuitem"
                      className={`${menuLinkClass}${item.id === 'logout' ? ' mt-1 border-t border-border' : ''}`}
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>,
                document.body,
              )
            : null}
        </div>
      )}
    </div>
  );
}

function BellIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
      />
    </svg>
  );
}
