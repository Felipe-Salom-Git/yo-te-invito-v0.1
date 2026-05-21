import { z } from 'zod';

/** Public review visibility / moderation lifecycle */
export const reviewPublicStatusSchema = z.enum([
  'VISIBLE',
  'IN_REVIEW',
  'HIDDEN',
  'REPORT_REJECTED',
  'DELETED_BY_USER',
]);
export type ReviewPublicStatus = z.infer<typeof reviewPublicStatusSchema>;

/** Statuses that count toward public averages and listings */
export const REVIEW_PUBLIC_VISIBLE_STATUSES: ReviewPublicStatus[] = [
  'VISIBLE',
  'REPORT_REJECTED',
];

/** Statuses excluded from public display */
export const REVIEW_PUBLIC_HIDDEN_STATUSES: ReviewPublicStatus[] = [
  'HIDDEN',
  'DELETED_BY_USER',
];

export const reviewReplyAuthorTypeSchema = z.enum([
  'PRODUCER',
  'GASTRO_OWNER',
  'HOTEL_OWNER',
  'PLATFORM_ADMIN',
]);
export type ReviewReplyAuthorType = z.infer<typeof reviewReplyAuthorTypeSchema>;

export const reviewReplyBodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

export type ReviewReplyBody = z.infer<typeof reviewReplyBodySchema>;

export const adminHideReviewSchema = z.object({
  reason: z.string().trim().min(3).max(500).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

export type AdminHideReviewInput = z.infer<typeof adminHideReviewSchema>;

export const adminRestoreReviewSchema = z.object({
  adminNote: z.string().trim().max(1000).optional(),
});

export type AdminRestoreReviewInput = z.infer<typeof adminRestoreReviewSchema>;
