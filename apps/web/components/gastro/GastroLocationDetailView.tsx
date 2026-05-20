'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { publicGastroKeys, reviewsKeys } from '@/lib/query/keys';
import { eventsKeys } from '@/lib/query/events';
import { getCategoryLabel, getRelatedSectionTitle } from '@/lib/home/contentRoutes';
import { buildGastroGalleryImages, buildGastroWhatsAppHref } from '@/lib/gastro/gallery';
import { GastroLocationHero } from './GastroLocationHero';
import { GastroLocationPromosSection } from './GastroLocationPromosSection';
import { GastroLocationLinksCard } from './GastroLocationLinksCard';
import { RentalLocalCard } from '@/components/rentals/RentalLocalCard';
import { RentalContactCard } from '@/components/rentals/RentalContactCard';
import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';
import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { ReviewForm } from '@/components/reviews/ReviewForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { EventSummary, PublicGastroLocation } from '@/repositories/interfaces';

export type GastroLocationDetailViewProps = {
  tenantId?: string;
  locationId?: string;
  eventId?: string;
};

export function GastroLocationDetailView({
  tenantId = 'tenant-demo',
  locationId,
  eventId,
}: GastroLocationDetailViewProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const { data: location, isLoading, error } = useQuery({
    queryKey: eventId
      ? publicGastroKeys.byEvent(eventId, tenantId)
      : publicGastroKeys.detail(locationId ?? '', tenantId),
    queryFn: () =>
      eventId
        ? repos.publicGastro.getByPublicEventId(eventId, tenantId)
        : repos.publicGastro.getById(locationId!, tenantId),
    enabled: Boolean(eventId || locationId),
  });

  const resolvedLocationId = location?.id;
  const reviewEventId = location?.publicEventId ?? eventId;

  const { data: discountsData } = useQuery({
    queryKey: publicGastroKeys.discounts(resolvedLocationId ?? '', tenantId),
    queryFn: () => repos.publicGastro.listDiscounts(resolvedLocationId!, tenantId),
    enabled: !!resolvedLocationId,
  });

  const { data: reviewsData } = useQuery({
    queryKey: reviewsKeys.byEvent(reviewEventId ?? '', tenantId, reviewPage),
    queryFn: () => repos.reviews.list(reviewEventId!, tenantId, reviewPage, 10),
    enabled: !!reviewEventId,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['events', 'related', tenantId, 'gastro'],
    queryFn: () =>
      repos.events.list({
        tenantId,
        category: 'gastro',
        limit: 12,
      }),
    enabled: !!location,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { score: number; comment?: string; guestName?: string }) =>
      repos.reviews.create(reviewEventId!, {
        score: payload.score,
        comment: payload.comment,
        guestName: payload.guestName,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      if (reviewEventId) {
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(reviewEventId, tenantId) });
        queryClient.invalidateQueries({ queryKey: reviewsKeys.byEvent(reviewEventId, tenantId) });
      }
    },
  });

  if (isLoading || (!locationId && !eventId)) {
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

  if (error || !location) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <p className="text-red-400">Local no encontrado</p>
        <Link href="/home" className="mt-4 block text-accent hover:underline">
          ← Volver al inicio
        </Link>
      </div>
    );
  }

  return (
    <GastroLocationDetailContent
      location={location}
      tenantId={tenantId}
      discounts={discountsData?.discounts ?? []}
      reviews={reviewsData?.reviews ?? []}
      reviewsTotal={reviewsData?.total ?? 0}
      reviewPage={reviewPage}
      onReviewPageChange={setReviewPage}
      relatedEvents={relatedData?.data ?? []}
      reviewFormKey={reviewFormKey}
      isSubmittingReview={createMutation.isPending}
      onSubmitReview={(values) => createMutation.mutate(values)}
      isLocationModalOpen={isLocationModalOpen}
      onLocationModalOpen={() => setIsLocationModalOpen(true)}
      onLocationModalClose={() => setIsLocationModalOpen(false)}
    />
  );
}

