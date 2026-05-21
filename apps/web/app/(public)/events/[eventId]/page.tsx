'use client';

import { useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { useRepositories } from '@/repositories/context';
import { useSession } from 'next-auth/react';
import { useAddToCart } from '@/hooks/useAddToCart';
import { getErrorMessage } from '@/lib/errors';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviews } from '@/lib/query/reviews';
import type { EntityType } from '@/lib/schemas/review';
import { entityTypeToReviewCategory } from '@/lib/schemas/review';
import type { PublicReviewCategory } from '@yo-te-invito/shared';
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
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { EventMobileStickyCta } from '@/components/events/EventMobileStickyCta';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { EventProducerCard } from '@/components/events/EventProducerCard';
import { EventPublicityInfoCard } from '@/components/events/detail/EventPublicityInfoCard';
import { EventSectionCard } from '@/components/events/detail/EventSectionCard';
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
  const { data: session } = useSession();
  const { addToCart } = useAddToCart();
  const { addToast } = useToast();

  const { data: event, isLoading, error } = useEventDetail(eventId, tenantId);

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.events.getTicketTypes(eventId),
    enabled: !!eventId && !!event?.isTicketingEnabled && !event?.isGeneralPublication,
  });

  const entityType =
    CATEGORY_TO_ENTITY[event?.category ?? 'event'] ?? 'event';
  const reviewCategory: PublicReviewCategory = entityTypeToReviewCategory(entityType);

  const { data: reviewsData, isLoading: reviewsLoading } = usePublicEntityReviews(
    reviewCategory,
    eventId,
    tenantId,
    reviewPage,
  );

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

  const createMutation = useMutation({
    mutationFn: (payload: ReviewFormSubmitPayload) =>
      repos.reviews.createPublic({
        eventId,
        overallRating: payload.overallRating,
        aspectRatings: payload.aspectRatings,
        comment: payload.comment,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      queryClient.invalidateQueries({
        queryKey: eventsKeys.detail(eventId, tenantId),
      });
      queryClient.invalidateQueries({
        queryKey: reviewsKeys.publicV2Entity(reviewCategory, eventId, tenantId),
      });
    },
  });

  const handleSubmitReview = (values: ReviewFormSubmitPayload) => {
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

  const handleAddToCart = (tt: TicketTypeResponse, qty: number) => {
    if (qty < 1) return;
    addToCart(
      {
        eventId,
        ticketTypeId: tt.id,
        quantity: qty,
        eventTitle: event?.title ?? 'Event',
        ticketTypeName: tt.name,
        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price,
        maxPerOrder: Math.min(10, tt.capacityAvailable ?? 0),
      },
      { onSuccess: () => setQtyByType((p) => ({ ...p, [tt.id]: 0 })) },
    );
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
  const fromPrice =
    ticketTypes && ticketTypes.length > 0
      ? Math.min(
          ...ticketTypes.map((tt) =>
            typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price
          )
        )
      : null;

  const canPurchaseTickets =
    !event.isGeneralPublication &&
    event.isTicketingEnabled &&
    ticketTypes &&
    ticketTypes.length > 0;

  const showMobileSticky = canPurchaseTickets;
  const isProducerEvent = !event.category || event.category === 'event';
  const showTicketingSoon =
    isProducerEvent &&
    !event.isGeneralPublication &&
    event.isTicketingEnabled &&
    !canPurchaseTickets;

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
        <div className="grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-x-12 lg:gap-y-8">
          <div className="lg:col-span-2">
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
          </div>

          <div className="min-w-0 flex flex-col gap-10">
            {event.description && (
              <section>
                <h2 className="text-lg font-semibold text-white">Descripción</h2>
                <p className="mt-3 text-text-muted leading-relaxed">
                  {event.description}
                </p>
              </section>
            )}

            <EventHighlightsSection
              className="mt-0"
              category={event.category}
              city={event.city}
              venueName={event.venueName}
              startAt={event.startAt}
              endAt={event.endAt}
              capacityTotal={event.capacityTotal}
            />

            <EventScheduleSection
              className="mt-0"
              startAt={event.startAt}
              endAt={event.endAt}
            />
          </div>

          {isProducerEvent ? (
          <div className="flex w-full min-w-0 flex-col gap-4">
            {event.producer ? (
              <EventProducerCard producer={event.producer} />
            ) : null}
            {canPurchaseTickets && ticketTypes ? (
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
              />
            ) : null}
            {event.isGeneralPublication ? (
              <EventPublicityInfoCard producer={event.producer} />
            ) : null}
            {showTicketingSoon ? (
              <EventSectionCard title="Entradas">
                <p className="text-sm text-text-muted">
                  Las entradas para este evento estarán disponibles próximamente.
                </p>
              </EventSectionCard>
            ) : null}
          </div>
          ) : null}
        </div>

        {/* Row 2: Reviews (left) + Map (right), aligned same height */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12 lg:items-stretch">
          <div className="min-w-0 order-1 flex flex-col">
            <EventReviewsSection
              eventId={eventId}
              tenantId={tenantId}
              category={reviewCategory}
              entityType={entityType}
              reviews={reviewsData?.reviews ?? []}
              total={reviewsData?.total ?? 0}
              page={reviewPage}
              onPageChange={setReviewPage}
              onSubmitReview={handleSubmitReview}
              isSubmittingReview={createMutation.isPending}
              canSubmitReview={!!session?.user}
              isLoading={reviewsLoading}
              summary={
                reviewsData?.summary ?? {
                  averageRating: event.ratingAvg ?? null,
                  validReviewCount: event.ratingCount ?? 0,
                  aspectAverages: null,
                }
              }
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
            canSubmit={!!session?.user}
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
