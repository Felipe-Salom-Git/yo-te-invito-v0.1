'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviews } from '@/lib/query/reviews';
import { getCategoryLabel, getRelatedSectionTitle } from '@/lib/home/contentRoutes';
import { EventLocationModal } from '@/components/events/EventLocationModal';
import { EventReviewsSection } from '@/components/events/EventReviewsSection';
import { RelatedEventsSection } from '@/components/events/RelatedEventsSection';
import { ReviewForm, type ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';
import { useSession } from 'next-auth/react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useToast } from '@/components';
import { EventEngagementRow } from '@/components/events/EventEngagementRow';
import { getErrorMessage } from '@/lib/errors';
import {
  buildRentalGalleryOnlyImages,
  getRentalHeaderImageUrl,
} from '@/lib/rentals/productGallery';
import { RentalProductHero } from './RentalProductHero';
import { RentalGalleryThumbnails } from './RentalGalleryThumbnails';
import { RentalDescriptionBlock } from './RentalDescriptionBlock';
import { RentalLocalCard } from './RentalLocalCard';
import { RentalContactCard } from './RentalContactCard';
import type { RentalOpeningHours } from '@yo-te-invito/shared';

const WHATSAPP_NUMBER = '5491112345678';

type RentalLocationOnEvent = {
  id: string;
  name: string;
  address?: string | null;
  openingHours?: RentalOpeningHours | null;
  openingHoursNote?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
};

export type RentalProductDetailContentProps = {
  id: string;
  tenantId?: string;
};

export function RentalProductDetailContent({
  id,
  tenantId = 'tenant-demo',
}: RentalProductDetailContentProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const { data: event, isLoading, error } = useEventDetail(id, tenantId);

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', 'public', tenantId, 'rental'],
    queryFn: () => repos.subcategories.listPublic(tenantId, 'rental'),
    enabled: !!tenantId && !!event,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = usePublicEntityReviews(
    'rental',
    id,
    tenantId,
    reviewPage,
  );

  const { data: relatedData } = useQuery({
    queryKey: ['events', 'related', tenantId, 'rental'],
    queryFn: () =>
      repos.events.list({
        tenantId,
        category: 'rental',
        limit: 12,
      }),
    enabled: !!tenantId && !!event,
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
        queryKey: reviewsKeys.publicV2Entity('rental', id, tenantId),
      });
    },
  });

  const handleSubmitReview = (values: ReviewFormSubmitPayload) => {
    createMutation.mutate(values);
  };

  if (isLoading || !id) {
    return (
      <div className="min-h-screen bg-bg p-8">
        <div className="animate-pulse space-y-4">
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

  const rentalLoc = (event as { rentalLocation?: RentalLocationOnEvent | null }).rentalLocation;
  const subcategoryName =
    event.subcategoryId && subcategories
      ? subcategories.find((s) => s.id === event.subcategoryId)?.name
      : null;

  const headerImageUrl = getRentalHeaderImageUrl(event);
  const galleryImages = buildRentalGalleryOnlyImages(event);
  const hasGallery = galleryImages.length > 0;

  const locationVenueName = rentalLoc?.name ?? event.venueName;
  const locationAddress = rentalLoc?.address ?? event.venueAddress;
  const locationGeoLat = rentalLoc?.geoLat ?? event.geoLat;
  const locationGeoLng = rentalLoc?.geoLng ?? event.geoLng;
  const hasLocation =
    Boolean(locationAddress?.trim()) ||
    (locationGeoLat != null && locationGeoLng != null);

  const whatsAppHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, me interesa ${event.title}`,
  )}`;

  return (
    <div className="min-h-screen bg-bg">
      <RentalProductHero
        coverImageUrl={headerImageUrl}
        title={event.title}
        summary={event.summary}
        description={event.description}
        subcategoryName={subcategoryName}
        localName={rentalLoc?.name}
      >
        <EventEngagementRow eventId={id} />
      </RentalProductHero>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: getCategoryLabel('rental'), href: '/explore' },
            { label: event.title },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-8">
            <RentalDescriptionBlock
              productTitle={event.title}
              description={event.description}
            />

            {hasGallery && (
              <section>
                <h2 className="text-lg font-semibold text-white">Galería</h2>
                <div className="mt-4">
                  <RentalGalleryThumbnails images={galleryImages} />
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <RentalContactCard whatsAppHref={whatsAppHref} />
            {rentalLoc && (
              <RentalLocalCard
                name={rentalLoc.name}
                address={rentalLoc.address}
                openingHours={rentalLoc.openingHours}
                openingHoursNote={rentalLoc.openingHoursNote}
                hasLocation={hasLocation}
                onViewLocation={
                  hasLocation ? () => setIsLocationModalOpen(true) : undefined
                }
              />
            )}
          </aside>
        </div>

        <div className="mt-12" id="reviews">
          <EventReviewsSection
            eventId={id}
            tenantId={tenantId}
            category="rental"
            entityType="rental"
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

        <div className="mt-8">
          <ReviewForm
            key={reviewFormKey}
            entityType="rental"
            entityId={id}
            onSubmit={handleSubmitReview}
            isSubmitting={createMutation.isPending}
            canSubmit={!!session?.user}
          />
        </div>

        <div className="mt-12">
          <RelatedEventsSection
            events={relatedData?.data ?? []}
            currentEventId={id}
            tenantId={tenantId}
            title={getRelatedSectionTitle('rental')}
          />
        </div>
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
