'use client';

import { MasterPortalNavSections } from './MasterPortalNavSections';

export interface MasterPortalSidebarProps {
  children: React.ReactNode;
}

/**
 * Sidebar desktop para usuario maestro — todas las verticales en acordeones.
 */
export function MasterPortalSidebar({ children }: MasterPortalSidebarProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row md:gap-6">
      <aside className="hidden md:block md:w-60 md:shrink-0 md:border-r md:border-border md:pr-4 lg:w-64">
        <nav className="sticky top-20 max-h-[calc(100vh-5.5rem)] overflow-y-auto overscroll-contain py-2" aria-label="Menú maestro de portales">
          <p className="mb-3 px-3 text-xs font-medium uppercase tracking-wide text-text-muted">
            Todos los portales
          </p>
          <MasterPortalNavSections variant="sidebar" />
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
