'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { PublicReviewCategory } from '@yo-te-invito/shared';
import { reviewsKeys } from './keys';

const PAGE_SIZE = 10;

export function usePublicEntityReviews(
  category: PublicReviewCategory,
  entityId: string,
  tenantId: string,
  page: number,
) {
  const repos = useRepositories();

  return useQuery({
    queryKey: reviewsKeys.publicV2(category, entityId, tenantId, page),
    queryFn: () =>
      repos.reviews.listPublicV2(category, entityId, tenantId, page, PAGE_SIZE),
    enabled: Boolean(entityId && tenantId),
  });
}

export { PAGE_SIZE as publicReviewsPageSize };
