import type { ProducerEventMode } from '@/lib/producer/event-mode';

export function EventModeBadge({
  mode,
  hasActiveTicketing,
}: {
  mode: ProducerEventMode;
  /** When TICKETED but no active ticket types yet */
  hasActiveTicketing?: boolean;
}) {
  if (mode === 'PUBLICITY_ONLY') {
    return (
      <span className="inline-flex rounded-full border border-white/20 bg-white/5 px-2.5 py-0.5 text-xs font-medium text-white/80">
        Solo publicidad
      </span>
    );
  }

  if (hasActiveTicketing === false) {
    return (
      <span className="inline-flex rounded-full border border-accent-muted bg-accent-surface/70 px-2.5 py-0.5 text-xs font-medium text-accent-soft">
        Con ticketera (sin entradas activas)
      </span>
    );
  }

  return (
      <span className="inline-flex rounded-full border border-accent-muted bg-accent-surface/80 px-2.5 py-0.5 text-xs font-medium text-accent-soft">
      Con ticketera
    </span>
  );
}
