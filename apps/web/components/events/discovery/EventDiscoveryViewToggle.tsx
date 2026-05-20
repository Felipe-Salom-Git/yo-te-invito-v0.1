'use client';

import type { EventDiscoveryView } from '@/lib/events/discovery/types';

/** Controles compactos para la barra derecha junto a subcategorías */
export function EventDiscoveryViewToggle({
  view,
  onChange,
  onOpenCalendar,
}: {
  view: EventDiscoveryView;
  onChange: (view: EventDiscoveryView) => void;
  onOpenCalendar: () => void;
}) {
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="inline-flex rounded-lg border border-white/15 bg-white/5 p-1">
        {(
          [
            { id: 'carousels' as const, label: 'Por categoría' },
            { id: 'date' as const, label: 'Por fecha' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition ${
              view === opt.id ? 'bg-accent text-bg' : 'text-white/70 hover:text-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenCalendar}
        className="w-full whitespace-nowrap rounded-lg border border-accent-muted px-3 py-2 text-center text-sm font-medium text-accent-soft transition hover:border-accent hover:bg-accent-surface/40"
      >
        Calendario mensual
      </button>
    </div>
  );
}
