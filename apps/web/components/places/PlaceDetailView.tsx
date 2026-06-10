'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useAddToCart } from '@/hooks/useAddToCart';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { useRecordPublicEventView } from '@/lib/query/public-engagement';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviewsState } from '@/lib/query/reviews';
import type { PublicReviewCategory } from '@yo-te-invito/shared';
import { entityTypeToReviewCategory } from '@/lib/schemas/review';
import { getPlaceHeroCtaLabel, getRelatedSectionTitle } from '@/lib/home/contentRoutes';
import { PublicDescriptionBlock } from '@/components/public/PublicDescriptionBlock';
import { EventHeroPremium } from '@/components/events/EventHeroPremium';
import { EventGallerySection } from '@/components/events/EventGallerySection';
import { EventHighlightsSection } from '@/components/events/EventHighlightsSection';
import { EventScheduleSection } from '@/components/events/EventScheduleSection';
import { EventLocationSection } from '@/components/events/EventLocationSection';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventPurchaseCard } from '@/components/events/EventPurchaseCard';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { useSession } from 'next-auth/react';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { GastroPromosSection } from '@/components/events/GastroPromosSection';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { useToast } from '@/components';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { getErrorMessage } from '@/lib/errors';
import type { EntityType } from '@/lib/schemas/review';

export type PlaceVariant = 'restaurant' | 'excursion' | 'rental' | 'hotel';

const VARIANT_TO_CATEGORY: Record<PlaceVariant, PublicReviewCategory> = {
  restaurant: 'gastro',
  excursion: 'excursion',
  rental: 'rental',
  hotel: 'hotel',
};

const CATEGORY_TO_ENTITY: Record<PlaceVariant, EntityType> = {
  restaurant: 'restaurant',
  excursion: 'excursion',
  rental: 'rental',
  hotel: 'hotel',
};

export type PlaceDetailViewProps = {
  id: string;
  variant: PlaceVariant;
  tenantId?: string;
};

