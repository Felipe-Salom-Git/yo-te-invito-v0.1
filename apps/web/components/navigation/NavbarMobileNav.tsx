'use client';

import { useState } from 'react';
import { MobilePublicNavDrawer } from './MobilePublicNavDrawer';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';

const menuBtnClass = `inline-flex ${navTouchTarget} shrink-0 items-center justify-center rounded border border-border bg-bg-muted text-text transition-colors hover:bg-border md:hidden ${navFocusRing}`;

/** Mobile-only hamburger + public drawer (Slice 6). */
export function NavbarMobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={menuBtnClass}
        aria-label={open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
        aria-expanded={open}
        aria-controls="mobile-public-nav-drawer"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      <MobilePublicNavDrawer isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
