'use client';

import type { EventDetail } from '@/repositories/interfaces';
import { EventMetaSummary } from './EventMetaSummary';
import { EventActionBar } from './EventActionBar';

export interface EventHeroPremiumProps {
  event: EventDetail;
  onBuyClick: () => void;
  onLocationClick: () => void;
  onReviewsClick: () => void;
  shareTitle: string;
  shareUrl: string;
  /** Primary CTA label (e.g. "Comprar entradas", "Reservar") */
  primaryCtaLabel?: string;
}

export function EventHeroPremium({
  event,
  onBuyClick,
  onLocationClick,
  onReviewsClick,
  shareTitle,
  shareUrl,
  primaryCtaLabel,
}: EventHeroPremiumProps) {
  return (
    <section className="relative h-[40vh] min-h-[280px] overflow-hidden bg-black md:h-[50vh] md:min-h-[400px]">
      {event.coverImageUrl ? (
        <img
          src={event.coverImageUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-900/40 via-black to-black">
          <span className="text-8xl opacity-40" aria-hidden>
            🎟️
          </span>
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />

      <div className="relative flex h-full flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-10 md:pb-16 lg:px-16">
        <h1 className="text-3xl font-bold leading-tight text-white drop-shadow-lg sm:text-4xl md:text-5xl">
          {event.title}
        </h1>
        <div className="mt-3">
          <EventMetaSummary
            ratingAvg={event.ratingAvg}
            ratingCount={event.ratingCount}
            city={event.city}
            startAt={event.startAt}
            category={event.category}
          />
        </div>
        <div className="mt-6">
          <EventActionBar
            onBuyClick={onBuyClick}
            onLocationClick={onLocationClick}
            onReviewsClick={onReviewsClick}
            shareTitle={shareTitle}
            primaryCtaLabel={primaryCtaLabel}
            shareUrl={shareUrl}
          />
        </div>
      </div>
    </section>
  );
}
