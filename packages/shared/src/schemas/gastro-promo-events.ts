import { z } from 'zod';
import { contentTagPublicSchema, eventTagIdsSchema } from './content-tags';

/**
 * G12.2 — Promotional events created by a gastro local (reuse `Event`, no ticketing).
 * G12.2 — Eventos publicitarios creados por un local gastronómico (reutilizan `Event`, sin ticketera).
 */

export const EVENT_OWNER_KIND = {
  PRODUCER: 'PRODUCER',
  GASTRO: 'GASTRO',
  /** Admin general publications / legacy rows / local page-events (no profile owner). */
  PLATFORM: 'PLATFORM',
} as const;
export type EventOwnerKind = (typeof EVENT_OWNER_KIND)[keyof typeof EVENT_OWNER_KIND];

/** Owner of an Event row. Producer and gastro owners never coexist (DB CHECK). */
export function resolveEventOwnerKind(event: {
  producerProfileId?: string | null;
  gastroProfileId?: string | null;
}): EventOwnerKind {
  if (event.gastroProfileId) return EVENT_OWNER_KIND.GASTRO;
  if (event.producerProfileId) return EVENT_OWNER_KIND.PRODUCER;
  return EVENT_OWNER_KIND.PLATFORM;
}

/** Gastro promo events are managed only from the gastro portal (never producer / ticketing APIs). */
export function isGastroPromoEvent(event: { gastroProfileId?: string | null }): boolean {
  return Boolean(event.gastroProfileId);
}

export const eventGastroOrganizerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  logoUrl: z.string().nullable().optional(),
});
export type EventGastroOrganizer = z.infer<typeof eventGastroOrganizerSchema>;

/** Max gallery images per promo event (EventMedia rows). */
export const GASTRO_PROMO_EVENT_GALLERY_MAX = 12;

/** Same lifecycle as producer publicity events (Event.status). */
export const gastroPromoEventStatusSchema = z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED']);
export type GastroPromoEventStatus = z.infer<typeof gastroPromoEventStatusSchema>;

/** Statuses from which the local can (re)submit the event to ADMIN review. */
export const GASTRO_PROMO_EVENT_SUBMITTABLE_STATUSES: readonly GastroPromoEventStatus[] = ['DRAFT', 'CANCELLED'];

const publicImageUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .refine((s) => /^https?:\/\//i.test(s), 'La imagen debe ser una URL http(s)');

const optionalText = (max: number) => z.string().trim().max(max).nullish();

const gastroPromoEventFieldsSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: optionalText(5000),
  coverImageUrl: publicImageUrlSchema.nullish(),
  galleryUrls: z.array(publicImageUrlSchema).max(GASTRO_PROMO_EVENT_GALLERY_MAX).optional(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullish(),
  /**
   * G12.4 — true (default on create): venue = the local's name / address / city / province / pin.
   * false: custom venue from the modern location picker (province + city + address required).
   */
  useLocalLocation: z.boolean().optional(),
  venueName: optionalText(200),
  venueAddress: optionalText(300),
  city: optionalText(120),
  province: optionalText(120),
  googlePlaceId: z.string().trim().max(255).nullish(),
  geoLat: z.number().min(-90).max(90).nullish(),
  geoLng: z.number().min(-180).max(180).nullish(),
  subcategoryId: z.string().min(1).nullish(),
  tagIds: eventTagIdsSchema.optional(),
});

function endAfterStart(data: { startAt?: string; endAt?: string | null }): boolean {
  if (!data.startAt || !data.endAt) return true;
  return new Date(data.endAt) >= new Date(data.startAt);
}

/** Custom venue = same minimum as a gastro local (province + city + address). */
function customVenueComplete(data: {
  useLocalLocation?: boolean;
  province?: string | null;
  city?: string | null;
  venueAddress?: string | null;
}): boolean {
  if (data.useLocalLocation !== false) return true;
  return Boolean(data.province?.trim() && data.city?.trim() && data.venueAddress?.trim());
}

/** Pin is all-or-nothing (never a lat without lng). */
function pinComplete(data: { geoLat?: number | null; geoLng?: number | null }): boolean {
  return (data.geoLat == null) === (data.geoLng == null);
}

const CUSTOM_VENUE_MESSAGE = 'Completá provincia, ciudad y dirección de la ubicación del evento';

export const gastroPromoEventCreateSchema = gastroPromoEventFieldsSchema
  .extend({
    /** Target local (multi-local: always explicit). */
    profileId: z.string().min(1),
    /** true → created directly as PENDING (ADMIN review). */
    submitForReview: z.boolean().optional(),
  })
  .refine(endAfterStart, { message: 'La fecha de fin no puede ser anterior al inicio', path: ['endAt'] })
  .refine(customVenueComplete, { message: CUSTOM_VENUE_MESSAGE, path: ['venueAddress'] })
  .refine(pinComplete, { message: 'Coordenadas incompletas', path: ['geoLat'] });
export type GastroPromoEventCreateInput = z.infer<typeof gastroPromoEventCreateSchema>;

export const gastroPromoEventUpdateSchema = gastroPromoEventFieldsSchema
  .partial()
  .refine(endAfterStart, { message: 'La fecha de fin no puede ser anterior al inicio', path: ['endAt'] })
  .refine(customVenueComplete, { message: CUSTOM_VENUE_MESSAGE, path: ['venueAddress'] })
  .refine(pinComplete, { message: 'Coordenadas incompletas', path: ['geoLat'] });
export type GastroPromoEventUpdateInput = z.infer<typeof gastroPromoEventUpdateSchema>;

export const gastroPromoEventListQuerySchema = z.object({
  profileId: z.string().min(1).optional(),
});
export type GastroPromoEventListQuery = z.infer<typeof gastroPromoEventListQuerySchema>;

export const gastroPromoEventResponseSchema = z.object({
  id: z.string(),
  gastroProfileId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  galleryUrls: z.array(z.string()),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  city: z.string().nullable(),
  province: z.string().nullable(),
  googlePlaceId: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  /** G12.4 — venue equals the local's current location (derived server-side). */
  usesLocalLocation: z.boolean(),
  subcategoryId: z.string().nullable(),
  subcategoryName: z.string().nullable(),
  tags: z.array(contentTagPublicSchema),
  status: gastroPromoEventStatusSchema,
  publishedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type GastroPromoEventResponse = z.infer<typeof gastroPromoEventResponseSchema>;

export const gastroPromoEventListResponseSchema = z.object({
  profileId: z.string(),
  data: z.array(gastroPromoEventResponseSchema),
});
export type GastroPromoEventListResponse = z.infer<typeof gastroPromoEventListResponseSchema>;
