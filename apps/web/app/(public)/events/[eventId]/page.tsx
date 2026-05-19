'use client';

import { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { useRepositories } from '@/repositories/context';
import { useCart } from '@/context/CartContext';
import { getErrorMessage } from '@/lib/errors';
import { reviewsKeys } from '@/lib/query/keys';
import type { EntityType } from '@/lib/schemas/review';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getCategoryLabel, getPlaceHeroCtaLabel } from '@/lib/home/contentRoutes';
import { EventHeroPremium } from '@/components/events/EventHeroPremium';
import { EventHighlightsSection } from '@/components/events/EventHighlightsSection';
import { EventScheduleSection } from '@/components/events/EventScheduleSection';
import { EventLocationSection } from '@/components/events/EventLocationSection';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventPurchaseCard } from '@/components/events/EventPurchaseCard';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { EventMobileStickyCta } from '@/components/events/EventMobileStickyCta';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { useToast } from '@/components';

const DEFAULT_TENANT_ID = 'tenant-demo';

const CATEGORY_TO_ENTITY: Record<string, EntityType> = {
  gastro: 'restaurant',
  event: 'event',
  excursion: 'excursion',
  rental: 'rental',
};

export default function EventDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = (params?.eventId as string) ?? '';
  const tenantId = searchParams?.get('tenantId') ?? DEFAULT_TENANT_ID;
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);


  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { addToast } = useToast();

  const { data: event, isLoading, error } = useEventDetail(eventId, tenantId);

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.events.getTicketTypes(eventId),
    enabled: !!eventId && !!event?.isTicketingEnabled,
  });

  const { data: reviewsData } = useQuery({
    queryKey: reviewsKeys.byEvent(eventId, tenantId, reviewPage),
    queryFn: () => repos.reviews.list(eventId, tenantId, reviewPage, 10),
    enabled: !!eventId && !!tenantId,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['events', 'related', tenantId, event?.category ?? 'event'],
    queryFn: () =>
      repos.events.list({
        tenantId,
        category: event?.category ?? undefined,
        limit: 12,
      }),
    enabled: !!tenantId && !!event,
  });

  const { data: resaleListings } = useQuery({
    queryKey: ['resale', 'byEvent', eventId],
    queryFn: () => repos.resale.listByEvent(eventId),
    enabled: !!eventId,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { score: number; comment?: string; guestName?: string }) =>
      repos.reviews.create(eventId, {
        score: payload.score,
        comment: payload.comment,
        guestName: payload.guestName,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      queryClient.invalidateQueries({
        queryKey: eventsKeys.detail(eventId, tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewsKeys.byEvent(eventId, tenantId),
      });
    },
  });

  const entityType =
    CATEGORY_TO_ENTITY[event?.category ?? 'event'] ?? 'event';

  const handleSubmitReview = (values: {
    score: number;
    comment?: string;
    guestName?: string;
  }) => {
    createMutation.mutate(values);
  };

  const scrollToPurchase = useCallback(() => {
    document.getElementById('comprar')?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  const scrollToReviews = useCallback(() => {
    document.getElementById('reviews')?.scrollIntoView({
      behavior: 'smooth',
    });
  }, []);

  const handleAddToCart = (
    tt: TicketTypeResponse,
    qty: number
  ) => {
    if (qty < 1) return;
    addItem({
      eventId,
      eventTitle: event?.title ?? 'Event',
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      price:
        typeof tt.price === 'string'
          ? parseFloat(tt.price)
          : tt.price,
      quantity: qty,
      maxPerOrder: Math.min(10, tt.capacityAvailable ?? 0),
    });
    setQtyByType((p) => ({ ...p, [tt.id]: 0 }));
  };

  if (isLoading || !eventId) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-64 rounded-lg bg-bg-muted" />
          <div className="h-8 w-3/4 rounded bg-bg-muted" />
          <div className="h-4 w-1/2 rounded bg-bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <p className="text-red-400">Evento no encontrado</p>
        <Link
          href="/home"
          className="mt-4 block text-accent hover:underline"
        >
          ← Volver
        </Link>
      </div>
    );
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `/events/${eventId}?tenantId=${tenantId}`;

  const primaryCtaLabel = getPlaceHeroCtaLabel(event.category);
  const hasResale = (resaleListings?.length ?? 0) > 0;
  const fromPrice =
    ticketTypes && ticketTypes.length > 0
      ? Math.min(
          ...ticketTypes.map((tt) =>
            typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price
          )
        )
      : null;

  const showMobileSticky =
    event.isTicketingEnabled &&
    ticketTypes &&
    ticketTypes.length > 0;

  return (
    <div className="min-h-screen bg-bg pb-20 md:pb-0">
      <EventHeroPremium
        event={event}
        onBuyClick={scrollToPurchase}
        onLocationClick={() => setIsLocationModalOpen(true)}
        onReviewsClick={scrollToReviews}
        shareTitle={event.title}
        shareUrl={shareUrl}
        primaryCtaLabel={primaryCtaLabel}
      />

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: getCategoryLabel(event.category), href: '/explore' },
            { label: event.title },
          ]}
        />

        <div className="mt-4">
          <EventEngagementRow eventId={eventId} />
        </div>

        {/* Row 1: Top content (left) + Purchase (right) */}
        <div className="grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12">
          <div className="min-w-0 space-y-0 order-1">
            {event.description && (
              <section className="mt-10 first:mt-0">
                <h2 className="text-lg font-semibold text-white">Descripción</h2>
                <p className="mt-3 text-text-muted leading-relaxed">
                  {event.description}
                </p>
              </section>
            )}

            <EventHighlightsSection
              category={event.category}
              city={event.city}
              venueName={event.venueName}
              startAt={event.startAt}
              endAt={event.endAt}
              capacityTotal={event.capacityTotal}
            />

            <EventScheduleSection
              startAt={event.startAt}
              endAt={event.endAt}
            />
          </div>

          <div className="lg:self-start order-2">
            {event.isTicketingEnabled &&
            ticketTypes &&
            ticketTypes.length > 0 ? (
              <EventPurchaseCard
                eventId={eventId}
                eventTitle={event.title}
                tenantId={tenantId}
                ticketTypes={ticketTypes}
                qtyByType={qtyByType}
                onQtyChange={(id, qty) =>
                  setQtyByType((p) => ({ ...p, [id]: qty }))
                }
                onAddToCart={handleAddToCart}
                ratingAvg={event.ratingAvg}
                ratingCount={event.ratingCount}
                hasResale={hasResale}
              />
            ) : (
              <div className="rounded-xl border border-border bg-bg-muted p-6 text-center">
                <p className="text-text-muted">
                  Entradas no disponibles
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Reviews (left) + Map (right), aligned same height */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12 lg:items-stretch">
          <div className="min-w-0 order-1 flex flex-col">
            <EventReviewsSection
              eventId={eventId}
              tenantId={tenantId}
              entityType={entityType}
              reviews={reviewsData?.reviews ?? []}
              total={reviewsData?.total ?? 0}
              page={reviewPage}
              onPageChange={setReviewPage}
              onSubmitReview={handleSubmitReview}
              isSubmittingReview={createMutation.isPending}
              ratingAvg={event.ratingAvg}
              hideForm
            />
          </div>
          <div className="order-2 flex flex-col min-h-[280px]">
            <EventLocationSection
              venueName={event.venueName}
              venueAddress={event.venueAddress}
              city={event.city}
              geoLat={event.geoLat}
              geoLng={event.geoLng}
              fillHeight
            />
          </div>
        </div>

        {/* Review form: full width below */}
        <div className="mt-10">
          <ReviewForm
            key={reviewFormKey}
            entityType={entityType}
            entityId={eventId}
            onSubmit={handleSubmitReview}
            isSubmitting={createMutation.isPending}
          />
        </div>

        {/* Row 4: Full width Related */}
        <RelatedEventsSection
          events={relatedData?.data ?? []}
          currentEventId={eventId}
          tenantId={tenantId}
        />
      </div>

      <EventLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        venueName={event.venueName}
        venueAddress={event.venueAddress}
        city={event.city}
        geoLat={event.geoLat}
        geoLng={event.geoLng}
      />

      {showMobileSticky && (
        <EventMobileStickyCta
          eventTitle={event.title}
          fromPrice={fromPrice}
          eventId={eventId}
          tenantId={tenantId}
          ctaLabel={primaryCtaLabel}
        />
      )}
    </div>
  );
}
