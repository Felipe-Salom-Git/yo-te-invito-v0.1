'use client';

import Link from 'next/link';

/** Shared subtle chip styles — V3.1 Etapa 2 */
export const PUBLIC_FILTER_CHIP_BASE =
  'inline-flex shrink-0 items-center justify-center rounded-full border px-3.5 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black';

export function publicFilterChipStateClass(isActive: boolean): string {
  return isActive
    ? 'border-accent/50 bg-accent/15 text-accent-soft'
    : 'border-white/12 bg-white/[0.04] text-white/75 hover:border-white/25 hover:bg-white/[0.08] hover:text-white';
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
      className={`${PUBLIC_FILTER_CHIP_BASE} ${publicFilterChipStateClass(isActive)} min-h-[40px] max-w-[9.5rem] flex-col gap-0.5 sm:max-w-[10.5rem]`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className="line-clamp-1 w-full text-center leading-tight">{title}</span>
      {subtitle ? (
        <span className="line-clamp-1 w-full text-center text-[10px] font-normal text-white/45">
          {subtitle}
        </span>
      ) : null}
    </Link>
  );
}
