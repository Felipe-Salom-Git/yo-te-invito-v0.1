import { z } from 'zod';
import { producerReviewReplyFilterSchema } from './review-disputes';

/** Sort for public entity/user review lists (no oldest — use managed portal for full set). */
export const publicReviewListSortSchema = z
  .enum(['newest', 'highest', 'lowest'])
  .optional()
  .default('newest');
export type PublicReviewListSort = z.infer<typeof publicReviewListSortSchema>;

/** Sort for managed producer/gastro/hotel review lists. */
export const reviewListSortSchema = z
  .enum(['newest', 'oldest', 'highest', 'lowest'])
  .optional()
  .default('newest');
export type ReviewListSort = z.infer<typeof reviewListSortSchema>;

export const publicReviewListFiltersSchema = z.object({
  sort: publicReviewListSortSchema,
  replyFilter: producerReviewReplyFilterSchema.optional().default('ALL'),
  overallRating: z.coerce.number().int().min(1).max(10).optional(),
});
export type PublicReviewListFilters = z.infer<typeof publicReviewListFiltersSchema>;
