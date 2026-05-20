'use client';

import Link from 'next/link';

const CHIP_SIZE =
  'flex h-[84px] w-[108px] shrink-0 flex-col items-center justify-center border px-2 text-center transition-colors sm:h-[88px] sm:w-[116px]';

function chipStateClass(isActive: boolean) {
  return isActive
    ? 'border-accent-muted bg-accent-surface/60 text-accent-soft'
    : 'border-white/20 bg-black text-white/80 hover:border-white/40 hover:text-white';
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
    <Link href={href} className={`${CHIP_SIZE} ${chipStateClass(isActive)}`}>
      <span
        className={`line-clamp-2 text-xs font-black uppercase leading-tight tracking-tight sm:text-sm ${
          isActive ? 'text-accent-soft' : 'text-white'
        }`}
      >
        {title}
      </span>
      {subtitle ? (
        <span className="mt-1 line-clamp-1 text-[0.6rem] font-medium uppercase tracking-wide text-white/50">
          {subtitle}
        </span>
      ) : null}
      <div className="mt-2 h-[2px] w-6 shrink-0 bg-accent" aria-hidden />
    </Link>
  );
}
