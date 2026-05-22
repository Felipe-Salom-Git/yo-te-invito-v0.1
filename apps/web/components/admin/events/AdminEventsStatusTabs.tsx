'use client';

import type { AdminEventsListView } from '@yo-te-invito/shared';
import { ADMIN_EVENT_VIEW_TABS } from '@/lib/admin/admin-events-filters';

type AdminEventsStatusTabsProps = {
  activeView: AdminEventsListView;
  onChange: (view: AdminEventsListView) => void;
};

export function AdminEventsStatusTabs({ activeView, onChange }: AdminEventsStatusTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="Vistas rápidas de eventos"
    >
      {ADMIN_EVENT_VIEW_TABS.map((tab) => {
        const active = activeView === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? 'border-accent bg-accent/15 text-accent'
                : 'border-border/80 bg-bg-muted/40 text-text-muted hover:border-accent/40 hover:text-text'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