export function PlaceDetailView({ id, variant, tenantId = 'tenant-demo' }: PlaceDetailViewProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToCart } = useAddToCart();
  const { addToast } = useToast();
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const category = VARIANT_TO_CATEGORY[variant];
  const { data: event, isLoading, error } = useEventDetail(id, tenantId);
  useRecordPublicEventView(id, tenantId, !!event && event.status === 'APPROVED');

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', id],
    queryFn: () => repos.events.getTicketTypes(id),
    enabled: !!id && !!event?.isTicketingEnabled,
  });

  const reviewCategory = entityTypeToReviewCategory(CATEGORY_TO_ENTITY[variant]);
  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
    page: reviewPage,
    setPage: setReviewPage,
    filters: reviewFilters,
    setFilters: setReviewFilters,
  } = usePublicEntityReviewsState(reviewCategory, id, tenantId);

  const { data: relatedData } = useQuery({
    queryKey: ['events', 'related', tenantId, category],
    queryFn: () =>
      repos.events.list({
        tenantId,
        category,
        limit: 12,
      }),
    enabled: !!tenantId && !!event,
  });

  const { data: publicDiscountsData } = useQuery({
    queryKey: ['events', 'public-discounts', id, tenantId],
    queryFn: () => repos.events.listPublicDiscounts(id, tenantId),
    enabled: !!id && !!tenantId && !!event && variant === 'restaurant',
  });

  const { data: session } = useSession();

  const createMutation = useMutation({
    mutationFn: (payload: ReviewFormSubmitPayload) =>
      repos.reviews.createPublic({
        eventId: id,
        overallRating: payload.overallRating,
        aspectRatings: payload.aspectRatings,
        comment: payload.comment,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id, tenantId) });
      queryClient.invalidateQueries({
        queryKey: reviewsKeys.publicV2Entity(reviewCategory, id, tenantId),
      });
    },
  });

  const entityType = CATEGORY_TO_ENTITY[variant];
  const primaryCtaLabel = getPlaceHeroCtaLabel(category);
  const relatedTitle = getRelatedSectionTitle(category);

  const scrollToPurchase = useCallback(() => {
    document.getElementById('comprar')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const scrollToReviews = useCallback(() => {
    document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const handleAddToCart = (
    tt: { id: string; name: string; price: number | string; capacityAvailable?: number },
    qty: number
  ) => {
    if (qty < 1 || !event) return;
    addToCart(
      {
        eventId: id,
        ticketTypeId: tt.id,
        quantity: qty,
        eventTitle: event.title ?? 'Event',
        ticketTypeName: tt.name,
        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price,
        maxPerOrder: Math.min(10, tt.capacityAvailable ?? 0),
      },
      { onSuccess: () => setQtyByType((p) => ({ ...p, [tt.id]: 0 })) },
    );
  };

  const handleSubmitReview = (values: ReviewFormSubmitPayload) => {
    createMutation.mutate(values);
  };

  if (isLoading || !id) {
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
        <p className="text-red-400">No encontrado</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver
        </Link>
      </div>
    );
  }

  const shareUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `${variant === 'restaurant' ? '/restaurants' : variant === 'excursion' ? '/excursiones' : '/rentals'}/${id}?tenantId=${tenantId}`;

  const locationVenueName = event.venueName;
  const locationAddress = event.venueAddress;
  const locationGeoLat = event.geoLat;
  const locationGeoLng = event.geoLng;

  return (
    <div className="min-h-screen bg-bg">
      <EventHeroPremium
        event={event}
        onBuyClick={event.isTicketingEnabled ? scrollToPurchase : scrollToReviews}
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
            { label: getCategoryLabel(category), href: '/explore' },
            { label: event.title },
          ]}
        />

        <div className="mt-4">
          <EventEngagementRow eventId={id} />
        </div>

        {/* Row 1: Top content (left) + Purchase (right) */}
        <div className="grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12">
          <div className="min-w-0 space-y-0 order-1">
            {event.description ? (
              <section className="mt-10 first:mt-0">
                <PublicDescriptionBlock title={event.title} description={event.description} />
              </section>
            ) : null}

            <EventHighlightsSection
              category={category}
              city={event.city}
              venueName={event.venueName}
              startAt={event.startAt}
              endAt={event.endAt}
              capacityTotal={event.capacityTotal}
            />

            {(category === 'event' || !category) && (
              <EventScheduleSection startAt={event.startAt} endAt={event.endAt} />
            )}

            {variant === 'restaurant' && (
              <GastroPromosSection discounts={publicDiscountsData?.discounts ?? []} />
            )}
          </div>

          <div className="lg:self-start order-2" id="comprar">
            {event.isTicketingEnabled && ticketTypes && ticketTypes.length > 0 ? (
              <EventPurchaseCard
                eventId={id}
                eventTitle={event.title}
                tenantId={tenantId}
                ticketTypes={ticketTypes}
                qtyByType={qtyByType}
                onQtyChange={(tid, qty) => setQtyByType((p) => ({ ...p, [tid]: qty }))}
                onAddToCart={handleAddToCart}
              />
            ) : (
              <div className="rounded-xl border border-border bg-bg-muted p-6 text-center">
                <p className="text-text-muted">
                  {variant === 'restaurant' && 'Reservá por WhatsApp o consultá disponibilidad.'}
                  {variant === 'excursion' && 'Contactanos por WhatsApp para más información.'}
                  {variant === 'hotel' && 'Consultá tarifas y disponibilidad por WhatsApp o en la web del hotel.'}
                </p>
                <a
                  href={`https://wa.me/5491112345678?text=${encodeURIComponent(`Hola, me interesa ${event.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-accent px-5 py-2.5 font-semibold text-bg hover:bg-accent-hover"
                >
                  Contactar por WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Full width Gallery */}
        <EventGallerySection
          coverImageUrl={event.coverImageUrl}
          media={event.media}
        />

        {/* Row 3: Reviews (left) + Map (right), aligned same height */}
        <div className="mt-10 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12 lg:items-stretch">
          <div className="min-w-0 order-1 flex flex-col">
            <EventReviewsSection
              eventId={id}
              tenantId={tenantId}
              category={reviewCategory}
              entityType={entityType}
              reviews={reviewsData?.reviews ?? []}
              total={reviewsData?.total ?? 0}
              page={reviewPage}
              onPageChange={setReviewPage}
              filters={reviewFilters}
              onFiltersChange={setReviewFilters}
              onSubmitReview={handleSubmitReview}
              isSubmittingReview={createMutation.isPending}
              canSubmitReview={!!session?.user}
              isLoading={reviewsLoading}
              isError={reviewsError}
              onRetry={() => void refetchReviews()}
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
              venueName={locationVenueName}
              venueAddress={locationAddress}
              city={event.city}
              geoLat={locationGeoLat}
              geoLng={locationGeoLng}
              fillHeight
            />
          </div>
        </div>

        {/* Review form: full width below */}
        <div className="mt-10">
          <ReviewForm
            key={reviewFormKey}
            entityType={entityType}
            entityId={id}
            onSubmit={handleSubmitReview}
            isSubmitting={createMutation.isPending}
            canSubmit={!!session?.user}
          />
        </div>

        {/* Row 4: Full width Related */}
        <RelatedEventsSection
          events={relatedData?.data ?? []}
          currentEventId={id}
          tenantId={tenantId}
          title={relatedTitle}
        />
      </div>

      <EventLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        venueName={locationVenueName}
        venueAddress={locationAddress}
        city={event.city}
        geoLat={locationGeoLat}
        geoLng={locationGeoLng}
      />
    </div>
  );
}
