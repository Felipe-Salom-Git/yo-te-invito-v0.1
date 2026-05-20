import { z } from 'zod';

export const inboxItemKindSchema = z.enum([
  'GASTRO_PROMOTION_REQUEST',
  'REVIEW_MODERATION_REQUEST',
  'REVIEW_DISPUTE_REQUEST',
]);
export type InboxItemKind = z.infer<typeof inboxItemKindSchema>;

export const inboxItemStatusSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']);
export type InboxItemStatus = z.infer<typeof inboxItemStatusSchema>;

/** https URL or compressed data:image/* from client upload */
const promoImageRefSchema = z
  .string()
  .min(1)
  .max(900_000)
  .refine(
    (s) =>
      /^https?:\/\//i.test(s.trim()) ||
      s.trim().startsWith('data:image/'),
    'Each image must be an https URL or a data URL image',
  );

export const createGastroPromotionRequestBodySchema = z.object({
  eventId: z.string().min(1),
  promotionTitle: z.string().min(1).max(200),
  promotionDescription: z.string().max(5000).optional(),
  contactPhones: z.array(z.string().min(1)).min(1).max(10),
  imageUrls: z.array(promoImageRefSchema).max(6).optional().default([]),
  notesForAdmin: z.string().max(2000).optional(),
  suggestedDiscountType: z.enum(['PERCENT', 'FIXED']).optional(),
  suggestedValue: z.number().positive().optional(),
});
export type CreateGastroPromotionRequestBody = z.infer<typeof createGastroPromotionRequestBodySchema>;

export const gastroPromotionStoredPayloadSchema = createGastroPromotionRequestBodySchema.extend({
  gastroProfileId: z.string().min(1),
});
export type GastroPromotionStoredPayload = z.infer<typeof gastroPromotionStoredPayloadSchema>;

export const reviewModerationRequestTypeSchema = z.enum(['HIDE_FROM_PUBLIC', 'OFFICIAL_REPLY', 'BOTH']);
export type ReviewModerationRequestType = z.infer<typeof reviewModerationRequestTypeSchema>;

export const createReviewModerationRequestBodySchema = z.object({
  reviewId: z.string().min(1),
  requestType: reviewModerationRequestTypeSchema,
  reason: z.string().min(1).max(2000),
  proposedReply: z.string().max(2000).optional(),
});
export type CreateReviewModerationRequestBody = z.infer<typeof createReviewModerationRequestBodySchema>;

export const adminInboxListQuerySchema = z.object({
  status: inboxItemStatusSchema.optional(),
  kind: inboxItemKindSchema.optional(),
});
export type AdminInboxListQuery = z.infer<typeof adminInboxListQuerySchema>;

export const adminResolveInboxBodySchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    note: z.string().max(2000).optional(),
    discount: z
      .object({
        code: z.string().min(1).max(40),
        type: z.enum(['PERCENT', 'FIXED']),
        value: z.number().positive(),
        validFrom: z.string().datetime().optional(),
        validTo: z.string().datetime().optional(),
      })
      .optional(),
    /** When approving gastro promo without manual `discount`, apply this validity window to the auto-generated code. */
    promotionValidFrom: z.string().datetime().optional(),
    promotionValidTo: z.string().datetime().optional(),
    officialReply: z.string().max(2000).optional(),
  })
  .superRefine((val, ctx) => {
    if (val.discount && val.discount.type === 'PERCENT' && val.discount.value > 100) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Percent discount cannot exceed 100', path: ['discount', 'value'] });
    }
  });
export type AdminResolveInboxBody = z.infer<typeof adminResolveInboxBodySchema>;

export const inboxItemResponseSchema = z.object({
  id: z.string(),
  kind: inboxItemKindSchema,
  status: inboxItemStatusSchema,
  title: z.string(),
  summary: z.string().nullable(),
  payload: z.unknown(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable(),
  resolutionNote: z.string().nullable(),
});
export type InboxItemResponse = z.infer<typeof inboxItemResponseSchema>;
