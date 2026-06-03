'use client';

import type { PublicReviewListFilters, PublicReviewItemV2 } from '@yo-te-invito/shared';
import { getCategoryGatewayHref } from '@/lib/home/categoryGatewayConfig';
import { getCategoryLabel, getRelatedSectionTitle } from '@/lib/home/contentRoutes';
import { buildGastroGalleryImages, buildGastroWhatsAppHref } from '@/lib/gastro/gallery';
import { hasPublicLocationForMapLink } from '@/lib/maps';
import { GastroPublicHero } from './GastroPublicHero';
import { GastroDiscountsSection } from './GastroDiscountsSection';
import { GastroLocationLinksCard } from './GastroLocationLinksCard';
import { GastroLocationEditorialSection } from './GastroLocationEditorialSection';
import { GastroContactCard } from './GastroContactCard';
import { GastroLocationCard } from './GastroLocationCard';
import { GastroGallerySection } from './GastroGallerySection';
import { GastroAboutSection } from './GastroAboutSection';
import { GastroRelatedLocationsSection } from './GastroRelatedLocationsSection';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { GastroFollowButton } from '@/components/me/GastroFollowButton';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import type { EventSummary, PublicGastroLocation } from '@/repositories/interfaces';
import type { PublicGastroLocationDiscount } from '@/repositories/interfaces';

export type GastroPublicDetailContentProps = {
  location: PublicGastroLocation;
  tenantId: string;
  discounts: PublicGastroLocationDiscount[];
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
  relatedLocations: EventSummary[];
  reviewFormKey: number;
  isSubmittingReview: boolean;
  onSubmitReview: (values: ReviewFormSubmitPayload) => void;
  canSubmitReview?: boolean;
  isLocationModalOpen: boolean;
  onLocationModalOpen: () => void;
  onLocationModalClose: () => void;
};

export function GastroPublicDetailContent({
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
  relatedLocations,
  reviewFormKey,
  isSubmittingReview,
  onSubmitReview,
  canSubmitReview = true,
  isLocationModalOpen,
  onLocationModalOpen,
  onLocationModalClose,
}: GastroPublicDetailContentProps) {
  const galleryImages = buildGastroGalleryImages(location.bannerUrl, location.galleryUrls);
  const description = location.detail?.trim() || location.description?.trim() || null;
  const hasLocation = hasPublicLocationForMapLink({
    address: location.address,
    city: location.city,
    venueName: location.displayName,
    geoLat: location.geoLat,
    geoLng: location.geoLng,
  });
  const whatsAppHref = buildGastroWhatsAppHref(location.displayName, location.contactPhone);
  const reviewEventId = location.publicEventId;
  const publishedContent = location.content ?? [];
  const hasEditorial = publishedContent.length > 0;

  const ratingDisplay =
    reviewsSummary.averageRating ?? location.ratingAvg ?? null;
  const reviewCountDisplay =
    reviewsSummary.validReviewCount > 0
      ? reviewsSummary.validReviewCount
      : (location.ratingCount ?? 0);

  return (
    <div className="min-h-screen bg-bg pb-10">
      <GastroPublicHero
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
            className="border-white/30 bg-black/40 text-white hover:bg-black/60"
          />
          {reviewEventId && reviewCountDisplay > 0 ? (
            <a
              href="#reviews"
              className="rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm hover:border-accent/50"
            >
              {ratingDisplay != null ? `${ratingDisplay.toFixed(1)} ★` : 'Valoraciones'} ·{' '}
              {reviewCountDisplay} {reviewCountDisplay === 1 ? 'reseña' : 'reseñas'}
            </a>
          ) : null}
        </div>
      </GastroPublicHero>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: getCategoryLabel('gastro'), href: getCategoryGatewayHref('gastro') },
            { label: location.displayName },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-8">
            <GastroAboutSection
              displayName={location.displayName}
              description={description}
              hasEditorialContent={hasEditorial}
            />

            <GastroDiscountsSection discounts={discounts} />

            {hasEditorial ? (
              <GastroLocationEditorialSection
                items={publishedContent}
                locationName={location.displayName}
              />
            ) : null}

            <GastroGallerySection images={galleryImages} />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <GastroContactCard whatsAppHref={whatsAppHref} />
            <GastroLocationCard
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
              contactEmail={location.contactEmail}
            />
            {!hasLocation && !whatsAppHref && !location.menuUrl && !location.websiteUrl ? (
              <p className="text-xs text-text-muted">
                El local puede actualizar horarios y contacto desde su portal gastronómico.
              </p>
            ) : null}
          </aside>
        </div>

        {reviewEventId ? (
          <>
            <div className="mt-12 scroll-mt-24" id="reviews">
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
                  averageRating: ratingDisplay,
                  validReviewCount: reviewCountDisplay,
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
        ) : (
          <section className="mt-12 rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-5 py-6">
            <h2 className="text-lg font-semibold text-text">Valoraciones</h2>
            <p className="mt-2 text-sm text-text-muted">
              Las reseñas no están disponibles para este local en este momento.
            </p>
          </section>
        )}

        {relatedLocations.length > 0 && reviewEventId ? (
          <GastroRelatedLocationsSection
            locations={relatedLocations}
            currentEventId={reviewEventId}
            tenantId={tenantId}
            title={getRelatedSectionTitle('gastro')}
          />
        ) : null}
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
