import type { Prisma, Review, ReviewPublicStatus } from '@prisma/client';
import type {
  PublicReviewCategory,
  PublicReviewItemV2,
  ReviewPublicStatus as SharedReviewPublicStatus,
  UserReviewerTier,
} from '@yo-te-invito/shared';
import {
  REVIEW_PUBLIC_VISIBLE_STATUSES,
  publicReviewCategorySchema,
} from '@yo-te-invito/shared';

/** Prisma filter for reviews shown on public entity pages */
export const publicReviewVisibleWhere: Prisma.ReviewWhereInput = {
  hiddenFromPublic: false,
  status: { in: REVIEW_PUBLIC_VISIBLE_STATUSES as ReviewPublicStatus[] },
};

export function eventCategoryToReviewCategory(
  category: string | null | undefined,
): PublicReviewCategory {
  const parsed = publicReviewCategorySchema.safeParse(category ?? 'event');
  return parsed.success ? parsed.data : 'event';
}

export function legacyScoreFromOverall(overallRating: number): number {
  return Math.min(5, Math.max(1, Math.round(overallRating / 2)));
}

export function overallFromLegacyScore(score: number): number {
  return Math.min(10, Math.max(1, score * 2));
}

export function readOverallRating(review: Pick<Review, 'overallRating' | 'score'>): number {
  if (review.overallRating != null) return review.overallRating;
  return overallFromLegacyScore(review.score);
}

export function readAspectRatings(
  review: Pick<Review, 'aspectRatings'>,
): Record<string, number> {
  if (!review.aspectRatings || typeof review.aspectRatings !== 'object') {
    return {};
  }
  return review.aspectRatings as Record<string, number>;
}

export function syncHiddenFlags(status: ReviewPublicStatus): {
  hiddenFromPublic: boolean;
} {
  return {
    hiddenFromPublic: status === 'HIDDEN' || status === 'DELETED_BY_USER',
  };
}

export function mapReviewStatus(
  status: ReviewPublicStatus,
): SharedReviewPublicStatus {
  return status as SharedReviewPublicStatus;
}

export type ReviewWithRelations = Review & {
  event: { id: string; title: string; category: string | null };
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
};

export function buildPublicReviewItem(
  review: ReviewWithRelations,
  author: { displayName: string; reviewerTier: UserReviewerTier },
  reply: PublicReviewItemV2['reply'],
): PublicReviewItemV2 {
  const category = eventCategoryToReviewCategory(review.event.category);
  const userId = review.userId ?? review.user?.id ?? '';
  return {
    id: review.id,
    category,
    entityId: review.eventId,
    entityTitle: review.event.title,
    overallRating: readOverallRating(review),
    aspectRatings: readAspectRatings(review),
    comment: review.comment,
    title: review.title,
    status: mapReviewStatus(review.status),
    isVerified: review.isVerified,
    author: {
      userId,
      displayName: author.displayName,
      avatarUrl: review.user?.avatarUrl ?? null,
      reviewerTier: author.reviewerTier,
    },
    reply,
    createdAt: review.createdAt.toISOString(),
    legacyScore: review.score,
  };
}
