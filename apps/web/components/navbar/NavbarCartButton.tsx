'use client';

import Link from 'next/link';
import { useNavbarCart } from '@/hooks/useNavbarCart';
import { navFocusRing, navTouchTarget } from '@/lib/navigation/navA11yClasses';

const buttonClass =
  `relative inline-flex ${navTouchTarget} shrink-0 items-center justify-center gap-1.5 rounded border border-border bg-bg-muted px-2.5 py-2 text-sm text-text transition-colors hover:bg-border sm:px-3 ${navFocusRing}`;

export function NavbarCartButton() {
  const { href, showBadge, badgeText, ariaLabel } = useNavbarCart();

  return (
    <Link href={href} className={buttonClass} aria-label={ariaLabel}>
      <CartIcon />
      <span className="hidden sm:inline">Mi Carro</span>
      {showBadge ? (
        <span
          className="absolute -right-1 -top-1 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full bg-accent px-1 text-[0.65rem] font-semibold leading-none text-bg ring-1 ring-bg"
          aria-hidden
        >
          {badgeText}
        </span>
      ) : null}
    </Link>
  );
}

function CartIcon() {
  return (
    <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}
