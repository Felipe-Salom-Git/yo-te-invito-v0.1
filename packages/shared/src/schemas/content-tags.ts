import { z } from 'zod';
import {
  CONTENT_TAG_DESCRIPTION_MAX_LENGTH,
  CONTENT_TAG_NAME_MAX_LENGTH,
  CONTENT_TAG_NAME_MIN_LENGTH,
  CONTENT_TAG_SLUG_MAX_LENGTH,
  MAX_CONTENT_TAGS_PER_PUBLICATION,
} from '../constants/content-tags';
import { contentCategorySchema } from './subcategories';

/** `all` = global tag; otherwise limited to one vertical. */
export const contentTagScopeSchema = z.union([
  z.literal('all'),
  contentCategorySchema,
]);
export type ContentTagScope = z.infer<typeof contentTagScopeSchema>;

export const contentTagPublicSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type ContentTagPublic = z.infer<typeof contentTagPublicSchema>;

export const contentTagAdminSchema = contentTagPublicSchema.extend({
  tenantId: z.string(),
  description: z.string().nullable(),
  categoryScope: contentTagScopeSchema.nullable(),
  isActive: z.boolean(),
  usageCount: z.number().int().min(0).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ContentTagAdmin = z.infer<typeof contentTagAdminSchema>;

export const publicContentTagsQuerySchema = z.object({
  tenantId: z.string().min(1),
  /** Filter tags applicable to this vertical (+ global). */
  category: contentCategorySchema.optional(),
});
export type PublicContentTagsQuery = z.infer<typeof publicContentTagsQuerySchema>;

export const adminContentTagsListQuerySchema = z.object({
  q: z.string().max(80).optional(),
  categoryScope: contentTagScopeSchema.optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type AdminContentTagsListQuery = z.infer<typeof adminContentTagsListQuerySchema>;

const tagSlugSchema = z
  .string()
  .min(1)
  .max(CONTENT_TAG_SLUG_MAX_LENGTH)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be lowercase kebab-case');

export const createContentTagBodySchema = z.object({
  name: z.string().min(CONTENT_TAG_NAME_MIN_LENGTH).max(CONTENT_TAG_NAME_MAX_LENGTH),
  slug: tagSlugSchema.optional(),
  description: z.string().max(CONTENT_TAG_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  categoryScope: contentTagScopeSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreateContentTagBody = z.infer<typeof createContentTagBodySchema>;

export const updateContentTagBodySchema = z.object({
  name: z.string().min(CONTENT_TAG_NAME_MIN_LENGTH).max(CONTENT_TAG_NAME_MAX_LENGTH).optional(),
  slug: tagSlugSchema.optional(),
  description: z.string().max(CONTENT_TAG_DESCRIPTION_MAX_LENGTH).nullable().optional(),
  categoryScope: contentTagScopeSchema.nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateContentTagBody = z.infer<typeof updateContentTagBodySchema>;

export const contentTagIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type ContentTagIdParams = z.infer<typeof contentTagIdParamsSchema>;

export const eventTagIdsSchema = z
  .array(z.string().min(1))
  .max(MAX_CONTENT_TAGS_PER_PUBLICATION);
export type EventTagIds = z.infer<typeof eventTagIdsSchema>;

export const adminContentTagsListResponseSchema = z.object({
  data: z.array(contentTagAdminSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type AdminContentTagsListResponse = z.infer<typeof adminContentTagsListResponseSchema>;

export const publicContentTagsListResponseSchema = z.object({
  data: z.array(contentTagPublicSchema),
});
export type PublicContentTagsListResponse = z.infer<typeof publicContentTagsListResponseSchema>;