type GastroLocationDetailContentProps = {
  location: PublicGastroLocation;
  tenantId: string;
  discounts: import('@/repositories/interfaces').PublicGastroLocationDiscount[];
  reviews: import('@/repositories/interfaces').ReviewItem[];
  reviewsTotal: number;
  reviewPage: number;
  onReviewPageChange: (page: number) => void;
  relatedEvents: EventSummary[];
  reviewFormKey: number;
  isSubmittingReview: boolean;
  onSubmitReview: (values: { score: number; comment?: string; guestName?: string }) => void;
  isLocationModalOpen: boolean;
  onLocationModalOpen: () => void;
  onLocationModalClose: () => void;
};

function GastroLocationDetailContent({
  location,
  tenantId,
  discounts,
  reviews,
  reviewsTotal,
  reviewPage,
  onReviewPageChange,
  relatedEvents,
  reviewFormKey,
  isSubmittingReview,
  onSubmitReview,
  isLocationModalOpen,
  onLocationModalOpen,
  onLocationModalClose,
}: GastroLocationDetailContentProps) {
  const galleryImages = buildGastroGalleryImages(location.bannerUrl, location.galleryUrls);
  const description = location.detail?.trim() || location.description?.trim() || null;
  const hasLocation =
    Boolean(location.address?.trim()) ||
    (location.geoLat != null && location.geoLng != null);
  const whatsAppHref = buildGastroWhatsAppHref(location.displayName, location.contactPhone);
  const reviewEventId = location.publicEventId;

  return (
    <div className="min-h-screen bg-bg">
      <GastroLocationHero
        coverImageUrl={location.bannerUrl}
        logoUrl={location.logoUrl}
        title={location.displayName}
        summary={location.summary}
        detail={location.detail}
        subcategoryName={location.subcategoryName}
        city={location.city}
        province={location.province}
      >
        {reviewEventId ? <EventEngagementRow eventId={reviewEventId} /> : null}
      </GastroLocationHero>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: getCategoryLabel('gastro'), href: '/explore?category=gastro' },
            { label: location.displayName },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-8">
            {description && (
              <RentalDescriptionBlock
                productTitle={location.displayName}
                description={description}
              />
            )}

            <GastroLocationPromosSection discounts={discounts} />

            {galleryImages.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold text-text">Galería</h2>
                <div className="mt-4">
                  <RentalGalleryThumbnails images={galleryImages} />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <RentalContactCard whatsAppHref={whatsAppHref} />
            <RentalLocalCard
              name={location.displayName}
              address={location.address}
              openingHours={location.openingHours}
              openingHoursNote={location.openingHoursNote}
              hasLocation={hasLocation}
              onViewLocation={hasLocation ? onLocationModalOpen : undefined}
            />
            <GastroLocationLinksCard
              menuUrl={location.menuUrl}
              websiteUrl={location.websiteUrl}
              contactPhone={location.contactPhone}
            />
          </aside>
        </div>

        {reviewEventId && (
          <>
            <div className="mt-12" id="reviews">
              <EventReviewsSection
                eventId={reviewEventId}
                tenantId={tenantId}
                entityType="restaurant"
                reviews={reviews}
                total={reviewsTotal}
                page={reviewPage}
                onPageChange={onReviewPageChange}
                onSubmitReview={onSubmitReview}
                isSubmittingReview={isSubmittingReview}
                ratingAvg={location.ratingAvg ?? null}
                hideForm
              />
            </div>
            <div className="mt-8">
              <ReviewForm
                key={reviewFormKey}
                entityType="restaurant"
                entityId={reviewEventId}
                onSubmit={onSubmitReview}
                isSubmitting={isSubmittingReview}
              />
            </div>
          </>
        )}

        {relatedEvents.length > 0 && reviewEventId && (
          <div className="mt-12">
            <RelatedEventsSection
              events={relatedEvents}
              currentEventId={reviewEventId}
              tenantId={tenantId}
              title={getRelatedSectionTitle('gastro')}
            />
          </div>
        )}
      </div>

      <EventLocationModal
        isOpen={isLocationModalOpen}
        onClose={onLocationModalClose}
        venueName={location.displayName}
        venueAddress={location.address}
        city={location.city}
        geoLat={location.geoLat}
        geoLng={location.geoLng}
      />
    </div>
  );
}
