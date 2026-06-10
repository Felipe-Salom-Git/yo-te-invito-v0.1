'use client';

import type { EventDiscoveryView } from '@/lib/events/discovery/types';
import {
  PUBLIC_FILTER_CHIP_BASE,
  publicFilterChipStateClass,
} from '@/components/categories/SubcategoryFilterChip';

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
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <div
        className="inline-flex w-full gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1 sm:w-auto"
        role="group"
        aria-label="Vista de eventos"
      >
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
            className={`${PUBLIC_FILTER_CHIP_BASE} ${publicFilterChipStateClass(view === opt.id)} !rounded-full px-3 py-1.5 text-xs sm:text-sm`}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onOpenCalendar}
        className={`${PUBLIC_FILTER_CHIP_BASE} ${publicFilterChipStateClass(false)} w-full text-xs sm:min-w-[10rem] sm:text-sm`}
      >
        Calendario mensual
      </button>
    </div>
  );
}
