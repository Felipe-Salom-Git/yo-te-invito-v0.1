'use client';

import type { ContentCardItem } from './ContentCard';
import {
  getContentCardCategoryBadge,
  getContentCardLocationLine,
  getContentCardPlaceholderEmoji,
  isRentalContent,
  RENTAL_CARD_CTA,
} from '@/lib/home/contentCardPresentation';

export interface ContentPreviewExpandedProps {
  item: ContentCardItem;
  similarItems: ContentCardItem[];
  onSelectItem?: (item: ContentCardItem) => void;
}

/** Highlights block — derived from available metadata (no invented claims) */
function ContentHighlights({ item }: { item: ContentCardItem }) {
  const bullets: string[] = [];
  const isRental = isRentalContent(item);

  if (isRental) {
    const location = getContentCardLocationLine(item);
    if (location !== '—') bullets.push(location);
    if (item.subcategoryName) bullets.push(item.subcategoryName);
    bullets.push(RENTAL_CARD_CTA);
  } else {
    if (item.city) bullets.push(item.city);
    if (item.venueName && item.venueName !== item.city) bullets.push(item.venueName);
    if (item.startAt) {
      const d = new Date(item.startAt);
      bullets.push(d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }));
    }
  }

  if (item.category) {
    bullets.push(getContentCardCategoryBadge(item.category));
  }
  if (item.ratingAvg != null && item.ratingAvg > 0) {
    bullets.push(`★ ${item.ratingAvg.toFixed(1)}`);
  }

  if (bullets.length === 0) return null;

  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/60">
        Lo destacado
      </h4>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-white/90">
        {bullets.map((b, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-white/30">·</span>}
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Location/venue summary block */
function LocationSummary({ item }: { item: ContentCardItem }) {
  const line = getContentCardLocationLine(item);
  if (line === '—') return null;

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
        {isRentalContent(item) ? 'Local' : 'Ubicación'}
      </h4>
      <p className="text-sm text-white/90">{line}</p>
    </div>
  );
}

/** Review summary when data exists */
function ReviewSummary({ ratingAvg, ratingCount }: { ratingAvg?: number | null; ratingCount?: number | null }) {
  if (ratingAvg == null || ratingAvg <= 0) return null;

  const label =
    ratingCount != null && ratingCount > 0
      ? `${ratingAvg.toFixed(1)} · ${ratingCount} valoraciones`
      : `${ratingAvg.toFixed(1)}`;

  return (
    <div>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-white/60">
        Valoraciones
      </h4>
      <p className="text-sm text-accent font-medium">★ {label}</p>
    </div>
  );
}

export function ContentPreviewExpanded({
  item,
  similarItems,
  onSelectItem,
}: ContentPreviewExpandedProps) {
  const filteredSimilar = similarItems.filter((s) => s.id !== item.id);

  return (
    <div className="space-y-6">
      {/* Highlights block */}
      <ContentHighlights item={item} />

      {/* Two-column: Location + Reviews */}
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationSummary item={item} />
        <ReviewSummary ratingAvg={item.ratingAvg} ratingCount={item.ratingCount} />
      </div>

      {/* Similar / recommended */}
      {filteredSimilar.length > 0 && (
        <div className="border-t border-border pt-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white/80">
            Recomendados
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {filteredSimilar.slice(0, 8).map((sim) => (
              <button
                key={sim.id}
                type="button"
                onClick={() => onSelectItem?.(sim)}
                className="group flex w-32 flex-shrink-0 flex-col overflow-hidden rounded-lg border border-border/80 bg-bg-muted/80 transition-colors hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/60"
              >
                <div className="aspect-video w-full overflow-hidden bg-bg-muted">
                  {sim.coverImageUrl ? (
                    <img
                      src={sim.coverImageUrl}
                      alt={sim.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-emerald-900/30 text-xl opacity-60">
                      {getContentCardPlaceholderEmoji(sim.category)}
                    </div>
                  )}
                </div>
                <div className="p-2 text-left">
                  <p className="line-clamp-2 text-xs font-medium text-white">{sim.title}</p>
                  {!isRentalContent(sim) &&
                    sim.fromPrice != null &&
                    Number(sim.fromPrice) > 0 && (
                      <p className="mt-0.5 text-xs text-accent">
                        Desde ${Number(sim.fromPrice).toLocaleString('es-AR')}
                      </p>
                    )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
