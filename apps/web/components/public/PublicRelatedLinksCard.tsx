'use client';

import type { RelatedLinkItem } from '@yo-te-invito/shared';
import { RELATED_LINK_TYPE_LABELS_ES } from '@yo-te-invito/shared';

const CARD_CLASS =
  'rounded-xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]';

export type PublicRelatedLinksCardProps = {
  title?: string;
  links?: RelatedLinkItem[] | null;
  className?: string;
};

function linkLabel(item: RelatedLinkItem): string {
  const title = item.title.trim();
  if (title) return title;
  if (item.type) return RELATED_LINK_TYPE_LABELS_ES[item.type];
  return 'Enlace';
}

export function PublicRelatedLinksCard({
  title = 'Links relacionados',
  links,
  className,
}: PublicRelatedLinksCardProps) {
  const items = (links ?? [])
    .filter((l) => l.title?.trim() && l.url?.trim())
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (items.length === 0) return null;

  return (
    <section className={className ? `${CARD_CLASS} ${className}` : CARD_CLASS}>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent">{title}</h2>
      <ul className="mt-3 space-y-2.5 text-sm">
        {items.map((item, index) => (
          <li key={`${index}-${item.url}`}>
            <a
              href={item.url.trim()}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              {linkLabel(item)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
