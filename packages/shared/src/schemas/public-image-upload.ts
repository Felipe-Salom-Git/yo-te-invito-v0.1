import { z } from 'zod';

export const uploadScopeSchema = z.enum([
  'event',
  'producer',
  'gastro',
  'rental',
  'hotel',
  'excursion',
  'platform',
]);

export const uploadPurposeSchema = z.enum([
  'cover',
  'gallery',
  'profile',
  'logo',
  'banner',
  'content',
]);

const ENTITY_SCOPES = new Set([
  'event',
  'producer',
  'gastro',
  'rental',
  'hotel',
  'excursion',
]);

const entityIdSchema = z
  .string()
  .trim()
  .min(1, 'entityId is required')
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'entityId contains invalid characters');

export const publicImageUploadFieldsSchema = z
  .object({
    scope: uploadScopeSchema,
    purpose: uploadPurposeSchema,
    entityId: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    if (ENTITY_SCOPES.has(data.scope)) {
      const parsed = entityIdSchema.safeParse(data.entityId ?? '');
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({ ...issue, path: ['entityId'] });
        }
      }
      return;
    }

    if (data.scope === 'platform') {
      if (data.purpose !== 'banner' && data.purpose !== 'logo') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'platform scope only supports purpose banner or logo in V1',
          path: ['purpose'],
        });
      }
      if (data.entityId?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'entityId must not be set for platform uploads',
          path: ['entityId'],
        });
      }
    }
  });

export const publicImageUploadResponseSchema = z.object({
  url: z.string().url(),
  objectKey: z.string().min(1),
  bucket: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().int().nonnegative(),
});

export type UploadScope = z.infer<typeof uploadScopeSchema>;
export type UploadPurpose = z.infer<typeof uploadPurposeSchema>;
export type PublicImageUploadFields = z.infer<typeof publicImageUploadFieldsSchema>;
export type PublicImageUploadResponse = z.infer<typeof publicImageUploadResponseSchema>;
