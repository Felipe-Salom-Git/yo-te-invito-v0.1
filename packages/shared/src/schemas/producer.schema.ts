import { z } from 'zod';
import { PUBLIC_SUBTITLE_MAX_LENGTH } from '../constants/content-limits';
import { deriveProducerEventMode, producerEventModeSchema } from './events';

/** https URL o data:image/* (subida desde el portal). */
export const producerImageRefSchema = z
  .string()
  .min(1)
  .max(2_000_000)
  .refine(
    (s) =>
      /^https?:\/\//i.test(s.trim()) ||
      s.trim().startsWith('data:image/'),
    'La imagen debe ser una URL https o un archivo de imagen válido',
  );

const producerGalleryUrlsSchema = z
  .array(producerImageRefSchema)
  .max(30)
  .optional();

const urlOptional = z
  .string()
  .url()
  .max(500)
  .optional()
  .or(z.literal('').transform(() => undefined));

/** PATCH bodies often send ""; treat as missing. */
function emptyAsUndefined<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((val) => {
    if (val === '' || val === null) return undefined;
    return val;
  }, schema);
}

const optionalEmail = emptyAsUndefined(z.string().email().max(200).optional());

const optionalImage = z.preprocess((val) => {
  if (val === '' || val === null) return undefined;
  return val;
}, producerImageRefSchema.optional().nullable());

const updateProducerProfileFieldsSchema = z.object({
  slug: emptyAsUndefined(z.string().min(2).max(80).optional()),
  displayName: emptyAsUndefined(z.string().min(1).max(200).optional()),
  legalName: emptyAsUndefined(z.string().max(200).optional()),
  shortDescription: emptyAsUndefined(z.string().max(PUBLIC_SUBTITLE_MAX_LENGTH).optional()),
  longDescription: emptyAsUndefined(z.string().max(5000).optional()),
  logoUrl: optionalImage,
  coverImageUrl: optionalImage,
  galleryUrls: z
    .preprocess(
      (val) =>
        Array.isArray(val)
          ? val.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
          : val,
      producerGalleryUrlsSchema,
    )
    .optional(),
  primaryPhone: emptyAsUndefined(z.string().max(40).optional()),
  secondaryPhone: emptyAsUndefined(z.string().max(40).optional()),
  primaryEmail: optionalEmail,
  secondaryEmail: optionalEmail,
  whatsapp: emptyAsUndefined(z.string().max(40).optional()),
  city: emptyAsUndefined(z.string().max(120).optional()),
  country: emptyAsUndefined(z.string().max(120).optional()),
  socialLinks: z
    .object({
      website: urlOptional,
      instagram: emptyAsUndefined(z.string().max(200).optional()),
    })
    .partial()
    .optional(),
});

export const updateProducerProfileSchema = updateProducerProfileFieldsSchema.superRefine((data, ctx) => {
    const hasContact =
      Boolean(data.primaryPhone?.trim()) ||
      Boolean(data.secondaryPhone?.trim()) ||
      Boolean(data.whatsapp?.trim()) ||
      Boolean(data.primaryEmail?.trim()) ||
      Boolean(data.secondaryEmail?.trim());
    const touchesContact =
      data.primaryPhone !== undefined ||
      data.secondaryPhone !== undefined ||
      data.whatsapp !== undefined ||
      data.primaryEmail !== undefined ||
      data.secondaryEmail !== undefined;
    if (touchesContact && !hasContact) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Indicá al menos un teléfono o email de contacto',
        path: ['primaryEmail'],
      });
    }
  });

export type UpdateProducerProfileInput = z.infer<typeof updateProducerProfileSchema>;

/** Creación mínima del perfil (sin membresía previa). */
export const createProducerProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(200),
  slug: emptyAsUndefined(z.string().min(2).max(80).optional()),
});
export type CreateProducerProfileInput = z.infer<typeof createProducerProfileSchema>;

/** Parches por sección (mismo contrato que PATCH /producer/profile). */
export const producerProfileIdentityUpdateSchema = updateProducerProfileFieldsSchema.pick({
  displayName: true,
  slug: true,
  legalName: true,
  shortDescription: true,
  longDescription: true,
  logoUrl: true,
});
export type ProducerProfileIdentityUpdateInput = z.infer<typeof producerProfileIdentityUpdateSchema>;

export const producerProfileImagesUpdateSchema = updateProducerProfileFieldsSchema.pick({
  coverImageUrl: true,
  galleryUrls: true,
});
export type ProducerProfileImagesUpdateInput = z.infer<typeof producerProfileImagesUpdateSchema>;

export const producerProfileContactUpdateSchema = updateProducerProfileFieldsSchema.pick({
  primaryPhone: true,
  secondaryPhone: true,
  primaryEmail: true,
  secondaryEmail: true,
  whatsapp: true,
  city: true,
  country: true,
  socialLinks: true,
});
export type ProducerProfileContactUpdateInput = z.infer<typeof producerProfileContactUpdateSchema>;

export const getProducersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  city: z.string().optional(),
});
export type GetProducersQuery = z.infer<typeof getProducersQuerySchema>;

export const publicProducerEventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  coverImageUrl: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  eventMode: producerEventModeSchema,
  hasTicketing: z.boolean(),
  status: z.string(),
  isTicketingEnabled: z.boolean().optional(),
  isGeneralPublication: z.boolean().optional(),
});

export type PublicProducerEventSummary = z.infer<typeof publicProducerEventSummarySchema>;

export const publicProducerGalleryItemSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string().optional(),
  position: z.number().optional(),
});

export const publicProducerDetailSchema = z.object({
  id: z.string(),
  slug: z.string().nullable().optional(),
  displayName: z.string(),
  shortDescription: z.string().nullable().optional(),
  longDescription: z.string().nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  gallery: z.array(publicProducerGalleryItemSchema).optional(),
  primaryPhone: z.string().nullable().optional(),
  secondaryPhone: z.string().nullable().optional(),
  primaryEmail: z.string().nullable().optional(),
  secondaryEmail: z.string().nullable().optional(),
  whatsapp: z.string().nullable().optional(),
  websiteUrl: z.string().nullable().optional(),
  instagramUrl: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().optional(),
  events: z.array(publicProducerEventSummarySchema),
});

export type PublicProducerDetail = z.infer<typeof publicProducerDetailSchema>;

export const eventProducerPublicSummarySchema = z.object({
  id: z.string(),
  slug: z.string().nullable(),
  displayName: z.string(),
  logoUrl: z.string().nullable().optional(),
  shortDescription: z.string().nullable().optional(),
});

export type EventProducerPublicSummary = z.infer<typeof eventProducerPublicSummarySchema>;

export function mapPublicProducerEvent(row: {
  id: string;
  title: string;
  startAt: Date;
  coverImageUrl: string | null;
  city: string | null;
  venueName: string | null;
  status: string;
  isTicketingEnabled: boolean;
  isGeneralPublication: boolean;
  ticketTypes: Array<{ id: string }>;
}) {
  const eventMode = deriveProducerEventMode(row.isGeneralPublication);
  const hasTicketing =
    row.isTicketingEnabled &&
    !row.isGeneralPublication &&
    row.ticketTypes.length > 0;
  return {
    id: row.id,
    title: row.title,
    startAt: row.startAt.toISOString(),
    coverImageUrl: row.coverImageUrl,
    city: row.city,
    venueName: row.venueName,
    eventMode,
    hasTicketing,
    status: row.status,
    isTicketingEnabled: row.isTicketingEnabled,
    isGeneralPublication: row.isGeneralPublication,
  };
}
