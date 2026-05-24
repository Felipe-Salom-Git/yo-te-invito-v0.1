'use client';

import Link from 'next/link';
import {
  getDesktopPublicNavItems,
  type PublicNavItem,
} from '@/lib/navigation/publicNavConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

const baseLink = `shrink-0 whitespace-nowrap rounded px-1 text-sm transition-colors ${navFocusRing}`;
const defaultLink = `${baseLink} text-text-muted hover:text-accent`;
const emphasizedLink = `${baseLink} font-medium text-text hover:text-accent`;

export function NavbarPublicLinks() {
  const items = getDesktopPublicNavItems();

  return (
    <div className="hidden min-w-0 items-center gap-4 md:flex" aria-label="Secciones públicas">
      {items.map((item) => (
        <PublicNavLink key={item.id} item={item} />
      ))}
    </div>
  );
}

function PublicNavLink({ item }: { item: PublicNavItem }) {
  if (item.comingSoon || item.disabled) {
    return (
      <span
        className={`${defaultLink} cursor-not-allowed opacity-60`}
        aria-disabled="true"
        title="Próximamente"
      >
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={item.emphasized ? emphasizedLink : defaultLink}
      aria-label={item.ariaLabel ?? item.label}
    >
      {item.label}
    </Link>
  );
}
