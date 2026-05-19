'use client';

import Link from 'next/link';
import type { PublicSubcategorySummary } from '@/repositories/interfaces';

export interface SubcategoryCardProps {
  item: PublicSubcategorySummary;
  href: string;
  isActive?: boolean;
}

export function SubcategoryCard({ item, href, isActive = false }: SubcategoryCardProps) {
  return (
    <Link
      href={href}
      className={`group relative flex h-[168px] w-[132px] shrink-0 flex-col justify-end overflow-hidden sm:h-[180px] sm:w-[148px] ${
        isActive ? 'ring-2 ring-accent ring-offset-2 ring-offset-black' : ''
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={
          item.imageUrl ??
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=70'
        }
        alt=""
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="relative p-3">
        <h3 className="text-sm font-black uppercase leading-tight text-white">{item.name}</h3>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-[0.6rem] font-medium uppercase tracking-wide text-white/80">
            {item.description}
          </p>
        )}
        <div className="mt-1.5 h-[2px] w-6 bg-accent" aria-hidden />
      </div>
    </Link>
  );
}
