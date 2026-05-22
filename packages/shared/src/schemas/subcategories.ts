import { z } from 'zod';

/** Main discovery categories (gateway + subcategory management) */
export const contentMainCategorySchema = z.enum([
  'event',
  'gastro',
  'rental',
  'excursion',
]);
export type ContentMainCategory = z.infer<typeof contentMainCategorySchema>;

/** Includes hotel for admin tabs (subcategories disabled) */
export const contentCategorySchema = z.enum([
  'event',
  'gastro',
  'rental',
  'excursion',
  'hotel',
]);
export type ContentCategory = z.infer<typeof contentCategorySchema>;

export const publicSubcategoriesQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  /** `hotel` accepted for Próximamente response (`comingSoon: true`, empty data). */
  category: contentCategorySchema,
});
export type PublicSubcategoriesQuery = z.infer<typeof publicSubcategoriesQuerySchema>;

export const adminSubcategoriesListQuerySchema = z.object({
  category: contentCategorySchema,
});
export type AdminSubcategoriesListQuery = z.infer<
  typeof adminSubcategoriesListQuerySchema
>;

export const subcategoryResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  category: contentCategorySchema,
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  iconName: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SubcategoryResponse = z.infer<typeof subcategoryResponseSchema>;

export const publicSubcategoriesListResponseSchema = z.object({
  data: z.array(
    subcategoryResponseSchema.omit({
      tenantId: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    }),
  ),
  comingSoon: z.literal(true).optional(),
});
export type PublicSubcategoriesListResponse = z.infer<
  typeof publicSubcategoriesListResponseSchema
>;

export const adminSubcategoriesListResponseSchema = z.object({
  data: z.array(subcategoryResponseSchema),
  /** Present when `category=hotel` — subcategory management disabled */
  comingSoon: z.literal(true).optional(),
});
export type AdminSubcategoriesListResponse = z.infer<
  typeof adminSubcategoriesListResponseSchema
>;

export const createSubcategoryBodySchema = z.object({
  category: contentMainCategorySchema,
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case')
    .optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  iconName: z.string().max(64).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type CreateSubcategoryBody = z.infer<typeof createSubcategoryBodySchema>;

export const updateSubcategoryBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  slug: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  description: z.string().max(500).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  iconName: z.string().max(64).nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});
export type UpdateSubcategoryBody = z.infer<typeof updateSubcategoryBodySchema>;

export const subcategoryIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type SubcategoryIdParams = z.infer<typeof subcategoryIdParamsSchema>;
