'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useFocusTrap, useReturnFocus } from '@/hooks/useOverlayA11y';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';
import { MasterPortalNavSections } from './MasterPortalNavSections';

const triggerClass = `inline-flex ${navTouchTarget} shrink-0 items-center justify-center gap-1.5 rounded border border-border bg-bg-muted px-3 py-2 text-sm font-medium text-text transition-colors hover:bg-border ${navFocusRing}`;

interface MasterMobilePortalNavProps {
  showPublicHomeLink?: boolean;
}

export function MasterMobilePortalNav({ showPublicHomeLink }: MasterMobilePortalNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="mb-4 flex min-w-0 items-center justify-between gap-2 md:hidden">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-text-muted">
            Navegación maestra
          </p>
          <p className="truncate text-sm font-semibold text-text">Todos los portales</p>
        </div>
        <button
          type="button"
          className={triggerClass}
          aria-label={open ? 'Cerrar menú de portales' : 'Abrir menú de portales'}
          aria-expanded={open}
          aria-controls="master-mobile-portal-nav-drawer"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Cerrar' : 'Menú'}
        </button>
      </div>
      <MasterMobilePortalNavDrawer
        isOpen={open}
        onClose={() => setOpen(false)}
        showPublicHomeLink={showPublicHomeLink}
      />
    </>
  );
}

function MasterMobilePortalNavDrawer({
  isOpen,
  onClose,
  showPublicHomeLink,
}: {
  isOpen: boolean;
  onClose: () => void;
  showPublicHomeLink?: boolean;
}) {
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

  const linkClass = `block rounded-lg px-3 py-2.5 text-base text-text-muted transition-colors hover:bg-bg-muted hover:text-text ${navFocusRing}`;

  const content = (
    <div className="fixed inset-0 z-50 md:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Cerrar menú de portales"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        id="master-mobile-portal-nav-drawer"
        className="absolute inset-y-0 right-0 flex w-[min(100%,22rem)] flex-col border-l border-border bg-bg shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Menú maestro de portales"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-text">Todos los portales</p>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex ${navTouchTarget} items-center justify-center rounded border border-border bg-bg-muted text-text-muted hover:text-text ${navFocusRing}`}
            aria-label="Cerrar menú"
          >
            <CloseIcon />
          </button>
        </div>
        <nav
          className="flex-1 overflow-y-auto overscroll-contain px-3 py-4"
          aria-label="Menú maestro de portales"
        >
          <MasterPortalNavSections variant="drawer" onNavigate={onClose} />
          {showPublicHomeLink ? (
            <div className="mt-6 border-t border-border pt-4">
              <Link href="/home" className={linkClass} onClick={onClose}>
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
