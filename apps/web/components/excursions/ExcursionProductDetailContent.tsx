'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useEventDetail, eventsKeys } from '@/lib/query/events';
import { useRecordPublicEventView } from '@/lib/query/public-engagement';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviewsState } from '@/lib/query/reviews';
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
import { RentalDescriptionBlock } from '@/components/rentals/RentalDescriptionBlock';
import { RentalGalleryThumbnails } from '@/components/rentals/RentalGalleryThumbnails';
import { buildExcursionWhatsAppHref } from '@/lib/excursions/whatsapp';
import { ExcursionProductHero } from './ExcursionProductHero';
import { ExcursionOperatorCard } from './ExcursionOperatorCard';
import { ExcursionContactCard } from './ExcursionContactCard';
import { ExcursionDetailInfoGrid } from './ExcursionDetailInfoGrid';
import { ExcursionDetailSectionHeading } from './ExcursionDetailSectionHeading';
import { PublicExternalLinksCard } from '@/components/public/PublicExternalLinksCard';
import { ExcursionSchedulePublicSections } from './ExcursionSchedulePublicSections';
import {
  formatExcursionLocationLabel,
  resolveExcursionPublicLocation,
} from '@/lib/excursions/publicLocation';
import type { EntitySocialLinks, ExcursionSchedulePublic } from '@yo-te-invito/shared';
import type { RentalOpeningHours } from '@yo-te-invito/shared';

type ExcursionOperatorOnEvent = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  openingHours?: RentalOpeningHours | null;
  openingHoursNote?: string | null;
  contactPhone?: string | null;
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  socialLinks?: EntitySocialLinks | null;
  geoLat?: number | null;
  geoLng?: number | null;
};

export type ExcursionProductDetailContentProps = {
  id: string;
  tenantId?: string;
};

