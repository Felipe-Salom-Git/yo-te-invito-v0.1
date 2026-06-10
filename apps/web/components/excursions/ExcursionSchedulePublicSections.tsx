'use client';

import type { ExcursionSchedulePublic } from '@yo-te-invito/shared';
import { ExcursionDetailSectionHeading } from './ExcursionDetailSectionHeading';

type DetailRowProps = {
  label: string;
  value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-accent">{label}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-white">{value}</p>
    </div>
  );
}

type ExcursionSchedulePublicSectionsProps = {
  schedule?: ExcursionSchedulePublic | null;
  locationLabel?: string | null;
  hasLocation?: boolean;
  onViewLocation?: () => void;
  locationSourceNote?: string | null;
};

export function ExcursionSchedulePublicSections({
  schedule,
  locationLabel,
  hasLocation,
  onViewLocation,
  locationSourceNote,
}: ExcursionSchedulePublicSectionsProps) {
  const hasScheduleBlock = Boolean(
    schedule?.departureTime?.trim() ||
      schedule?.durationText?.trim() ||
      schedule?.availableDaysText?.trim(),
  );
  const hasMeetingPoint = Boolean(schedule?.meetingPoint?.trim());
  const hasNotes = Boolean(schedule?.scheduleNotes?.trim());
  const hasLocationSection = Boolean(locationLabel?.trim());

  if (!hasScheduleBlock && !hasMeetingPoint && !hasLocationSection && !hasNotes) {
    return null;
  }

  return (
    <div className="space-y-10">
      {hasScheduleBlock ? (
        <section className="space-y-4">
          <ExcursionDetailSectionHeading title="Horarios y duración" />
          <div className="grid gap-3 sm:grid-cols-2">
            {schedule?.departureTime?.trim() ? (
              <DetailRow label="Horario de salida" value={schedule.departureTime.trim()} />
            ) : null}
            {schedule?.durationText?.trim() ? (
              <DetailRow label="Duración" value={schedule.durationText.trim()} />
            ) : null}
            {schedule?.availableDaysText?.trim() ? (
              <DetailRow label="Días disponibles" value={schedule.availableDaysText.trim()} />
            ) : null}
          </div>
        </section>
      ) : null}

      {hasMeetingPoint ? (
        <section className="space-y-4">
          <ExcursionDetailSectionHeading title="Punto de encuentro" />
          <DetailRow label="Salida / encuentro" value={schedule!.meetingPoint!.trim()} />
        </section>
      ) : null}

      {hasLocationSection ? (
        <section className="space-y-4">
          <ExcursionDetailSectionHeading title="Ubicación" />
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-sm leading-relaxed text-white">{locationLabel!.trim()}</p>
            {locationSourceNote?.trim() ? (
              <p className="mt-2 text-xs text-text-muted">{locationSourceNote.trim()}</p>
            ) : null}
            {hasLocation && onViewLocation ? (
              <button
                type="button"
                onClick={onViewLocation}
                className="mt-3 text-sm font-medium text-accent hover:underline"
              >
                Ver ubicación
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {hasNotes ? (
        <section className="space-y-4">
          <ExcursionDetailSectionHeading title="Observaciones" />
          <DetailRow label="Horario" value={schedule!.scheduleNotes!.trim()} />
        </section>
      ) : null}
    </div>
  );
}
