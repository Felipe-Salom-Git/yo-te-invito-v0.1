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

  return (
    <div className="flex min-h-0 flex-1 gap-6">
      <aside className="w-44 shrink-0 border-r border-border pr-3 sm:w-52 sm:pr-4">
        <nav className="sticky top-20 flex flex-col gap-0.5 py-2" aria-label="Menú del portal">
          {items.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`rounded px-3 py-2 text-sm transition-colors ${
                pathname === href
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