export function ExcursionProductDetailContent({
  id,
  tenantId = 'tenant-demo',
}: ExcursionProductDetailContentProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const { data: event, isLoading, error } = useEventDetail(id, tenantId);
  useRecordPublicEventView(id, tenantId, !!event && event.status === 'APPROVED');

  const { data: subcategories } = useQuery({
    queryKey: ['subcategories', 'public', tenantId, 'excursion'],
    queryFn: () => repos.subcategories.listPublic(tenantId, 'excursion'),
    enabled: !!tenantId && !!event,
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
  } = usePublicEntityReviewsState('excursion', id, tenantId);

  const { data: relatedData } = useQuery({
    queryKey: ['events', 'related', tenantId, 'excursion'],
    queryFn: () =>
      repos.events.list({
        tenantId,
        category: 'excursion',
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
        queryKey: reviewsKeys.publicV2Entity('excursion', id, tenantId),
      });
    },
  });

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

  const operator = (event as { excursionOperator?: ExcursionOperatorOnEvent | null })
    .excursionOperator;
  const eventSubcategories = event.subcategories?.length
    ? event.subcategories
    : event.subcategoryId && subcategories
      ? (() => {
          const name = subcategories.find((s) => s.id === event.subcategoryId)?.name;
          return name ? [{ id: event.subcategoryId!, name, isPrimary: true }] : [];
        })()
      : [];
  const subcategoryNames = eventSubcategories.map((s) => s.name).filter(Boolean);
  const subcategoryName = subcategoryNames[0] ?? null;

  const headerImageUrl = getRentalHeaderImageUrl(event);
  const galleryImages = buildRentalGalleryOnlyImages(event);
  const hasGallery = galleryImages.length > 0;

  const resolvedLocation = resolveExcursionPublicLocation(event, operator);
  const locationVenueName = resolvedLocation.venueName;
  const locationAddress = resolvedLocation.address;
  const locationCity = resolvedLocation.city;
  const locationGeoLat = resolvedLocation.geoLat;
  const locationGeoLng = resolvedLocation.geoLng;
  const hasLocation = resolvedLocation.hasLocation;
  const locationLabel = formatExcursionLocationLabel(resolvedLocation);
  const schedule = (event as { excursionSchedule?: ExcursionSchedulePublic | null })
    .excursionSchedule;
  const locationSourceNote = !resolvedLocation.usesEventLocation && operator
    ? 'Ubicación del operador. La excursión puede tener punto de encuentro propio más abajo.'
    : null;

  const whatsAppHref = buildExcursionWhatsAppHref(operator?.contactPhone, event.title);

  const showOperatorCard =
    operator != null ||
    Boolean(event.venueName?.trim()) ||
    Boolean(event.venueAddress?.trim()) ||
    Boolean(event.city?.trim());

  return (
    <div className="min-h-screen bg-bg">
      <ExcursionProductHero
        coverImageUrl={headerImageUrl}
        title={event.title}
        summary={event.summary}
        description={event.description}
        subcategoryName={subcategoryName}
        operatorName={operator?.name ?? event.venueName}
      >
        <EventEngagementRow eventId={id} />
      </ExcursionProductHero>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <Breadcrumbs
          items={[
            { label: 'Inicio', href: '/home' },
            { label: getCategoryLabel('excursion'), href: '/categoria/excursion' },
            { label: event.title },
          ]}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.65fr,1fr] lg:items-start lg:gap-10">
          <div className="min-w-0 space-y-10">
            <ExcursionDetailInfoGrid
              subcategoryName={subcategoryName}
              subcategoryNames={subcategoryNames}
              operatorName={operator?.name ?? event.venueName}
              departureTime={schedule?.departureTime}
              durationText={schedule?.durationText}
            />

            <div className="h-px bg-gradient-to-r from-accent/60 via-white/10 to-transparent" aria-hidden />

            <ExcursionSchedulePublicSections
              schedule={schedule}
              locationLabel={locationLabel}
              hasLocation={hasLocation}
              onViewLocation={hasLocation ? () => setIsLocationModalOpen(true) : undefined}
              locationSourceNote={locationSourceNote}
            />

            <div className="h-px bg-gradient-to-r from-accent/60 via-white/10 to-transparent" aria-hidden />

            <section className="space-y-4">
              <ExcursionDetailSectionHeading title="Sobre la excursión" />
              <RentalDescriptionBlock productTitle={event.title} description={event.description} />
            </section>

            {hasGallery && (
              <section className="space-y-4">
                <ExcursionDetailSectionHeading title="Galería" />
                <RentalGalleryThumbnails images={galleryImages} />
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-8">
            <ExcursionContactCard whatsAppHref={whatsAppHref} />
            <PublicExternalLinksCard
              title="Reservas y redes"
              websiteUrl={operator?.websiteUrl}
              bookingUrl={operator?.bookingUrl}
              socialLinks={operator?.socialLinks}
            />
            {showOperatorCard && (
              <ExcursionOperatorCard
                name={operator?.name ?? event.venueName ?? 'Operador'}
                address={locationAddress}
                city={locationCity}
                openingHours={operator?.openingHours}
                openingHoursNote={operator?.openingHoursNote}
                hasLocation={hasLocation}
                onViewLocation={hasLocation ? () => setIsLocationModalOpen(true) : undefined}
              />
            )}
          </aside>
        </div>

        <div className="mt-12" id="reviews">
          <EventReviewsSection
            eventId={id}
            tenantId={tenantId}
            category="excursion"
            entityType="excursion"
            reviews={reviewsData?.reviews ?? []}
            total={reviewsData?.total ?? 0}
            page={reviewPage}
            onPageChange={setReviewPage}
            filters={reviewFilters}
            onFiltersChange={setReviewFilters}
            onSubmitReview={(values) => createMutation.mutate(values)}
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

        <div className="mt-8">
          <ReviewForm
            key={reviewFormKey}
            entityType="excursion"
            entityId={id}
            onSubmit={(values) => createMutation.mutate(values)}
            isSubmitting={createMutation.isPending}
            canSubmit={!!session?.user}
          />
        </div>

        <div className="mt-12">
          <RelatedEventsSection
            events={relatedData?.data ?? []}
            currentEventId={id}
            tenantId={tenantId}
            title={getRelatedSectionTitle('excursion')}
          />
        </div>
      </div>

      <EventLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        venueName={locationVenueName}
        venueAddress={locationAddress}
        city={locationCity}
        geoLat={locationGeoLat}
        geoLng={locationGeoLng}
      />
    </div>
  );
}
