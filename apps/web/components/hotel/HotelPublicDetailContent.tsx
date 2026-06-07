'use client';

import type { PublicReviewListFilters, PublicReviewItemV2 } from '@yo-te-invito/shared';
import { buildHotelGalleryImages } from '@/lib/hotel/hotelPublicGallery';
import { buildHotelTelHref, buildHotelWhatsAppHref } from '@/lib/hotel/hotelPublicContact';
import { hasPublicLocationForMapLink } from '@/lib/maps';
import { HotelPublicHero } from '@/components/hotel/HotelPublicHero';
import { HotelContactCard } from '@/components/hotel/HotelContactCard';
import { HotelLinksCard } from '@/components/hotel/HotelLinksCard';
import { HotelAmenitiesSection } from '@/components/hotel/HotelAmenitiesSection';
import { GastroGallerySection } from '@/components/gastro/GastroGallerySection';
import { GastroLocationCard } from '@/components/gastro/GastroLocationCard';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import type { PublicHotelLocation } from '@/repositories/interfaces';
import { formatPublicRatingLabel } from '@/lib/reviews/ratingDisplay';

export type HotelPublicDetailContentProps = {
  hotel: PublicHotelLocation;
  tenantId: string;
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
  reviewFormKey: number;
  isSubmittingReview: boolean;
  onSubmitReview: (values: ReviewFormSubmitPayload) => void;
  canSubmitReview?: boolean;
  isLocationModalOpen: boolean;
  onLocationModalOpen: () => void;
  onLocationModalClose: () => void;
  /** Evento público vinculado (reviews); puede ser id de fallback. */
  reviewEventId: string;
};

export function HotelPublicDetailContent({
  hotel,
  tenantId,
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
  reviewFormKey,
  isSubmittingReview,
  onSubmitReview,
  canSubmitReview = true,
  isLocationModalOpen,
  onLocationModalOpen,
  onLocationModalClose,
  reviewEventId,
}: HotelPublicDetailContentProps) {
  const galleryImages = buildHotelGalleryImages(
    hotel.bannerUrl,
    hotel.logoUrl,
    hotel.galleryUrls,
  );
  const hasLocation = hasPublicLocationForMapLink({
    address: hotel.address,
    city: hotel.city,
    venueName: hotel.displayName,
    geoLat: hotel.geoLat,
    geoLng: hotel.geoLng,
  });
  const whatsAppHref = buildHotelWhatsAppHref(
    hotel.displayName,
    hotel.whatsappPhone,
    hotel.contactPhone,
  );
  const telHref = buildHotelTelHref(hotel.contactPhone);

  const ratingDisplay = reviewsSummary.averageRating ?? hotel.ratingAvg ?? null;
  const reviewCountDisplay =
    reviewsSummary.validReviewCount > 0
      ? reviewsSummary.validReviewCount
      : (hotel.ratingCount ?? 0);

  return (
    <div className="min-h-screen bg-bg pb-10">
      <HotelPublicHero
        coverImageUrl={hotel.bannerUrl}
        logoUrl={hotel.logoUrl}
        title={hotel.displayName}
        description={hotel.description}
        starCategory={hotel.starCategory}
        city={hotel.city}
      >
        {reviewCountDisplay > 0 ? (
          <a
            href="#reviews"
            className="inline-flex rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-sm text-white/90 backdrop-blur-sm hover:border-accent/50"
          >
            {ratingDisplay != null
              ? `${formatPublicRatingLabel(ratingDisplay) ?? ratingDisplay.toFixed(1)} ★`
              : 'Valoraciones'}{' '}
            ·{' '}
            {reviewCountDisplay} {reviewCountDisplay === 1 ? 'reseña' : 'reseñas'}
          </a>
        ) : null}
      </HotelPublicHero>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: 'Hoteles', href: '/hoteles' },
            { label: hotel.displayName },
          ]}
        />

        <p className="mt-4 max-w-2xl text-sm text-text-muted">
          Ficha informativa. Las reservas y el pago de alojamiento no están disponibles en Yo Te
          Invito.
        </p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-8">
            {hotel.description?.trim() ? (
              <section>
                <h2 className="text-lg font-semibold text-text">Sobre el establecimiento</h2>
                <p className="mt-3 whitespace-pre-wrap leading-relaxed text-text-muted">
                  {hotel.description.trim()}
                </p>
              </section>
            ) : null}

            <HotelAmenitiesSection amenities={hotel.amenities} />

            {galleryImages.length > 0 ? (
              <GastroGallerySection images={galleryImages} />
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <HotelContactCard
              whatsAppHref={whatsAppHref}
              telHref={telHref}
              contactEmail={hotel.contactEmail}
            />
            <GastroLocationCard
              name={hotel.displayName}
              address={hotel.address}
              openingHours={null}
              openingHoursNote={null}
              hasLocation={hasLocation}
              onViewLocation={hasLocation ? onLocationModalOpen : undefined}
            />
            <HotelLinksCard
              websiteUrl={hotel.websiteUrl}
              bookingUrl={hotel.bookingUrl}
              socialLinks={hotel.socialLinks ?? null}
            />
          </aside>
        </div>

        <div className="mt-12 scroll-mt-24" id="reviews">
          <EventReviewsSection
            eventId={reviewEventId}
            tenantId={tenantId}
            category="hotel"
            entityType="hotel"
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
            entityType="hotel"
            entityId={reviewEventId}
            onSubmit={onSubmitReview}
            isSubmitting={isSubmittingReview}
            canSubmit={canSubmitReview}
          />
        </div>
      </div>

      <EventLocationModal
        isOpen={isLocationModalOpen}
        onClose={onLocationModalClose}
        venueName={hotel.displayName}
        venueAddress={hotel.address}
        city={hotel.city}
        geoLat={hotel.geoLat}
        geoLng={hotel.geoLng}
      />
    </div>
  );
}
