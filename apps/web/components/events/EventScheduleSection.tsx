'use client';

export interface EventScheduleSectionProps {
  startAt?: string | null;
  endAt?: string | null;
}

export function EventScheduleSection({ startAt, endAt }: EventScheduleSectionProps) {
  if (!startAt) return null;

  const start = new Date(startAt);
  const startDate = start.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  const startTime = start.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  let endTime: string | null = null;
  if (endAt && endAt !== startAt) {
    const end = new Date(endAt);
    endTime = end.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <section className="mt-10">
      <h2 className="text-lg font-semibold text-white mb-3">Horarios</h2>
      <div className="rounded-xl border border-border bg-bg-muted/50 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl opacity-80" aria-hidden>🕐</span>
          <div>
            <p className="font-medium text-white capitalize">{startDate}</p>
            <p className="mt-1 text-sm text-text-muted">
              {startTime}
              {endTime ? ` – ${endTime}` : ''}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
