'use client';

import type { ProducerEventFilterTab, ProducerEventSort } from '@/lib/producer/producer-event-filters';
import { PRODUCER_EVENT_FILTER_TABS } from '@/lib/producer/producer-event-filters';

type Props = {
  activeTab: ProducerEventFilterTab;
  onTabChange: (tab: ProducerEventFilterTab) => void;
  counts: Record<ProducerEventFilterTab, number>;
  search: string;
  onSearchChange: (value: string) => void;
  sort: ProducerEventSort;
  onSortChange: (sort: ProducerEventSort) => void;
};

const selectClass =
  'rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

export function ProducerEventsToolbar({
  activeTab,
  onTabChange,
  counts,
  search,
  onSearchChange,
  sort,
  onSortChange,
}: Props) {
  return (
    <div className="mt-6 space-y-4">
      <div className="-mx-1 overflow-x-auto pb-1">
        <div
          className="flex min-w-0 gap-2 px-1"
          role="tablist"
          aria-label="Filtrar eventos"
        >
          {PRODUCER_EVENT_FILTER_TABS.map((tab) => {
            const active = activeTab === tab.id;
            const count = counts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onTabChange(tab.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-bg-muted/50 text-text-muted hover:border-accent/40 hover:text-text'
                }`}
              >
                {tab.label}
                <span className="ml-1.5 tabular-nums text-xs opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Buscar eventos</span>
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, ciudad o lugar…"
            className={`${selectClass} w-full`}
          />
        </label>
        <label className="shrink-0 text-xs text-text-muted">
          <span className="mb-1 block">Orden</span>
          <select
            className={selectClass}
            value={sort}
            onChange={(e) => onSortChange(e.target.value as ProducerEventSort)}
          >
            <option value="startAsc">Fecha: más próximos</option>
            <option value="startDesc">Fecha: más lejanos</option>
            <option value="recent">Más recientes creados</option>
          </select>
        </label>
      </div>
    </div>
  );
}
