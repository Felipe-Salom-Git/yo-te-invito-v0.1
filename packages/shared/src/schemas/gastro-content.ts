import { z } from 'zod';

/** Max images per GastroContent post (aligned with GastroProfile.galleryUrls). */
export const GASTRO_CONTENT_GALLERY_MAX = 30;

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

export const gastroContentGalleryUrlsSchema = z
  .array(gastroContentImageRefSchema)
  .max(GASTRO_CONTENT_GALLERY_MAX);

export function normalizeGastroContentGalleryUrls(urls: unknown): string[] {
  if (!Array.isArray(urls)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const u of urls) {
    if (typeof u !== 'string') continue;
    const t = u.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= GASTRO_CONTENT_GALLERY_MAX) break;
  }
  return out;
}

/**
 * Canonical ordered gallery for a content row.
 * Prefer `galleryUrls`; fall back to legacy single `imageUrl`.
 */
export function resolveGastroContentGalleryUrls(input: {
  imageUrl?: string | null;
  galleryUrls?: unknown;
}): string[] {
  const fromGallery = normalizeGastroContentGalleryUrls(input.galleryUrls);
  if (fromGallery.length > 0) return fromGallery;
  const legacy = input.imageUrl?.trim();
  return legacy ? [legacy] : [];
}

/** Cover image for clients that still read `imageUrl` (first gallery entry). */
export function resolveGastroContentCoverImageUrl(input: {
  imageUrl?: string | null;
  galleryUrls?: unknown;
}): string | null {
  return resolveGastroContentGalleryUrls(input)[0] ?? null;
}

/**
 * Merge write payload with existing row for persistence.
 * - Explicit `galleryUrls` wins (including empty clear).
 * - Else if only `imageUrl` changes, rebuild gallery from cover (or keep existing gallery with cover swap).
 * - Keeps `imageUrl` = first gallery entry for legacy readers.
 */
export function prepareGastroContentGalleryWrite(input: {
  imageUrl?: string | null | undefined;
  galleryUrls?: string[] | null | undefined;
  existingImageUrl?: string | null;
  existingGalleryUrls?: unknown;
}): { imageUrl: string | null; galleryUrls: string[] } {
  const existingGallery = resolveGastroContentGalleryUrls({
    imageUrl: input.existingImageUrl,
    galleryUrls: input.existingGalleryUrls,
  });

  let nextGallery: string[];

  if (input.galleryUrls !== undefined) {
    nextGallery = normalizeGastroContentGalleryUrls(input.galleryUrls ?? []);
  } else if (input.imageUrl !== undefined) {
    const cover = input.imageUrl?.trim() || null;
    if (!cover) {
      nextGallery = [];
    } else if (existingGallery.length === 0) {
      nextGallery = [cover];
    } else if (existingGallery[0] === cover) {
      nextGallery = existingGallery;
    } else if (existingGallery.includes(cover)) {
      nextGallery = [cover, ...existingGallery.filter((u) => u !== cover)];
    } else {
      nextGallery = [cover, ...existingGallery.slice(1)];
    }
  } else {
    nextGallery = existingGallery;
  }

  return {
    imageUrl: nextGallery[0] ?? null,
    galleryUrls: nextGallery,
  };
}

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
  /** Legacy/cover — always first of `galleryUrls` when gallery is non-empty. */
  imageUrl: z.string().nullable(),
  galleryUrls: z.array(z.string()),
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
    galleryUrls: gastroContentGalleryUrlsSchema.optional().nullable(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    status: gastroContentStatusSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const gallery = resolveGastroContentGalleryUrls({
      imageUrl: data.imageUrl,
      galleryUrls: data.galleryUrls,
    });
    if (data.type === 'image' && gallery.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Las publicaciones de tipo imagen requieren al menos una imagen',
        path: ['galleryUrls'],
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
    galleryUrls: gastroContentGalleryUrlsSchema.optional().nullable(),
    sortOrder: z.number().int().min(0).max(999).optional(),
    status: gastroContentStatusSchema.optional(),
  })
  .refine((p) => Object.keys(p).length > 0, { message: 'At least one field required' });
export type GastroContentUpdateInput = z.infer<typeof gastroContentUpdateSchema>;

export const publicGastroContentItemSchema = gastroContentResponseSchema.omit({
  gastroProfileId: true,
});
export type PublicGastroContentItem = z.infer<typeof publicGastroContentItemSchema>;

export const gastroContentIdParamsSchema = z.object({
  id: z.string().min(1),
});
export type GastroContentIdParams = z.infer<typeof gastroContentIdParamsSchema>;

export const gastroContentReorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1).max(100),
});
export type GastroContentReorderInput = z.infer<typeof gastroContentReorderSchema>;

export const gastroContentListResponseSchema = z.object({
  data: z.array(gastroContentResponseSchema),
});
export type GastroContentListResponse = z.infer<typeof gastroContentListResponseSchema>;
