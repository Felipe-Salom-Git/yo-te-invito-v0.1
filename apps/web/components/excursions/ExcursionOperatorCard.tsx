'use client';

import type { RentalOpeningHours } from '@yo-te-invito/shared';
import { RentalOpeningHoursSummary } from '@/components/rentals/RentalOpeningHoursSummary';

const CARD_CLASS = 'rounded-xl border border-border bg-bg-muted p-5';

type ExcursionOperatorCardProps = {
  name: string;
  address?: string | null;
  city?: string | null;
  openingHours?: RentalOpeningHours | null;
  openingHoursNote?: string | null;
  hasLocation: boolean;
  onViewLocation?: () => void;
};

export function ExcursionOperatorCard({
  name,
  address,
  city,
  openingHours,
  openingHoursNote,
  hasLocation,
  onViewLocation,
}: ExcursionOperatorCardProps) {
  const addressLine = [address?.trim(), city?.trim()].filter(Boolean).join(', ');

  return (
    <section className={CARD_CLASS}>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Operador</h2>
      <p className="mt-2 font-medium text-white">{name}</p>
      {addressLine && <p className="mt-1 text-sm text-text-muted">{addressLine}</p>}
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
