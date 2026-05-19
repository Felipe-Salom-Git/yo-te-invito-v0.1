import { z } from 'zod';
import { EventMediaType } from '../enums';
import { rentalOpeningHoursSchema } from './opening-hours';

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
    category: z.string().optional(),
    subcategoryId: z.string().optional(),
    subcategorySlug: z.string().optional(),
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
  category: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  ratingAvg: z.number().nullable().optional(),
  ratingCount: z.number().optional(),
  /** When listing gastro events: first active discount teaser for home cards */
  gastroPromoLabel: z.string().nullable().optional(),
  gastroPromoImageUrl: z.string().nullable().optional(),
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
  rentalLocation: z
    .object({
      id: z.string(),
      name: z.string(),
      address: z.string().nullable(),
      openingHours: rentalOpeningHoursSchema.nullable(),
      openingHoursNote: z.string().nullable(),
      geoLat: z.number().nullable(),
      geoLng: z.number().nullable(),
    })
    .nullable()
    .optional(),
});

export type EventDetail = z.infer<typeof eventDetailSchema>;

/** Active gastro discounts exposed on public event detail (scanner / promo display). */
export const publicGastroDiscountSchema = z.object({
  id: z.string(),
  code: z.string(),
  type: z.enum(['PERCENT', 'FIXED']),
  value: z.number(),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  displayTitle: z.string().nullable().optional(),
  displayDescription: z.string().nullable().optional(),
  displayImageUrls: z.array(z.string()).optional(),
});
export type PublicGastroDiscount = z.infer<typeof publicGastroDiscountSchema>;

export const publicGastroDiscountsResponseSchema = z.object({
  discounts: z.array(publicGastroDiscountSchema),
});
export type PublicGastroDiscountsResponse = z.infer<typeof publicGastroDiscountsResponseSchema>;

/** Event create/update: capacityTotal (int >= 0, nullable) */
export const eventCapacityTotalSchema = z.number().int().min(0).nullable();

export const eventCreateDtoSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullish(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().nullish(),
  city: z.string().nullish(),
  venueName: z.string().nullish(),
  venueAddress: z.string().nullish(),
  capacityTotal: eventCapacityTotalSchema.optional(),
  coverImageUrl: z.string().nullish(),
  geoLat: z.number().nullish(),
  geoLng: z.number().nullish(),
  category: z.string().nullish(),
  subcategoryId: z.string().nullish(),
  rentalLocationId: z.string().nullish(),
});
export type EventCreateDto = z.infer<typeof eventCreateDtoSchema>;

/** Params for GET /producer/events/:eventId/metrics */
export const producerEventMetricsParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type ProducerEventMetricsParams = z.infer<typeof producerEventMetricsParamsSchema>;

/** Per-referral link performance for an event (PAID orders only). */
export const producerEventReferralPerformanceSchema = z.object({
  referralLinkId: z.string(),
  code: z.string(),
  referrerProfileId: z.string(),
  referrerDisplayName: z.string().nullable(),
  paidOrdersCount: z.number().int().min(0),
  ticketsSoldCount: z.number().int().min(0),
  grossRevenueCents: z.number().int().min(0),
});
export type ProducerEventReferralPerformance = z.infer<
  typeof producerEventReferralPerformanceSchema
>;

/** Response for GET /producer/events/:eventId/metrics */
export const producerEventMetricsResponseSchema = z.object({
  ticketsSold: z.number().int().min(0),
  courtesyCount: z.number().int().min(0),
  revenue: z.string(),
  currency: z.string(),
  scanCount: z.number().int().min(0),
  referralPerformance: z.array(producerEventReferralPerformanceSchema).optional(),
});
export type ProducerEventMetricsResponse = z.infer<typeof producerEventMetricsResponseSchema>;

/** Response for GET /admin/platform/metrics */
export const platformMetricsResponseSchema = z.object({
  totalEvents: z.number().int().min(0),
  activeEvents: z.number().int().min(0),
  ticketsSold: z.number().int().min(0),
  totalReviews: z.number().int().min(0),
  totalScans: z.number().int().min(0),
  /** Tickets already scanned at door (validated entries) */
  ticketsValidated: z.number().int().min(0).optional(),
  /** Usage rate: validated / sold * 100 */
  usageRatePercent: z.number().min(0).max(100).optional(),
});
export type PlatformMetricsResponse = z.infer<typeof platformMetricsResponseSchema>;

