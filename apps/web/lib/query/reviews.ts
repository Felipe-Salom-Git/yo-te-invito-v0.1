'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { PublicReviewCategory, PublicReviewListFilters } from '@yo-te-invito/shared';
import {
  DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
  publicReviewFiltersToQueryParams,
} from '@/lib/reviews/publicReviewListFilters';
import { reviewsKeys } from './keys';

const PAGE_SIZE = 10;

function filtersCacheKey(filters: PublicReviewListFilters): string {
  return JSON.stringify(publicReviewFiltersToQueryParams(filters));
}

export function usePublicEntityReviews(
  category: PublicReviewCategory,
  entityId: string,
  tenantId: string,
  page: number,
  filters: PublicReviewListFilters = DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
) {
  const repos = useRepositories();
  const fKey = filtersCacheKey(filters);

  return useQuery({
    queryKey: reviewsKeys.publicV2(category, entityId, tenantId, page, fKey),
    queryFn: () =>
      repos.reviews.listPublicV2(
        category,
        entityId,
        tenantId,
        page,
        PAGE_SIZE,
        publicReviewFiltersToQueryParams(filters),
      ),
    enabled: Boolean(entityId && tenantId),
  });
}

export function usePublicEntityReviewsState(
  category: PublicReviewCategory,
  entityId: string,
  tenantId: string,
) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PublicReviewListFilters>(
    DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
  );

  const setFiltersAndResetPage = useCallback((next: PublicReviewListFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const query = usePublicEntityReviews(category, entityId, tenantId, page, filters);

  return {
    page,
    setPage,
    filters,
    setFilters: setFiltersAndResetPage,
    ...query,
  };
}

export { PAGE_SIZE as publicReviewsPageSize };

const USER_REVIEWS_PAGE_SIZE = 10;

export function useUserPublicReviews(
  userId: string,
  tenantId: string,
  page: number,
  filters: PublicReviewListFilters = DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
) {
  const repos = useRepositories();
  const fKey = filtersCacheKey(filters);

  return useQuery({
    queryKey: reviewsKeys.userPublic(userId, tenantId, page, fKey),
    queryFn: () =>
      repos.reviews.listUserPublicReviews(
        userId,
        tenantId,
        page,
        USER_REVIEWS_PAGE_SIZE,
        publicReviewFiltersToQueryParams(filters),
      ),
    enabled: Boolean(userId && tenantId),
  });
}

export function useUserPublicReviewsState(userId: string, tenantId: string) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<PublicReviewListFilters>(
    DEFAULT_PUBLIC_REVIEW_LIST_FILTERS,
  );

  const setFiltersAndResetPage = useCallback((next: PublicReviewListFilters) => {
    setFilters(next);
    setPage(1);
  }, []);

  const query = useUserPublicReviews(userId, tenantId, page, filters);

  return {
    page,
    setPage,
    filters,
    setFilters: setFiltersAndResetPage,
    ...query,
  };
}

export { USER_REVIEWS_PAGE_SIZE as userPublicReviewsPageSize };
