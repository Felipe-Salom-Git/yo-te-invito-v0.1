'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { publicGastroKeys, reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviewsState } from '@/lib/query/reviews';
import type { PublicReviewListFilters } from '@yo-te-invito/shared';
import { eventsKeys } from '@/lib/query/events';
import { useRecordPublicEventView } from '@/lib/query/public-engagement';
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
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { useSession } from 'next-auth/react';
import type { PublicReviewItemV2 } from '@yo-te-invito/shared';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { GastroFollowButton } from '@/components/me/GastroFollowButton';
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
  useRecordPublicEventView(reviewEventId ?? undefined, tenantId, !!reviewEventId && !!location);

  const { data: discountsData } = useQuery({
    queryKey: publicGastroKeys.discounts(resolvedLocationId ?? '', tenantId),
    queryFn: () => repos.publicGastro.listDiscounts(resolvedLocationId!, tenantId),
    enabled: !!resolvedLocationId,
  });

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
    page: reviewPage,
    setPage: setReviewPage,
    filters: reviewFilters,
    setFilters: setReviewFilters,
  } = usePublicEntityReviewsState('gastro', reviewEventId ?? '', tenantId);

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

  const { data: session } = useSession();

  const createMutation = useMutation({
    mutationFn: (payload: ReviewFormSubmitPayload) =>
      repos.reviews.createPublic({
        eventId: reviewEventId!,
        overallRating: payload.overallRating,
        aspectRatings: payload.aspectRatings,
        comment: payload.comment,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      if (reviewEventId) {
        queryClient.invalidateQueries({ queryKey: eventsKeys.detail(reviewEventId, tenantId) });
        queryClient.invalidateQueries({
          queryKey: reviewsKeys.publicV2Entity('gastro', reviewEventId, tenantId),
        });
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
      reviewsSummary={
        reviewsData?.summary ?? {
          averageRating: null,
          validReviewCount: 0,
          aspectAverages: null,
        }
      }
      reviewsLoading={reviewsLoading}
      reviewsError={reviewsError}
      onReviewsRetry={() => void refetchReviews()}
      reviewPage={reviewPage}
      onReviewPageChange={setReviewPage}
      reviewFilters={reviewFilters}
      onReviewFiltersChange={setReviewFilters}
      relatedEvents={relatedData?.data ?? []}
      reviewFormKey={reviewFormKey}
      isSubmittingReview={createMutation.isPending}
      onSubmitReview={(values) => createMutation.mutate(values)}
      canSubmitReview={!!session?.user}
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
  reviews: PublicReviewItemV2[];
  reviewsTotal: number;
  reviewsSummary: {
    averageRating: number | null;
    validReviewCount: number;
    aspectAverages: Record<string, number> | null;
  };
  reviewsLoading?: boolean;
  reviewsError?: boolean;
  onReviewsRetry?: () => void;
  reviewPage: number;
  onReviewPageChange: (page: number) => void;
  reviewFilters: PublicReviewListFilters;
  onReviewFiltersChange: (filters: PublicReviewListFilters) => void;
  relatedEvents: EventSummary[];
  reviewFormKey: number;
  isSubmittingReview: boolean;
  onSubmitReview: (values: ReviewFormSubmitPayload) => void;
  canSubmitReview?: boolean;
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
  reviewsSummary,
  reviewsLoading = false,
  reviewsError = false,
  onReviewsRetry,
  reviewPage,
  onReviewPageChange,
  reviewFilters,
  onReviewFiltersChange,
  relatedEvents,
  reviewFormKey,
  isSubmittingReview,
  onSubmitReview,
  canSubmitReview = true,
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
        <div className="flex flex-wrap items-center gap-3">
          <GastroFollowButton
            gastroProfileId={location.id}
            displayName={location.displayName}
          />
          {reviewEventId ? <EventEngagementRow eventId={reviewEventId} /> : null}
        </div>
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
                category="gastro"
                entityType="restaurant"
                reviews={reviews}
                total={reviewsTotal}
                page={reviewPage}
                onPageChange={onReviewPageChange}
                filters={reviewFilters}
                onFiltersChange={onReviewFiltersChange}
                onSubmitReview={onSubmitReview}
                isSubmittingReview={isSubmittingReview}
                canSubmitReview={canSubmitReview}
                isLoading={reviewsLoading}
                isError={reviewsError}
                onRetry={onReviewsRetry}
                summary={{
                  ...reviewsSummary,
                  averageRating:
                    reviewsSummary.averageRating ?? location.ratingAvg ?? null,
                  validReviewCount:
                    reviewsSummary.validReviewCount > 0
                      ? reviewsSummary.validReviewCount
                      : (location.ratingCount ?? 0),
                }}
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
                canSubmit={canSubmitReview}
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
