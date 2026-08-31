'use client';

import Link from 'next/link';

/** Shared subtle chip styles — V3.1 Etapa 2 */
export const PUBLIC_FILTER_CHIP_BASE =
  'inline-flex shrink-0 snap-start items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black min-h-[44px]';

export function publicFilterChipStateClass(isActive: boolean): string {
  return isActive
    ? 'border-accent bg-accent/20 text-white shadow-[0_0_0_1px_rgba(34,197,94,0.35)]'
    : 'border-white/15 bg-white/[0.06] text-white/80 hover:border-accent/40 hover:bg-white/[0.1] hover:text-white active:scale-[0.98]';
}

export type SubcategoryFilterChipProps = {
  href: string;
  title: string;
  subtitle?: string | null;
  isActive?: boolean;
};

export function SubcategoryFilterChip({
  href,
  title,
  subtitle,
  isActive = false,
}: SubcategoryFilterChipProps) {
  return (
    <Link
      href={href}
      className={`${PUBLIC_FILTER_CHIP_BASE} ${publicFilterChipStateClass(isActive)} min-w-[5.5rem] max-w-[11rem] flex-col gap-0.5 sm:max-w-[12rem]`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="line-clamp-1 w-full text-center text-sm font-semibold leading-tight">{title}</span>
      {subtitle ? (
        <span className="line-clamp-1 w-full text-center text-[11px] font-normal text-white/50">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