/** Params for GET /admin/events/:eventId/fraud-signals */
export const fraudSignalsParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type FraudSignalsParams = z.infer<typeof fraudSignalsParamsSchema>;

/** Query for GET /admin/events/:eventId/fraud-signals */
export const fraudSignalsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});
export type FraudSignalsQuery = z.infer<typeof fraudSignalsQuerySchema>;

/** Fraud signal item (IP/UA redacted for non-admin; admin sees all) */
export const fraudSignalItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  signalType: z.string(),
  deviceId: z.string().nullable(),
  ipAddress: z.string().nullable(),
  scanCount: z.number(),
  windowStart: z.string().datetime(),
  windowEnd: z.string().datetime(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});
export type FraudSignalItem = z.infer<typeof fraudSignalItemSchema>;

export const fraudSignalsResponseSchema = z.object({
  data: z.array(fraudSignalItemSchema),
  meta: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});
export type FraudSignalsResponse = z.infer<typeof fraudSignalsResponseSchema>;

export const eventUpdateDtoSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  city: z.string().nullable().optional(),
  venueName: z.string().nullable().optional(),
  venueAddress: z.string().nullable().optional(),
  capacityTotal: eventCapacityTotalSchema.optional(),
  coverImageUrl: z.string().optional().nullable(),
  geoLat: z.number().optional().nullable(),
  geoLng: z.number().optional().nullable(),
  status: z.enum(['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'CANCELLED']).optional(),
  category: z.string().nullish(),
  subcategoryId: z.string().nullish(),
  rentalLocationId: z.string().nullish(),
});
export type EventUpdateDto = z.infer<typeof eventUpdateDtoSchema>;

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
    category: z.string().optional(),
    subcategoryId: z.string().optional(),
    subcategorySlug: z.string().optional(),
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
  referrerProfileId: z.string().optional(),
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
  eventId: z.string().optional(),
  referrerId: z.string().nullable().optional(),
  /** Perfil referidor (asignación v2); legacy puede ser null */
  referrerProfileId: z.string().nullable().optional(),
});
export type ReferralLinkSummary = z.infer<typeof referralLinkSummarySchema>;

/** Body for PUT /events/:eventId/referrals (assign referrers to event) */
export const assignReferralsBodySchema = z.object({
  referrerIds: z.array(z.string().min(1)).max(100),
});
export type AssignReferralsBody = z.infer<typeof assignReferralsBodySchema>;

/** Referral commission item */
export const referralCommissionSchema = z.object({
  id: z.string(),
  referrerId: z.string(),
  referralLinkId: z.string(),
  eventId: z.string(),
  amountCents: z.number(),
  status: z.enum(['PENDING', 'REQUESTED', 'PAID', 'REJECTED']),
  requestedAt: z.string().datetime().nullable(),
  paidAt: z.string().datetime().nullable(),
  confirmedByUserId: z.string().nullable(),
});
export type ReferralCommission = z.infer<typeof referralCommissionSchema>;

/** Body for POST /me/commissions/request */
export const requestCommissionBodySchema = z.object({
  referralLinkId: z.string().min(1),
});
export type RequestCommissionBody = z.infer<typeof requestCommissionBodySchema>;

/** Params for POST /events/:eventId/reviews */
export const createReviewParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type CreateReviewParams = z.infer<typeof createReviewParamsSchema>;

/** Body for POST /events/:eventId/reviews */
export const createReviewBodySchema = z.object({
  /** Promedios del front pueden venir con decimales; se redondea al entero 1–5. */
  score: z
    .number()
    .min(1)
    .max(5)
    .transform((n) => Math.min(5, Math.max(1, Math.round(n)))),
  /** JSON suele mandar null; optional() solo admite undefined. */
  title: z.string().nullish(),
  comment: z.string().nullish(),
  /** Solo aplica si la valoración es sin cuenta (se ignora si hay JWT). */
  guestName: z.string().trim().max(80).nullish(),
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
  /** Respuesta oficial del organizador (visible en listado público si existe) */
  officialReply: z.string().nullable().optional(),
});
export type ReviewItem = z.infer<typeof reviewItemSchema>;

/** Fila de reseña para productores (incluye moderación) */
export const producerReviewRowSchema = reviewItemSchema.extend({
  hiddenFromPublic: z.boolean(),
  officialReply: z.string().nullable(),
});
export type ProducerReviewRow = z.infer<typeof producerReviewRowSchema>;

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
