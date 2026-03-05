import { z } from 'zod';
import { EventMediaType } from '../enums';

/**
 * Query params for paginated events list
 * tenantId required (multi-tenant)
 */
export const eventsListQuerySchema = z
  .object({
    tenantId: z.string().min(1, 'tenantId is required'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    city: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    },
    { message: 'dateFrom must not be greater than dateTo', path: ['dateFrom'] },
  );

export type EventsListQuery = z.infer<typeof eventsListQuerySchema>;

export const eventDetailQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});

export type EventDetailQuery = z.infer<typeof eventDetailQuerySchema>;

export const eventMediaSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(EventMediaType),
  url: z.string(),
  sortOrder: z.number(),
});

export type EventMedia = z.infer<typeof eventMediaSchema>;

export const eventSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  city: z.string().nullable(),
  venueName: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
});

export type EventSummary = z.infer<typeof eventSummarySchema>;

export const eventDetailSchema = eventSummarySchema.extend({
  description: z.string().nullable(),
  endAt: z.string().datetime().nullable(),
  venueAddress: z.string().nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  capacityTotal: z.number().nullable(),
  isTicketingEnabled: z.boolean(),
  status: z.string(),
  media: z.array(eventMediaSchema),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().optional(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

export const eventsPaginatedResponseSchema = z.object({
  data: z.array(eventSummarySchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type EventsPaginatedResponse = z.infer<typeof eventsPaginatedResponseSchema>;

/** Query for GET /public/events/search */
export const eventsSearchQuerySchema = z
  .object({
    tenantId: z.string().min(1, 'tenantId is required'),
    q: z.string().optional(),
    city: z.string().optional(),
    dateFrom: z.string().datetime().optional(),
    dateTo: z.string().datetime().optional(),
    minRating: z.coerce.number().min(0).max(5).optional(),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  })
  .refine(
    (data) => {
      if (!data.dateFrom || !data.dateTo) return true;
      return new Date(data.dateFrom) <= new Date(data.dateTo);
    },
    { message: 'dateFrom must not be greater than dateTo', path: ['dateFrom'] },
  );
export type EventsSearchQuery = z.infer<typeof eventsSearchQuerySchema>;

/** Query for GET /public/events/trending */
export const eventsTrendingQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
export type EventsTrendingQuery = z.infer<typeof eventsTrendingQuerySchema>;

/** Params for POST /events/:eventId/courtesies */
export const createCourtesyParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type CreateCourtesyParams = z.infer<typeof createCourtesyParamsSchema>;

/** Body for POST /events/:eventId/courtesies */
export const createCourtesyBodySchema = z.object({
  mode: z.enum(['CONSUMES_BATCH', 'FREE_CAPACITY']),
  ticketTypeId: z.string().optional(),
  quantity: z.number().int().min(1, 'quantity must be at least 1'),
  note: z.string().optional(),
});
export type CreateCourtesyBody = z.infer<typeof createCourtesyBodySchema>;

/** Response for POST /events/:eventId/courtesies */
export const createCourtesyResponseSchema = z.object({
  grantId: z.string(),
  issued: z.number(),
  tickets: z.array(z.object({ id: z.string(), qrPayload: z.string() })),
});
export type CreateCourtesyResponse = z.infer<typeof createCourtesyResponseSchema>;

/** Grant summary for list */
export const courtesyGrantSummarySchema = z.object({
  id: z.string(),
  mode: z.string(),
  ticketTypeId: z.string().nullable(),
  quantity: z.number(),
  issued: z.number(),
  note: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type CourtesyGrantSummary = z.infer<typeof courtesyGrantSummarySchema>;

/** Params for POST /events/:eventId/referral-links */
export const createReferralLinkParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type CreateReferralLinkParams = z.infer<typeof createReferralLinkParamsSchema>;

/** Body for POST /events/:eventId/referral-links */
export const createReferralLinkBodySchema = z.object({
  code: z.string().min(1, 'code is required').regex(/^[a-zA-Z0-9_-]+$/, 'code must be alphanumeric'),
  referrerId: z.string().optional(),
  label: z.string().optional(),
});
export type CreateReferralLinkBody = z.infer<typeof createReferralLinkBodySchema>;

/** Response for POST /events/:eventId/referral-links */
export const createReferralLinkResponseSchema = z.object({
  id: z.string(),
  code: z.string(),
  eventId: z.string(),
  label: z.string().nullable(),
  url: z.string(),
});
export type CreateReferralLinkResponse = z.infer<typeof createReferralLinkResponseSchema>;

/** Referral link summary for list */
export const referralLinkSummarySchema = z.object({
  id: z.string(),
  code: z.string(),
  label: z.string().nullable(),
  attributedOrdersCount: z.number(),
  createdAt: z.string().datetime(),
});
export type ReferralLinkSummary = z.infer<typeof referralLinkSummarySchema>;

/** Params for POST /events/:eventId/reviews */
export const createReviewParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type CreateReviewParams = z.infer<typeof createReviewParamsSchema>;

/** Body for POST /events/:eventId/reviews */
export const createReviewBodySchema = z.object({
  score: z.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});
export type CreateReviewBody = z.infer<typeof createReviewBodySchema>;

/** Review item for list response */
export const reviewItemSchema = z.object({
  id: z.string(),
  score: z.number(),
  title: z.string().nullable(),
  comment: z.string().nullable(),
  userName: z.string(),
  createdAt: z.string().datetime(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** Query for GET /public/events/:id/reviews */
export const reviewsListQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ReviewsListQuery = z.infer<typeof reviewsListQuerySchema>;

/** Response for GET /public/events/:id/reviews */
export const reviewsResponseSchema = z.object({
  reviews: z.array(reviewItemSchema),
  page: z.number(),
  total: z.number(),
});
export type ReviewsResponse = z.infer<typeof reviewsResponseSchema>;
