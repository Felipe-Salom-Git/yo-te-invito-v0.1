import { navFocusRing } from '@/lib/navigation/navA11yClasses';

export const footerSectionTitle =
  'text-xs font-semibold uppercase tracking-[0.14em] text-text-muted';

export const footerSupportHeadingClass =
  'text-xs font-bold uppercase tracking-[0.18em] text-text';

export const footerSupportLabelClass = 'block text-sm text-text-muted/65';

export const footerSupportValueClass = `block w-fit max-w-full break-all text-sm text-text/90 transition-colors hover:text-accent ${navFocusRing}`;

/** Touch-friendly on mobile; compact from md+. */
export const footerLinkClass = `block max-w-full break-words rounded px-0.5 py-2.5 text-sm text-text-muted transition-colors hover:text-accent md:min-h-0 md:py-1 ${navFocusRing} min-h-11 md:min-h-0`;

export const footerShellClass =
  'mt-auto overflow-x-clip border-t border-white/10 bg-black text-text';

export const footerContainerClass =
  'mx-auto min-w-0 max-w-6xl overflow-x-clip px-4 sm:px-6';

export const footerTopRowClass =
  'grid min-w-0 grid-cols-1 gap-8 py-2 lg:grid-cols-[1fr_1.55fr_1fr] lg:items-center lg:gap-0 lg:py-4';

export const footerTopColumnBrandClass = 'min-w-0 lg:pr-10';

export const footerTopColumnInstagramClass =
  'min-w-0 lg:border-x lg:border-white/10 lg:px-10';

export const footerTopColumnSupportClass = 'min-w-0 lg:pl-10';

export const footerInlineLinkClass = `rounded px-0.5 py-0.5 text-sm text-text/80 transition-colors hover:text-accent ${navFocusRing}`;

export const footerLegalRowClass =
  'flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-2 text-sm';

export const footerLegalSeparatorClass = 'text-accent/50 select-none';

export const footerBottomRowClass =
  'flex min-w-0 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs leading-relaxed text-text/75';

export const footerBottomLinkClass = `rounded px-0.5 transition-colors hover:text-accent ${navFocusRing}`;

export const footerBottomSeparatorClass = 'text-text/35 select-none';

export const footerRowDividerClass = 'border-t border-white/10 pt-5 sm:pt-6';
