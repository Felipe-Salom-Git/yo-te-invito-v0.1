'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { eventsKeys } from '@/lib/query/events';
import { reviewsKeys } from '@/lib/query/keys';
import { usePublicEntityReviewsState } from '@/lib/query/reviews';
import { useRecordPublicEventView } from '@/lib/query/public-engagement';
import {
  useGastroPublicLocation,
  useGastroPublicDiscounts,
} from '@/lib/query/gastro-public-detail';
import { GastroPublicDetailContent } from './GastroPublicDetailContent';
import { GastroPublicDetailLoading, GastroPublicDetailError } from './GastroPublicDetailStates';
import { useSession } from 'next-auth/react';
import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import type { ReviewFormSubmitPayload } from '@/components/reviews/ReviewForm';

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

  const {
    data: location,
    isLoading,
    isError,
  } = useGastroPublicLocation({ tenantId, locationId, eventId });

  const resolvedLocationId = location?.id;
  const reviewEventId = location?.publicEventId ?? eventId;
  useRecordPublicEventView(reviewEventId ?? undefined, tenantId, !!reviewEventId && !!location);

  const { data: discountsData } = useGastroPublicDiscounts(
    resolvedLocationId,
    tenantId,
    !!resolvedLocationId,
  );

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
    return <GastroPublicDetailLoading />;
  }

  if (isError || !location) {
    return <GastroPublicDetailError />;
  }

  return (
    <GastroPublicDetailContent
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
      relatedLocations={relatedData?.data ?? []}
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
