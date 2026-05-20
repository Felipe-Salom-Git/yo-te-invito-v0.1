import { z } from 'zod';
import { gastroDiscountStatusSchema } from './gastro-discounts';

export const adminGastroProfileStatusSchema = z.enum([
  'draft',
  'pending',
  'active',
  'rejected',
  'suspended',
]);
export type AdminGastroProfileStatus = z.infer<typeof adminGastroProfileStatusSchema>;

export const adminGastroLocationsListQuerySchema = z.object({
  search: z.string().max(200).optional(),
  status: adminGastroProfileStatusSchema.optional(),
  hasPendingDiscounts: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type AdminGastroLocationsListQuery = z.infer<typeof adminGastroLocationsListQuerySchema>;

export const adminGastroProfileIdParamsSchema = z.object({
  profileId: z.string().min(1),
});
export type AdminGastroProfileIdParams = z.infer<typeof adminGastroProfileIdParamsSchema>;

export const adminGastroDiscountIdParamsSchema = adminGastroProfileIdParamsSchema.extend({
  discountId: z.string().min(1),
});
export type AdminGastroDiscountIdParams = z.infer<typeof adminGastroDiscountIdParamsSchema>;

export const adminGastroOwnerSchema = z.object({
  userId: z.string().nullable(),
  name: z.string().nullable(),
  email: z.string().nullable(),
});
export type AdminGastroOwner = z.infer<typeof adminGastroOwnerSchema>;

export const adminGastroLocationListItemSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  status: adminGastroProfileStatusSchema,
  city: z.string().nullable(),
  province: z.string().nullable(),
  contactEmail: z.string().nullable(),
  contactPhone: z.string().nullable(),
  publicEventId: z.string().nullable(),
  owner: adminGastroOwnerSchema,
  discountsCount: z.number().int().min(0),
  pendingDiscountsCount: z.number().int().min(0),
  activeDiscountsCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type AdminGastroLocationListItem = z.infer<typeof adminGastroLocationListItemSchema>;

export const adminGastroLocationsListResponseSchema = z.object({
  data: z.array(adminGastroLocationListItemSchema),
  meta: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
});
export type AdminGastroLocationsListResponse = z.infer<
  typeof adminGastroLocationsListResponseSchema
>;

export const adminGastroLocationDetailSchema = adminGastroLocationListItemSchema.extend({
  summary: z.string().nullable(),
  address: z.string().nullable(),
  bannerUrl: z.string().nullable(),
  menuUrl: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  updatedAt: z.string().datetime(),
});
export type AdminGastroLocationDetail = z.infer<typeof adminGastroLocationDetailSchema>;

export const adminGastroDiscountListItemSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  status: gastroDiscountStatusSchema,
  discountDate: z.string().datetime().nullable(),
  validationCount: z.number().int().min(0),
  createdAt: z.string().datetime(),
});
export type AdminGastroDiscountListItem = z.infer<typeof adminGastroDiscountListItemSchema>;

export const adminGastroDiscountsListResponseSchema = z.object({
  data: z.array(adminGastroDiscountListItemSchema),
});
export type AdminGastroDiscountsListResponse = z.infer<typeof adminGastroDiscountsListResponseSchema>;

export const adminGastroPendingDiscountItemSchema = adminGastroDiscountListItemSchema.extend({
  profileId: z.string(),
  profileName: z.string(),
});
export type AdminGastroPendingDiscountItem = z.infer<typeof adminGastroPendingDiscountItemSchema>;

export const adminGastroPendingDiscountsResponseSchema = z.object({
  data: z.array(adminGastroPendingDiscountItemSchema),
});
export type AdminGastroPendingDiscountsResponse = z.infer<
  typeof adminGastroPendingDiscountsResponseSchema
>;

/** Query unificado (ruta estable en dev): listar por local, pendientes globales o detalle por id. */
export const adminGastroPendingDiscountsQuerySchema = z.object({
  profileId: z.string().min(1).optional(),
  discountId: z.string().min(1).optional(),
  includeAllStatuses: z.coerce.boolean().optional(),
});
export type AdminGastroPendingDiscountsQuery = z.infer<
  typeof adminGastroPendingDiscountsQuerySchema
>;

export const adminGastroDiscountDetailSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  eventId: z.string(),
  title: z.string().nullable(),
  summary: z.string().nullable(),
  detail: z.string().nullable(),
  discountDate: z.string().datetime().nullable(),
  status: gastroDiscountStatusSchema,
  submittedImageUrls: z.array(z.string()),
  displayImageUrls: z.array(z.string()),
  adminNotes: z.string().nullable(),
  rejectionReason: z.string().nullable(),
  qrToken: z.string().nullable(),
  emailSentAt: z.string().datetime().nullable(),
  emailSendError: z.string().nullable(),
  ownerEmail: z.string().nullable(),
  ownerPhone: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AdminGastroDiscountDetail = z.infer<typeof adminGastroDiscountDetailSchema>;

export const adminGastroDiscountMetricsSchema = z.object({
  validationCount: z.number().int().min(0),
  status: gastroDiscountStatusSchema,
  discountDate: z.string().datetime().nullable(),
  emailSentAt: z.string().datetime().nullable(),
  lastValidationAt: z.string().datetime().nullable(),
});
export type AdminGastroDiscountMetrics = z.infer<typeof adminGastroDiscountMetricsSchema>;

export const adminGastroDiscountPublicationSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().min(1).max(500),
  detail: z.string().min(1).max(5000),
  displayImageUrls: z.array(z.string().min(1).max(2_000_000)).max(30),
});
export type AdminGastroDiscountPublication = z.infer<typeof adminGastroDiscountPublicationSchema>;
