'use client';

type RailScrollArrowsProps = {
  /** Used in the aria-labels («Scroll {label} left»). */
  label: string;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  onScroll: (dir: 'left' | 'right') => void;
  /** Horizontal padding aligned with the rail cards. */
  paddingClassName?: string;
};

const ARROW_CLASS =
  'pointer-events-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border/80 bg-bg/95 text-text-muted shadow-xl backdrop-blur-sm transition-all duration-200 hover:scale-110 hover:border-accent/50 hover:bg-bg hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent/60 disabled:pointer-events-none disabled:opacity-0 sm:h-12 sm:w-12';

/**
 * Desktop scroll arrows for horizontal rails (mobile uses native swipe).
 * Flechas de scroll para carruseles en desktop (en mobile se usa swipe nativo).
 * The parent must be `relative`.
 */
export function RailScrollArrows({
  label,
  canScrollLeft,
  canScrollRight,
  onScroll,
  paddingClassName = '',
}: RailScrollArrowsProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-y-0 left-0 right-0 z-50 hidden items-center justify-between md:flex ${paddingClassName}`}
    >
      <button
        type="button"
        onClick={() => onScroll('left')}
        disabled={!canScrollLeft}
        className={ARROW_CLASS}
        aria-label={`Scroll ${label} left`}
      >
        <span className="text-xl">←</span>
      </button>
      <button
        type="button"
        onClick={() => onScroll('right')}
        disabled={!canScrollRight}
        className={ARROW_CLASS}
        aria-label={`Scroll ${label} right`}
      >
        <span className="text-xl">→</span>
      </button>
    </div>
  );
}
