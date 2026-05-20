import { z } from 'zod';
import { contentMainCategorySchema } from './subcategories';

export const categoryBannerCategoryParamsSchema = z.object({
  category: contentMainCategorySchema,
});
export type CategoryBannerCategoryParams = z.infer<typeof categoryBannerCategoryParamsSchema>;

export const getCategoryBannersQuerySchema = z.object({
  category: contentMainCategorySchema,
});
export type GetCategoryBannersQuery = z.infer<typeof getCategoryBannersQuerySchema>;

export const publicCategoryBannersQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  category: contentMainCategorySchema,
});
export type PublicCategoryBannersQuery = z.infer<typeof publicCategoryBannersQuerySchema>;

export const categoryBannerItemIdParamsSchema = z.object({
  category: contentMainCategorySchema,
  itemId: z.string().min(1),
});
export type CategoryBannerItemIdParams = z.infer<typeof categoryBannerItemIdParamsSchema>;

export const updateCategoryBannerItemInputSchema = z.object({
  eventId: z.string().min(1),
  position: z.number().int().min(1).max(5),
});

export const updateCategoryBannerItemsSchema = z.object({
  items: z.array(updateCategoryBannerItemInputSchema).max(5),
});
export type UpdateCategoryBannerItemsBody = z.infer<typeof updateCategoryBannerItemsSchema>;

export const categoryBannerResolvedItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  category: z.string().nullable(),
  subcategoryId: z.string().nullable().optional(),
  subcategoryName: z.string().nullable().optional(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  startAt: z.string(),
  position: z.number().optional(),
  isManual: z.boolean(),
});
export type CategoryBannerResolvedItem = z.infer<typeof categoryBannerResolvedItemSchema>;

export const publicCategoryBannerResponseSchema = z.object({
  mode: z.enum(['automatic', 'manual']),
  data: z.array(categoryBannerResolvedItemSchema),
});
export type PublicCategoryBannerResponse = z.infer<typeof publicCategoryBannerResponseSchema>;

export const adminCategoryBannerConfigItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  position: z.number(),
  isActive: z.boolean(),
  title: z.string(),
  coverImageUrl: z.string().nullable(),
  category: z.string().nullable(),
  status: z.string(),
  startAt: z.string(),
});

export const adminCategoryBannerConfigResponseSchema = z.object({
  mode: z.enum(['automatic', 'manual']),
  items: z.array(adminCategoryBannerConfigItemSchema),
});
export type AdminCategoryBannerConfigResponse = z.infer<
  typeof adminCategoryBannerConfigResponseSchema
>;
