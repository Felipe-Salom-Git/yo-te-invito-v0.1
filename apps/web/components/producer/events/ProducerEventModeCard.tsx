'use client';

export function ProducerEventModeCard({
  title,
  description,
  bullets,
  cta,
  selected,
  onSelect,
  comingSoon = false,
  comingSoonBadge,
  comingSoonHint,
}: {
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  selected?: boolean;
  onSelect: () => void;
  comingSoon?: boolean;
  comingSoonBadge?: string;
  comingSoonHint?: string;
}) {
  return (
    <button
      type="button"
      onClick={comingSoon ? undefined : onSelect}
      disabled={comingSoon}
      aria-disabled={comingSoon}
      className={`flex w-full flex-col rounded-xl border p-6 text-left transition ${
        comingSoon
          ? 'cursor-not-allowed border-border/80 bg-bg-muted/40 opacity-90'
          : selected
            ? 'border-accent-muted bg-accent-surface/50 shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.35)]'
            : 'border-border bg-bg-muted hover:border-accent-muted/60'
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-semibold text-text">{title}</h3>
        {comingSoon && comingSoonBadge ? (
          <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-200/90">
            {comingSoonBadge}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">
        {comingSoon && comingSoonHint ? comingSoonHint : description}
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-text-muted">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="text-accent" aria-hidden>
              ·
            </span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <span
        className={`mt-6 inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold ${
          comingSoon
            ? 'border border-border text-text-muted'
            : selected
              ? 'bg-accent text-bg'
              : 'border border-accent-muted text-accent-soft'
        }`}
      >
        {comingSoon && comingSoonBadge ? comingSoonBadge : cta}
      </span>
    </button>
  );
}
