import { FOOTER_INSTAGRAM } from '@/lib/navigation/footerPublicConfig';
import { navFocusRing } from '@/lib/navigation/navA11yClasses';
import { InstagramIcon } from './InstagramIcon';

type Props = {
  href: string;
};

export function FooterInstagramHighlight({ href }: Props) {
  const { handle, title, ctaLabel } = FOOTER_INSTAGRAM;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative block w-full min-w-0 overflow-hidden rounded-[1.75rem] border border-accent/55 bg-gradient-to-br from-accent/[0.07] via-black/40 to-black px-5 py-5 shadow-[0_0_40px_rgba(34,197,94,0.16)] transition-all duration-300 hover:border-accent-soft/80 hover:shadow-[0_0_48px_rgba(74,222,128,0.22)] sm:px-6 sm:py-5 ${navFocusRing}`}
      aria-label={`${title} — ${handle} (se abre en una nueva pestaña)`}
    >
      <div
        className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-accent-soft to-transparent opacity-90"
        aria-hidden="true"
      />
      <div className="relative flex min-w-0 items-center gap-4 sm:gap-5">
        <InstagramIcon className="h-11 w-11 shrink-0 text-accent-soft drop-shadow-[0_0_16px_rgba(74,222,128,0.55)] transition-transform duration-300 group-hover:scale-105 sm:h-12 sm:w-12" />

        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-accent-soft sm:text-xs sm:tracking-[0.38em]">
            {title}
          </p>
          <p className="mt-1.5 text-xl font-bold tracking-tight text-text sm:mt-2 sm:text-[1.65rem] sm:leading-tight">
            {handle}
          </p>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full border border-accent/55 bg-black/20 px-4 py-1.5 text-sm font-semibold text-accent-soft backdrop-blur-sm transition-colors group-hover:border-accent-soft group-hover:text-accent-soft sm:mt-3.5">
            {ctaLabel}
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
