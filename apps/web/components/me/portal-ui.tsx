'use client';

import Link from 'next/link';

export type PortalTab = { href: string; label: string; active: boolean };

/** Horizontal tabs used in /me/preferences and /me/activity. */
export function PortalTabNav({ tabs }: { tabs: PortalTab[] }) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border pb-4"
      aria-label="Secciones"
    >
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`shrink-0 rounded px-3 py-1.5 text-sm transition-colors ${
            tab.active
              ? 'bg-accent text-bg'
              : 'text-text-muted hover:bg-bg-muted hover:text-text'
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Section heading inside grouped lists (tickets, etc.). */
export function PortalListSection({
  title,
  description,
  children,
  className = '',
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 text-sm text-text-muted">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
