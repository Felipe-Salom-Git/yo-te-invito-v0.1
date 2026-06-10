import { z } from 'zod';

/** Per-date/show status for multi-date events. */
export const eventOccurrenceStatusSchema = z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']);
export type EventOccurrenceStatus = z.infer<typeof eventOccurrenceStatusSchema>;

const googlePlaceIdOptional = z.string().max(255).nullable().optional();
const provinceOptional = z.string().max(100).nullable().optional();

export const eventOccurrenceResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  eventId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullable().optional(),
  venueName: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  province: provinceOptional,
  googlePlaceId: googlePlaceIdOptional,
  geoLat: z.number().nullable().optional(),
  geoLng: z.number().nullable().optional(),
  capacity: z.number().int().positive().nullable().optional(),
  status: eventOccurrenceStatusSchema,
  sortOrder: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type EventOccurrenceResponse = z.infer<typeof eventOccurrenceResponseSchema>;

export const createEventOccurrenceBodySchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime().nullable().optional(),
    venueName: z.string().max(200).nullable().optional(),
    venueAddress: z.string().max(500).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    province: provinceOptional,
    googlePlaceId: googlePlaceIdOptional,
    geoLat: z.number().min(-90).max(90).nullable().optional(),
    geoLng: z.number().min(-180).max(180).nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    status: eventOccurrenceStatusSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (!data.endAt) return true;
      return new Date(data.startAt) <= new Date(data.endAt);
    },
    { message: 'startAt must not be after endAt', path: ['endAt'] },
  );
export type CreateEventOccurrenceBody = z.infer<typeof createEventOccurrenceBodySchema>;

export const updateEventOccurrenceBodySchema = z
  .object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().nullable().optional(),
    venueName: z.string().max(200).nullable().optional(),
    venueAddress: z.string().max(500).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    province: provinceOptional,
    googlePlaceId: googlePlaceIdOptional,
    geoLat: z.number().min(-90).max(90).nullable().optional(),
    geoLng: z.number().min(-180).max(180).nullable().optional(),
    capacity: z.number().int().positive().nullable().optional(),
    status: eventOccurrenceStatusSchema.optional(),
    sortOrder: z.number().int().min(0).optional(),
  })
  .refine(
    (data) => {
      if (!data.startAt || !data.endAt) return true;
      return new Date(data.startAt) <= new Date(data.endAt);
    },
    { message: 'startAt must not be after endAt', path: ['endAt'] },
  );
export type UpdateEventOccurrenceBody = z.infer<typeof updateEventOccurrenceBodySchema>;

export const eventOccurrenceIdParamsSchema = z.object({
  occurrenceId: z.string().min(1),
});
export type EventOccurrenceIdParams = z.infer<typeof eventOccurrenceIdParamsSchema>;

export const eventOccurrencesListQuerySchema = z.object({
  includeCancelled: z.coerce.boolean().optional(),
});
export type EventOccurrencesListQuery = z.infer<typeof eventOccurrencesListQuerySchema>;
