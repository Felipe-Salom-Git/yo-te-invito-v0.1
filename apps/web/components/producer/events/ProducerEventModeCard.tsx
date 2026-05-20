'use client';

export function ProducerEventModeCard({
  title,
  description,
  bullets,
  cta,
  selected,
  onSelect,
}: {
  title: string;
  description: string;
  bullets: string[];
  cta: string;
  selected?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full flex-col rounded-xl border p-6 text-left transition ${
        selected
          ? 'border-accent-muted bg-accent-surface/50 shadow-[0_0_0_1px_rgba(var(--accent-rgb),0.35)]'
          : 'border-border bg-bg-muted hover:border-accent-muted/60'
      }`}
    >
      <h3 className="text-lg font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-text-muted">{description}</p>
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
          selected ? 'bg-accent text-bg' : 'border border-accent-muted text-accent-soft'
        }`}
      >
        {cta}
      </span>
    </button>
  );
}
