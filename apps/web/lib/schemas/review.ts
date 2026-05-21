import { z } from 'zod';
import {
  REVIEW_ASPECT_LABELS_ES,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  type PublicReviewCategory,
} from '@yo-te-invito/shared';

const score1to10 = z.number().int().min(REVIEW_RATING_MIN).max(REVIEW_RATING_MAX);

export type EntityType =
  | 'restaurant'
  | 'producer'
  | 'excursion'
  | 'rental'
  | 'hotel'
  | 'event';

const ENTITY_TO_CATEGORY: Record<EntityType, PublicReviewCategory> = {
  restaurant: 'gastro',
  producer: 'event',
  excursion: 'excursion',
  rental: 'rental',
  hotel: 'hotel',
  event: 'event',
};

export function entityTypeToReviewCategory(entityType: EntityType): PublicReviewCategory {
  return ENTITY_TO_CATEGORY[entityType] ?? 'event';
}

export function getReviewSchema(entityType: EntityType) {
  const category = entityTypeToReviewCategory(entityType);
  const labels = getDimensionLabels(entityType);
  const shape: Record<string, typeof score1to10> = {};
  for (const key of Object.keys(labels)) {
    shape[key] = score1to10;
  }
  return z.object({
    ...shape,
    comment: z.string().min(10).max(2000),
    overallRating: score1to10.optional(),
  });
}

export function getDimensionLabels(entityType: EntityType): Record<string, string> {
  const category = entityTypeToReviewCategory(entityType);
  return REVIEW_ASPECT_LABELS_ES[category] ?? { score: 'Puntaje general' };
}

/** Legacy generic 1–5 — events without aspect breakdown in old UI */
export const reviewGenericSchema = z.object({
  score: z.number().min(1).max(5),
  comment: z.string().max(500).optional(),
});
