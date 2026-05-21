'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface PortalSidebarItem {
  href: string;
  label: string;
}

export interface PortalSidebarProps {
  items: PortalSidebarItem[];
  children: React.ReactNode;
}

/**
 * Vertical sidebar for portal layouts (admin, gastro, producer, referrer).
 * Renders nav links on the left and content on the right.
 */
export function PortalSidebar({ items, children }: PortalSidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== '/me' && pathname.startsWith(`${href}/`));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row md:gap-6">
      <aside className="md:w-52 md:shrink-0 md:border-r md:border-border md:pr-4">
        <nav
          className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:overflow-visible md:pb-0 md:sticky md:top-20 md:py-2"
          aria-label="Menú del portal"
        >
          {items.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`shrink-0 rounded px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                isActive(href)
                  ? 'bg-accent text-bg'
                  : 'text-text-muted hover:bg-bg-muted hover:text-text'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
