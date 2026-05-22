import { z } from 'zod';
import { gastroDiscountStatusSchema } from './gastro-discounts';

export const gastroDashboardAlertSchema = z.enum([
  'EXPIRED_DISCOUNTS',
  'INACTIVE_DISCOUNTS',
  'MISSING_PUBLIC_CONTENT',
  'MISSING_MAIN_IMAGE',
]);
export type GastroDashboardAlert = z.infer<typeof gastroDashboardAlertSchema>;

export const gastroDashboardProfileSchema = z.object({
  id: z.string().nullable(),
  displayName: z.string().nullable(),
  status: z.string().nullable(),
  publicEventId: z.string().nullable(),
  hasMainImage: z.boolean(),
  publishedContentCount: z.number().int().nonnegative(),
});

export const gastroDashboardKpisSchema = z.object({
  activeDiscounts: z.number().int().nonnegative(),
  totalValidations: z.number().int().nonnegative(),
  validationsLast7Days: z.number().int().nonnegative(),
  reviewsPendingReply: z.number().int().nonnegative().nullable(),
});

export const gastroDashboardRecentValidationSchema = z.object({
  id: z.string(),
  discountId: z.string(),
  discountTitle: z.string(),
  validatedAt: z.string().datetime(),
});

export const gastroDashboardResponseSchema = z.object({
  profile: gastroDashboardProfileSchema,
  kpis: gastroDashboardKpisSchema,
  alerts: z.array(gastroDashboardAlertSchema),
  recentValidations: z.array(gastroDashboardRecentValidationSchema),
});
export type GastroDashboardResponse = z.infer<typeof gastroDashboardResponseSchema>;

export const gastroValidationListQuerySchema = z.object({
  discountId: z.string().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});
export type GastroValidationListQuery = z.infer<typeof gastroValidationListQuerySchema>;

export const gastroValidationListItemSchema = z.object({
  id: z.string(),
  discountId: z.string(),
  discountTitle: z.string(),
  discountStatus: gastroDiscountStatusSchema,
  validatedAt: z.string().datetime(),
});
export type GastroValidationListItem = z.infer<typeof gastroValidationListItemSchema>;

export const gastroValidationListResponseSchema = z.object({
  data: z.array(gastroValidationListItemSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});
export type GastroValidationListResponse = z.infer<typeof gastroValidationListResponseSchema>;
