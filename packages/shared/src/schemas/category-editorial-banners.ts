import { z } from 'zod';
import { isSafeExternalHttpUrl } from './external-links';
import { contentMainCategorySchema } from './subcategories';

const BLOCKED_URL_PROTOCOL = /^(javascript|data|vbscript|file):/i;

export function isSafeCtaHref(value: string): boolean {
  const s = value.trim();
  if (!s || BLOCKED_URL_PROTOCOL.test(s)) return false;
  if (s.startsWith('/')) {
    return !s.startsWith('//');
  }
  return isSafeExternalHttpUrl(s);
}

export const safeCtaHrefOptionalSchema = z
  .string()
  .max(2048)
  .nullable()
  .optional()
  .or(z.literal('').transform(() => null))
  .transform((s) => {
    if (s == null) return null;
    const t = s.trim();
    return t || null;
  })
  .refine((s) => s == null || isSafeCtaHref(s), {
    message: 'Ingresá una ruta interna (/) o URL http(s) válida',
  });

export const categoryEditorialBannerIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type CategoryEditorialBannerIdParams = z.infer<
  typeof categoryEditorialBannerIdParamsSchema
>;

export const listCategoryEditorialBannersQuerySchema = z.object({
  category: contentMainCategorySchema,
});
export type ListCategoryEditorialBannersQuery = z.infer<
  typeof listCategoryEditorialBannersQuerySchema
>;

export const publicCategoryEditorialBannersQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  category: contentMainCategorySchema,
});
export type PublicCategoryEditorialBannersQuery = z.infer<
  typeof publicCategoryEditorialBannersQuerySchema
>;

export const categoryEditorialBannerItemSchema = z.object({
  id: z.string(),
  category: contentMainCategorySchema,
  title: z.string(),
  subtitle: z.string().nullable(),
  imageUrl: z.string().url(),
  imageObjectKey: z.string().nullable().optional(),
  ctaLabel: z.string().nullable(),
  ctaHref: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CategoryEditorialBannerItem = z.infer<typeof categoryEditorialBannerItemSchema>;

export const publicCategoryEditorialBannersResponseSchema = z.object({
  data: z.array(
    categoryEditorialBannerItemSchema.omit({
      isActive: true,
      createdAt: true,
      updatedAt: true,
      imageObjectKey: true,
    }),
  ),
});
export type PublicCategoryEditorialBannersResponse = z.infer<
  typeof publicCategoryEditorialBannersResponseSchema
>;

export const adminCategoryEditorialBannersResponseSchema = z.object({
  data: z.array(categoryEditorialBannerItemSchema),
});
export type AdminCategoryEditorialBannersResponse = z.infer<
  typeof adminCategoryEditorialBannersResponseSchema
>;

export const createCategoryEditorialBannerBodySchema = z
  .object({
    category: contentMainCategorySchema,
    title: z.string().trim().min(1).max(120),
    subtitle: z.string().trim().max(240).nullable().optional(),
    imageUrl: z.string().url(),
    imageObjectKey: z.string().trim().max(512).nullable().optional(),
    ctaLabel: z.string().trim().max(48).nullable().optional(),
    ctaHref: safeCtaHrefOptionalSchema,
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    const hasLabel = !!data.ctaLabel?.trim();
    const hasHref = !!data.ctaHref;
    if (hasLabel !== hasHref) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CTA requiere etiqueta y enlace juntos, o ninguno',
        path: ['ctaHref'],
      });
    }
  });
export type CreateCategoryEditorialBannerBody = z.infer<
  typeof createCategoryEditorialBannerBodySchema
>;

export const updateCategoryEditorialBannerBodySchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    subtitle: z.string().trim().max(240).nullable().optional(),
    imageUrl: z.string().url().optional(),
    imageObjectKey: z.string().trim().max(512).nullable().optional(),
    ctaLabel: z.string().trim().max(48).nullable().optional(),
    ctaHref: safeCtaHrefOptionalSchema,
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.ctaLabel !== undefined || data.ctaHref !== undefined) {
      const hasLabel = !!data.ctaLabel?.trim();
      const hasHref = !!data.ctaHref;
      if (hasLabel !== hasHref) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'CTA requiere etiqueta y enlace juntos, o ninguno',
          path: ['ctaHref'],
        });
      }
    }
  });
export type UpdateCategoryEditorialBannerBody = z.infer<
  typeof updateCategoryEditorialBannerBodySchema
>;

export const reorderCategoryEditorialBannerBodySchema = z.object({
  direction: z.enum(['up', 'down']),
});
export type ReorderCategoryEditorialBannerBody = z.infer<
  typeof reorderCategoryEditorialBannerBodySchema
>;
