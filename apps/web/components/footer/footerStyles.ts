import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export const footerSectionTitle =
  'text-xs font-semibold uppercase tracking-[0.14em] text-text-muted';

/** Touch-friendly on mobile; compact from md+. */
export const footerLinkClass = `block max-w-full break-words rounded px-0.5 py-2.5 text-sm text-text-muted transition-colors hover:text-accent md:min-h-0 md:py-1 ${navFocusRing} min-h-11 md:min-h-0`;

export const footerShellClass =
  'mt-auto overflow-x-clip border-t border-white/10 bg-black text-text';

export const footerContainerClass =
  'mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 sm:px-6';

export const footerComingSoonBadge =
  'ml-1.5 inline-flex shrink-0 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide text-accent';

/** Placeholder social — not a link; visible “Pendiente” + Próximamente badge. */
export const footerPendingSocialClass =
  'inline-flex min-h-11 max-w-full flex-wrap items-center gap-1.5 text-sm text-text-muted/75 md:min-h-0';

export const footerPendingLabelClass =
  'rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[0.6rem] font-medium uppercase tracking-wide text-text-muted';
