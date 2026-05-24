'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  getPortalNavDefinition,
  isPortalNavItemActive,
  type PortalNavKey,
} from '@/lib/navigation/portalNavConfig';
import { MASTER_PORTAL_NAV_SECTIONS } from '@/lib/navigation/masterUser';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';

const linkBase = `block rounded px-3 py-2 text-sm transition-colors ${navFocusRing}`;

interface MasterPortalNavSectionsProps {
  /** Compact links for mobile drawer. */
  variant?: 'sidebar' | 'drawer';
  onNavigate?: () => void;
}

function sectionHasActivePath(pathname: string, key: PortalNavKey): boolean {
  const { items } = getPortalNavDefinition(key);
  return items.some((item) => isPortalNavItemActive(pathname, item.href));
}

export function MasterPortalNavSections({
  variant = 'sidebar',
  onNavigate,
}: MasterPortalNavSectionsProps) {
  const pathname = usePathname();
  const [openKeys, setOpenKeys] = useState<Set<PortalNavKey>>(() => {
    const initial = new Set<PortalNavKey>();
    for (const { key } of MASTER_PORTAL_NAV_SECTIONS) {
      if (sectionHasActivePath(pathname, key)) initial.add(key);
    }
    if (initial.size === 0) initial.add('me');
    return initial;
  });

  useEffect(() => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      for (const { key } of MASTER_PORTAL_NAV_SECTIONS) {
        if (sectionHasActivePath(pathname, key)) next.add(key);
      }
      return next;
    });
  }, [pathname]);

  const toggle = (key: PortalNavKey) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const sectionGap = variant === 'drawer' ? 'space-y-2' : 'space-y-1';
  const linkClass = variant === 'drawer' ? `${linkBase} py-2.5 text-base` : linkBase;

  return (
    <div className={sectionGap}>
      {MASTER_PORTAL_NAV_SECTIONS.map(({ key, label }) => {
        const { items } = getPortalNavDefinition(key);
        const isOpen = openKeys.has(key);
        const sectionActive = sectionHasActivePath(pathname, key);
        const panelId = `master-portal-section-${key}`;

        return (
          <div
            key={key}
            className={`rounded-lg border border-border/80 ${
              sectionActive ? 'bg-bg-muted/60' : 'bg-transparent'
            }`}
          >
            <button
              type="button"
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-text ${navFocusRing}`}
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(key)}
            >
              <span>{label}</span>
              <ChevronIcon open={isOpen} />
            </button>
            {isOpen ? (
              <div id={panelId} className="space-y-0.5 px-1 pb-2 pt-0">
                {items.map((item) => {
                  const active = isPortalNavItemActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`${linkClass} ${
                        active
                          ? 'bg-accent font-medium text-bg'
                          : 'text-text-muted hover:bg-bg-muted hover:text-text'
                      }`}
                      aria-current={active ? 'page' : undefined}
                      onClick={onNavigate}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}
