'use client';

import type { RentalOpeningHours } from '@yo-te-invito/shared';
import { RentalOpeningHoursSummary } from './RentalOpeningHoursSummary';

const CARD_CLASS =
  'rounded-xl border border-border bg-bg-muted p-5';

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
  return (
    <section className={CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Local</h2>
      <p className="mt-2 font-medium text-white">{name}</p>
      {address?.trim() && (
        <p className="mt-1 text-sm text-text-muted">{address.trim()}</p>
      )}
      <div className="mt-4">
        <p className="text-sm font-medium text-text">Horario de atención</p>
        <div className="mt-1.5">
          <RentalOpeningHoursSummary schedule={openingHours} note={openingHoursNote} />
        </div>
      </div>
      {hasLocation && onViewLocation && (
        <button
          type="button"
          onClick={onViewLocation}
          className="mt-4 text-sm font-medium text-accent hover:underline"
        >
          Ver ubicación
        </button>
      )}
    </section>
  );
}
