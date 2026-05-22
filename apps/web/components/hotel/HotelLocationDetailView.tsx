'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRepositories } from '@/repositories/context';
import { eventsKeys } from '@/lib/query/events';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviewsState } from '@/lib/query/reviews';
import { useRecordPublicEventView } from '@/lib/query/public-engagement';
import { useHotelPublicLocation } from '@/lib/query/hotel-public-detail';
import { mapEventToPublicHotel } from '@/lib/hotel/mapEventToPublicHotel';
import { HotelPublicDetailContent } from '@/components/hotel/HotelPublicDetailContent';
import {
  HotelPublicDetailLoading,
  HotelPublicDetailError,
} from '@/components/hotel/HotelPublicDetailStates';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';

export type HotelLocationDetailViewProps = {
  tenantId?: string;
  eventId: string;
};

export function HotelLocationDetailView({
  tenantId = 'tenant-demo',
  eventId,
}: HotelLocationDetailViewProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [reviewFormKey, setReviewFormKey] = useState(0);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const {
    data: hotelFromApi,
    isLoading: hotelLoading,
    isError: hotelApiError,
  } = useHotelPublicLocation({ tenantId, eventId });

  const needEventFallback = hotelApiError && !hotelFromApi;
  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: eventsKeys.detail(eventId, tenantId),
    queryFn: () => repos.events.getDetail(eventId, tenantId),
    enabled: needEventFallback && !!eventId,
  });

  const hotel =
    hotelFromApi ??
    (event && (event.category ?? '').toLowerCase() === 'hotel'
      ? mapEventToPublicHotel(event, tenantId)
      : null);

  const reviewEventId = hotel?.publicEventId ?? eventId;
  useRecordPublicEventView(reviewEventId, tenantId, !!hotel && !!reviewEventId);

  const {
    data: reviewsData,
    isLoading: reviewsLoading,
    isError: reviewsError,
    refetch: refetchReviews,
    page: reviewPage,
    setPage: setReviewPage,
    filters: reviewFilters,
    setFilters: setReviewFilters,
  } = usePublicEntityReviewsState('hotel', reviewEventId, tenantId);

  const { data: session } = useSession();

  const createMutation = useMutation({
    mutationFn: (payload: ReviewFormSubmitPayload) =>
      repos.reviews.createPublic({
        eventId: reviewEventId,
        overallRating: payload.overallRating,
        aspectRatings: payload.aspectRatings,
        comment: payload.comment,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Valoración publicada', 'success');
      setReviewFormKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: eventsKeys.detail(reviewEventId, tenantId) });
      queryClient.invalidateQueries({
        queryKey: reviewsKeys.publicV2Entity('hotel', reviewEventId, tenantId),
      });
    },
  });

  if (!eventId) {
    return <HotelPublicDetailError />;
  }

  if (hotelLoading || (hotelApiError && eventLoading)) {
    return <HotelPublicDetailLoading />;
  }

  if (!hotel) {
    return <HotelPublicDetailError />;
  }

  return (
    <HotelPublicDetailContent
      hotel={hotel}
      tenantId={tenantId}
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
      reviewFormKey={reviewFormKey}
      isSubmittingReview={createMutation.isPending}
      onSubmitReview={(values) => createMutation.mutate(values)}
      canSubmitReview={!!session?.user}
      isLocationModalOpen={isLocationModalOpen}
      onLocationModalOpen={() => setIsLocationModalOpen(true)}
      onLocationModalClose={() => setIsLocationModalOpen(false)}
      reviewEventId={reviewEventId}
    />
  );
}
