'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isPortalNavItemActive } from '@/lib/navigation/portalNavConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export interface PortalSidebarItem {
  href: string;
  label: string;
}

export interface PortalSidebarProps {
  items: PortalSidebarItem[];
  children: React.ReactNode;
}

/**
 * Desktop sidebar for portal layouts (`md+`). Mobile uses `MobilePortalNav`.
 */
export function PortalSidebar({ items, children }: PortalSidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-6">
      <aside className="hidden md:block md:w-52 md:shrink-0 md:border-r md:border-border md:pr-4">
        <nav
          className="sticky top-20 py-2"
          aria-label="Menú del portal"
        >
          {items.map(({ href, label }) => {
            const active = isPortalNavItemActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`mb-1 block rounded px-3 py-2 text-sm transition-colors ${navFocusRing} ${
                  active
                    ? 'bg-accent text-bg'
                    : 'text-text-muted hover:bg-bg-muted hover:text-text'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
