'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useCart } from '@/context/CartContext';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { reviewsKeys } from '@/lib/query/keys';
import { getPlaceHeroCtaLabel, getRelatedSectionTitle } from '@/lib/home/contentRoutes';
import { EventHeroPremium } from '@/components/events/EventHeroPremium';
import { EventGallerySection } from '@/components/events/EventGallerySection';
import { EventHighlightsSection } from '@/components/events/EventHighlightsSection';
import { EventScheduleSection } from '@/components/events/EventScheduleSection';
import { EventLocationSection } from '@/components/events/EventLocationSection';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventPurchaseCard } from '@/components/events/EventPurchaseCard';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getCategoryLabel } from '@/lib/home/contentRoutes';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { EntityType } from '@/lib/schemas/review';

export type PlaceVariant = 'restaurant' | 'excursion' | 'rental';

const VARIANT_TO_CATEGORY: Record<PlaceVariant, string> = {
  restaurant: 'gastro',
  excursion: 'excursion',
  rental: 'rental',
};

const CATEGORY_TO_ENTITY: Record<PlaceVariant, EntityType> = {
  restaurant: 'restaurant',
  excursion: 'excursion',
  rental: 'rental',
};

export type PlaceDetailViewProps = {
  id: string;
  variant: PlaceVariant;
  tenantId?: string;
};

export function PlaceDetailView({ id, variant, tenantId = 'tenant-demo' }: PlaceDetailViewProps) {
  const { data: session } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addItem } = useCart();
  const { addToast } = useToast();
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [qtyByType, setQtyByType] = useState<Record<string, number>>({});
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const category = VARIANT_TO_CATEGORY[variant];
  const { data: event, isLoading, error } = useEventDetail(id, tenantId);

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', id],
    queryFn: () => repos.events.getTicketTypes(id),
    enabled: !!id && !!event?.isTicketingEnabled,
  });

  const { data: reviewsData } = useQuery({
    queryKey: reviewsKeys.byEvent(id, tenantId, reviewPage),
    queryFn: () => repos.reviews.list(id, tenantId, reviewPage, 10),
    enabled: !!id && !!tenantId,
  });

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

  const userId =
    (session?.user as { userId?: string })?.userId ??
    (session?.user as { id?: string })?.id ??
    'demo-user';
  const createMutation = useMutation({
    mutationFn: (payload: { score: number; comment?: string }) =>
      repos.reviews.create(id, { score: payload.score, comment: payload.comment }, userId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(id, tenantId) });
      queryClient.invalidateQueries({ queryKey: reviewsKeys.byEvent(id, tenantId) });
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
    addItem({
      eventId: id,
      eventTitle: event.title ?? 'Event',
      ticketTypeId: tt.id,
      ticketTypeName: tt.name,
      price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price,
      quantity: qty,
      maxPerOrder: Math.min(10, tt.capacityAvailable ?? 0),
    });
    setQtyByType((p) => ({ ...p, [tt.id]: 0 }));
  };

  const handleSubmitReview = (values: { score: number; comment?: string }) => {
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

        {/* Row 1: Top content (left) + Purchase (right) */}
        <div className="grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:gap-12">
          <div className="min-w-0 space-y-0 order-1">
            {event.description && (
              <section className="mt-10 first:mt-0">
                <h2 className="text-lg font-semibold text-white">Descripción</h2>
                <p className="mt-3 leading-relaxed text-text-muted">{event.description}</p>
              </section>
            )}

            <EventHighlightsSection
              category={category}
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
                  {variant === 'rental' && 'Consultá disponibilidad por WhatsApp.'}
                </p>
                <a
                  href={`https://wa.me/5491112345678?text=${encodeURIComponent(`Hola, me interesa ${event.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white hover:bg-emerald-500"
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
            entityId={id}
            onSubmit={handleSubmitReview}
            isSubmitting={createMutation.isPending}
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
        venueName={event.venueName}
        venueAddress={event.venueAddress}
        city={event.city}
        geoLat={event.geoLat}
        geoLng={event.geoLng}
      />
    </div>
  );
}
