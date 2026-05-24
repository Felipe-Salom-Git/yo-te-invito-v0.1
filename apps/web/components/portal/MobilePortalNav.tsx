'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { useFocusTrap, useReturnFocus } from '@/hooks/useOverlayA11y';
import {
  getPortalNavDefinition,
  isPortalNavItemActive,
  type PortalNavItem,
  type PortalNavKey,
} from '@/lib/navigation/portalNavConfig';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';

const triggerClass = `inline-flex ${navTouchTarget} shrink-0 items-center justify-center gap-1.5 rounded border border-border bg-bg-muted px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-border ${navFocusRing}`;

const linkClass = `block rounded-lg px-3 py-2.5 text-base transition-colors ${navFocusRing}`;

interface MobilePortalNavProps {
  portalKey: PortalNavKey;
  /** Optional link back to public discovery (e.g. `/me`). */
  showPublicHomeLink?: boolean;
}

export function MobilePortalNav({ portalKey, showPublicHomeLink }: MobilePortalNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { title, items } = getPortalNavDefinition(portalKey);

  const activeLabel = items.find((item) => isPortalNavItemActive(pathname, item.href))?.label;

  return (
    <>
      <div className="mb-4 flex min-w-0 items-center justify-between gap-2 md:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-text-muted">
            {title}
          </p>
          {activeLabel ? (
            <p className="truncate text-sm font-semibold text-text">{activeLabel}</p>
          ) : null}
        </div>
        <button
          type="button"
          className={triggerClass}
          aria-label={open ? 'Cerrar menú del portal' : 'Abrir menú del portal'}
          aria-expanded={open}
          aria-controls="mobile-portal-nav-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cerrar' : 'Menú'}
        </button>
      </div>
      <MobilePortalNavDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title={title}
        items={items}
        showPublicHomeLink={showPublicHomeLink}
      />
    </>
  );
}

function MobilePortalNavDrawer({
  isOpen,
  onClose,
  title,
  items,
  showPublicHomeLink,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  items: PortalNavItem[];
  showPublicHomeLink?: boolean;
}) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);

  useReturnFocus(isOpen);
  useFocusTrap(panelRef, isOpen);

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

  const content = (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar menú del portal"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id="mobile-portal-nav-drawer"
        className="absolute inset-y-0 right-0 flex w-[min(100%,20rem)] flex-col border-l border-border bg-bg shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={`Menú ${title}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">{title}</p>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex ${navTouchTarget} items-center justify-center rounded border border-border bg-bg-muted text-text-muted transition-colors hover:text-text ${navFocusRing}`}
            aria-label="Cerrar menú del portal"
          >
            <CloseIcon />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" aria-label="Menú del portal">
          <ul className="space-y-1">
            {items.map((item) => {
              const active = isPortalNavItemActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${linkClass} ${
                      active
                        ? 'bg-accent font-medium text-bg focus-visible:ring-offset-bg-muted'
                        : 'text-text hover:bg-bg-muted'
                    }`}
                    aria-current={active ? 'page' : undefined}
                    onClick={onClose}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          {showPublicHomeLink ? (
            <div className="mt-6 border-t border-border pt-4">
              <Link
                href="/home"
                className={`${linkClass} text-text-muted hover:bg-bg-muted hover:text-text`}
                onClick={onClose}
              >
                ← Volver al inicio público
              </Link>
            </div>
          ) : null}
        </nav>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
