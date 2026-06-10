'use client';

import Link from 'next/link';
import { formatContentTagHashtag } from '@yo-te-invito/shared';
import type { ContentTagPublic } from '@/repositories/interfaces';

export const CONTENT_CARD_MAX_VISIBLE_TAGS = 2;

export type ContentTagChipsProps = {
  tags?: ContentTagPublic[] | null;
  /** Truncate list; omit for full list (detail/modal). */
  maxVisible?: number;
  /** Passed to explore links when filtering by tag. */
  category?: string | null;
  variant?: 'default' | 'dark' | 'muted';
  className?: string;
  linkable?: boolean;
};

export function buildExploreTagHref(slug: string, category?: string | null): string {
  const qs = new URLSearchParams();
  qs.set('tag', slug);
  const c = category?.trim();
  if (c) qs.set('category', c);
  return `/explore?${qs.toString()}`;
}

const chipClassByVariant: Record<NonNullable<ContentTagChipsProps['variant']>, string> = {
  default:
    'rounded-full border border-accent/35 bg-accent/10 px-3 py-1 text-xs font-medium text-text transition-colors hover:border-accent/60 hover:bg-accent/15',
  dark: 'rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-medium text-white/90 transition-colors hover:border-white/25 hover:bg-white/12',
  muted:
    'rounded-full border border-border bg-bg-muted px-2.5 py-0.5 text-[10px] font-medium text-text-muted',
};

export function ContentTagChips({
  tags,
  maxVisible,
  category,
  variant = 'default',
  className = '',
  linkable = true,
}: ContentTagChipsProps) {
  if (!tags?.length) return null;

  const visible = maxVisible != null ? tags.slice(0, maxVisible) : tags;
  const hiddenCount = maxVisible != null ? Math.max(0, tags.length - maxVisible) : 0;
  const chipClass = chipClassByVariant[variant];

  return (
    <ul
      className={`flex flex-wrap items-center gap-2 ${className}`.trim()}
      aria-label="Etiquetas"
    >
      {visible.map((tag) => (
        <li key={tag.id}>
          {linkable ? (
            <Link href={buildExploreTagHref(tag.slug, category)} className={chipClass}>
              {formatContentTagHashtag(tag.name)}
            </Link>
          ) : (
            <span className={chipClass}>{formatContentTagHashtag(tag.name)}</span>
          )}
        </li>
      ))}
      {hiddenCount > 0 ? (
        <li>
          <span
            className={
              variant === 'dark'
                ? 'text-xs text-white/60'
                : 'text-xs text-text-muted'
            }
          >
            +{hiddenCount}
          </span>
        </li>
      ) : null}
    </ul>
  );
}
