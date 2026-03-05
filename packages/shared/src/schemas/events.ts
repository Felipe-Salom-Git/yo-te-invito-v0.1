import { z } from 'zod';
import { EventStatus } from '../enums';

/**
 * Query params for paginated events list
 * Parámetros de consulta para listado paginado de eventos
 */
export const eventsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  city: z.string().optional(),
  status: z.nativeEnum(EventStatus).optional(),
});

export type EventsListQuery = z.infer<typeof eventsListQuerySchema>;

/**
 * Event shape for public API response
 * Forma del evento para respuesta de API pública
 */
export const eventPublicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  venueAddress: z.string().nullable(),
  status: z.nativeEnum(EventStatus),
  coverImageUrl: z.string().nullable(),
  isTicketingEnabled: z.boolean(),
});

export type EventPublic = z.infer<typeof eventPublicSchema>;

/**
 * Paginated events response
 * Respuesta paginada de eventos
 */
export const eventsPaginatedResponseSchema = z.object({
  data: z.array(eventPublicSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type EventsPaginatedResponse = z.infer<typeof eventsPaginatedResponseSchema>;
