import { z } from 'zod';

/** https URL o data:image/* (portal; storage S3 pendiente — ver checklist § Storage). */
export const gastroContentImageRefSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (s) =>
      /^https?:\/\//i.test(s.trim()) ||
      s.trim().startsWith('data:image/'),
    'La imagen debe ser una URL https o un archivo de imagen válido',
  );

const optionalImageRef = gastroContentImageRefSchema.nullable().optional().or(
  z.literal('').transform(() => null),
);

export const gastroContentTypeSchema = z.enum(['editorial', 'image']);
export type GastroContentType = z.infer<typeof gastroContentTypeSchema>;

export const gastroContentStatusSchema = z.enum(['draft', 'published', 'inactive']);
export type GastroContentStatus = z.infer<typeof gastroContentStatusSchema>;

export const gastroContentResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  gastroProfileId: z.string(),
  type: gastroContentTypeSchema,
  title: z.string().nullable(),
  body: z.string().nullable(),
  imageUrl: z.string().nullable(),
  sortOrder: z.number().int(),
  status: gastroContentStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type GastroContentResponse = z.infer<typeof gastroContentResponseSchema>;

export const gastroContentCreateSchema = z
  .object({
    type: gastroContentTypeSchema,
    title: z.string().max(200).nullable().optional(),
    body: z.string().max(20_000).nullable().optional(),
    imageUrl: optionalImageRef,
    sortOrder: z.number().int().min(0).max(999).optional(),
    status: gastroContentStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'image' && !data.imageUrl?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las publicaciones de tipo imagen requieren imageUrl',
        path: ['imageUrl'],
      });
    }
    if (data.type === 'editorial' && !data.title?.trim() && !data.body?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'El contenido editorial requiere título o descripción',
        path: ['body'],
      });
    }
  });
export type GastroContentCreateInput = z.infer<typeof gastroContentCreateSchema>;

export const gastroContentUpdateSchema = z
  .object({
    type: gastroContentTypeSchema.optional(),
    title: z.string().max(200).nullable().optional(),
    body: z.string().max(20_000).nullable().optional(),
    imageUrl: optionalImageRef,
    sortOrder: z.number().int().min(0).max(999).optional(),
    status: gastroContentStatusSchema.optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: 'At least one field required' });
export type GastroContentUpdateInput = z.infer<typeof gastroContentUpdateSchema>;

export const publicGastroContentItemSchema = gastroContentResponseSchema.omit({
  gastroProfileId: true,
});
export type PublicGastroContentItem = z.infer<typeof publicGastroContentItemSchema>;
