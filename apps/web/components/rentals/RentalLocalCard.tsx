'use client';

import type { RentalOpeningHours } from '@yo-te-invito/shared';
import {
  hasRentalOpeningHoursContent,
  RENTAL_DETAIL_CARD_CLASS,
} from '@/lib/rentals/rentalDetailUi';
import { RentalOpeningHoursSummary } from './RentalOpeningHoursSummary';

type RentalLocalCardProps = {
  name: string;
  address?: string | null;
  openingHours?: RentalOpeningHours | null;
  openingHoursNote?: string | null;
  hasLocation: boolean;
  onViewLocation?: () => void;
};

export function RentalLocalCard({
  name,
  address,
  openingHours,
  openingHoursNote,
  hasLocation,
  onViewLocation,
}: RentalLocalCardProps) {
  const showHours = hasRentalOpeningHoursContent(openingHours, openingHoursNote);

  return (
    <section className={RENTAL_DETAIL_CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Local</h2>
      <p className="mt-2 text-base font-medium text-white">{name}</p>
      {address?.trim() && (
        <p className="mt-1.5 text-sm leading-relaxed text-text-muted">{address.trim()}</p>
      )}
      {showHours && (
        <div className="mt-4 border-t border-border/60 pt-4">
          <p className="text-sm font-medium text-text">Horario de atención</p>
          <div className="mt-1.5">
            <RentalOpeningHoursSummary schedule={openingHours} note={openingHoursNote} />
          </div>
        </div>
      )}
      {hasLocation && onViewLocation && (
        <button
          type="button"
          onClick={onViewLocation}
          className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-lg border border-border bg-bg px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/10 sm:w-auto sm:min-h-0 sm:inline-flex"
        >
          Ver ubicación
        </button>
      )}
    </section>
  );
}
