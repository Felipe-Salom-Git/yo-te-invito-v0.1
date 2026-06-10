import { z } from 'zod';
import { contentCategorySchema, contentMainCategorySchema } from './subcategories';
import { meTicketItemSchema, meOrderItemSchema } from './user.schema';
import { ticketTransferOfferSummarySchema } from './ticket-transfer-offer';
import { ticketTemplateResponseSchema } from './ticket-template.schema';
import { publicReviewCategorySchema } from './review-aspects';
import { eventSummarySchema } from './events';

// ─── Preferences (portal V1 — no favoriteEventIds / expectedEventIds) ────────

const subcategoryIdListSchema = z.array(z.string().min(1)).max(200);
const preferredCitiesListSchema = z.array(z.string().min(1).max(120)).max(6);

export const userPortalPreferencesSchema = z.object({
  userId: z.string(),
  /** Primera ciudad de `preferredCities` (compatibilidad con home y APIs legacy). */
  preferredCity: z.string().nullable(),
  preferredCities: preferredCitiesListSchema.default([]),
  favoriteCategories: z.array(contentMainCategorySchema).default([]),
  favoriteSubcategoryIds: subcategoryIdListSchema.default([]),
  webNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  ticketReminder24hEnabled: z.boolean(),
  favoriteEntityNotificationsEnabled: z.boolean(),
  expectedEventNotificationsEnabled: z.boolean(),
  /** Master toggle for Web Push alertas (dispositivo registrado por separado). */
  pushAlertsEnabled: z.boolean(),
  notifyUpcomingEvents: z.boolean(),
  notifyTransferOffers: z.boolean(),
  notifyPendingReviews: z.boolean(),
  notifyFollowedProducers: z.boolean(),
  notifyFavoriteCategories: z.boolean(),
  notifyFavoriteSubcategories: z.boolean(),
  notifyRecommendations: z.boolean(),
  /** Push al crear notificación interna importante. */
  notifyUnreadNotifications: z.boolean(),
  /** Aprobación/rechazo de eventos propios por administración (portal productor). */
  notifyProducerEventStatus: z.boolean(),
  /** Nueva valoración o actualización de disputa en portales gestionados (productor/gastro/hotel). */
  notifyManagedReviews: z.boolean(),
  /** Respuesta oficial, ocultar/restaurar u otras novedades sobre reseñas que publicaste. */
  notifyReviewEngagement: z.boolean(),
  /** Per-ticket opt-out when global reminder is on */
  ticketReminderOverrides: z.record(z.string(), z.boolean()).default({}),
});
export type UserPortalPreferences = z.infer<typeof userPortalPreferencesSchema>;

export const userPortalPreferencesPatchSchema = z.object({
  preferredCity: z.string().nullable().optional(),
  preferredCities: preferredCitiesListSchema.optional(),
  favoriteCategories: z.array(contentMainCategorySchema).optional(),
  favoriteSubcategoryIds: subcategoryIdListSchema.optional(),
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
  ticketReminder24hEnabled: z.boolean().optional(),
  favoriteEntityNotificationsEnabled: z.boolean().optional(),
  expectedEventNotificationsEnabled: z.boolean().optional(),
  pushAlertsEnabled: z.boolean().optional(),
  notifyUpcomingEvents: z.boolean().optional(),
  notifyTransferOffers: z.boolean().optional(),
  notifyPendingReviews: z.boolean().optional(),
  notifyFollowedProducers: z.boolean().optional(),
  notifyFavoriteCategories: z.boolean().optional(),
  notifyFavoriteSubcategories: z.boolean().optional(),
  notifyRecommendations: z.boolean().optional(),
  notifyUnreadNotifications: z.boolean().optional(),
  notifyProducerEventStatus: z.boolean().optional(),
  notifyManagedReviews: z.boolean().optional(),
  notifyReviewEngagement: z.boolean().optional(),
  ticketReminderOverrides: z.record(z.string(), z.boolean()).optional(),
});
export type UserPortalPreferencesPatch = z.infer<typeof userPortalPreferencesPatchSchema>;

// ─── Favorites ─────────────────────────────────────────────────────────────

export const favoriteEntityTypeSchema = z.enum([
  'event',
  'gastro',
  'rental',
  'excursion',
  'hotel',
  'discount',
]);
export type FavoriteEntityType = z.infer<typeof favoriteEntityTypeSchema>;

export const favoriteProviderTypeSchema = z.enum([
  'producer',
  'gastro',
  'hotel',
  'excursion_operator',
  'rental_location',
  'platform',
]);
export type FavoriteProviderType = z.infer<typeof favoriteProviderTypeSchema>;

export const userFavoriteSchema = z.object({
  id: z.string(),
  entityType: favoriteEntityTypeSchema,
  entityId: z.string(),
  category: contentCategorySchema,
  providerType: favoriteProviderTypeSchema,
  providerId: z.string(),
  webNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  /** Resolved for UI */
  title: z.string().optional(),
  subtitle: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  href: z.string().optional(),
});
export type UserFavorite = z.infer<typeof userFavoriteSchema>;

export const createUserFavoriteBodySchema = z.object({
  entityType: favoriteEntityTypeSchema,
  entityId: z.string().min(1),
  tenantId: z.string().min(1),
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type CreateUserFavoriteBody = z.infer<typeof createUserFavoriteBodySchema>;

export const patchUserFavoriteNotificationsSchema = z.object({
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type PatchUserFavoriteNotifications = z.infer<
  typeof patchUserFavoriteNotificationsSchema
>;

export const meFavoritesResponseSchema = z.object({
  favorites: z.array(userFavoriteSchema),
});
export type MeFavoritesResponse = z.infer<typeof meFavoritesResponseSchema>;

// ─── Expected events ───────────────────────────────────────────────────────

export const userExpectedEventSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  webNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  event: z
    .object({
      id: z.string(),
      title: z.string(),
      startAt: z.string().datetime(),
      category: z.string(),
      coverImageUrl: z.string().nullable().optional(),
    })
    .optional(),
});
export type UserExpectedEvent = z.infer<typeof userExpectedEventSchema>;

export const createUserExpectedEventBodySchema = z.object({
  eventId: z.string().min(1),
  tenantId: z.string().min(1),
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type CreateUserExpectedEventBody = z.infer<typeof createUserExpectedEventBodySchema>;

export const patchUserExpectedEventNotificationsSchema = z.object({
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type PatchUserExpectedEventNotifications = z.infer<
  typeof patchUserExpectedEventNotificationsSchema
>;

export const meExpectedEventsResponseSchema = z.object({
  expectedEvents: z.array(userExpectedEventSchema),
});
export type MeExpectedEventsResponse = z.infer<typeof meExpectedEventsResponseSchema>;

// ─── Producer follows ──────────────────────────────────────────────────────

export const userProducerFollowSchema = z.object({
  id: z.string(),
  producerProfileId: z.string(),
  webNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  producer: z
    .object({
      id: z.string(),
      displayName: z.string(),
      slug: z.string().nullable().optional(),
      logoUrl: z.string().nullable().optional(),
      coverImageUrl: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
    })
    .optional(),
});
export type UserProducerFollow = z.infer<typeof userProducerFollowSchema>;

export const createUserProducerFollowBodySchema = z.object({
  producerProfileId: z.string().min(1),
  tenantId: z.string().min(1),
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type CreateUserProducerFollowBody = z.infer<typeof createUserProducerFollowBodySchema>;

export const patchUserProducerFollowNotificationsSchema = z.object({
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type PatchUserProducerFollowNotifications = z.infer<
  typeof patchUserProducerFollowNotificationsSchema
>;

export const meProducerFollowsResponseSchema = z.object({
  follows: z.array(userProducerFollowSchema),
});
export type MeProducerFollowsResponse = z.infer<typeof meProducerFollowsResponseSchema>;

export const producerFollowStatusSchema = z.object({
  following: z.boolean(),
  followId: z.string().nullable(),
});
export type ProducerFollowStatus = z.infer<typeof producerFollowStatusSchema>;

// ─── Gastro follows ────────────────────────────────────────────────────────

export const userGastroFollowSchema = z.object({
  id: z.string(),
  gastroProfileId: z.string(),
  webNotificationsEnabled: z.boolean(),
  emailNotificationsEnabled: z.boolean(),
  createdAt: z.string().datetime(),
  gastro: z
    .object({
      id: z.string(),
      displayName: z.string(),
      logoUrl: z.string().nullable().optional(),
      bannerUrl: z.string().nullable().optional(),
      city: z.string().nullable().optional(),
      province: z.string().nullable().optional(),
      publicEventId: z.string().nullable().optional(),
    })
    .optional(),
});
export type UserGastroFollow = z.infer<typeof userGastroFollowSchema>;

export const createUserGastroFollowBodySchema = z.object({
  gastroProfileId: z.string().min(1),
  tenantId: z.string().min(1),
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type CreateUserGastroFollowBody = z.infer<typeof createUserGastroFollowBodySchema>;

export const patchUserGastroFollowNotificationsSchema = z.object({
  webNotificationsEnabled: z.boolean().optional(),
  emailNotificationsEnabled: z.boolean().optional(),
});
export type PatchUserGastroFollowNotifications = z.infer<
  typeof patchUserGastroFollowNotificationsSchema
>;

export const meGastroFollowsResponseSchema = z.object({
  follows: z.array(userGastroFollowSchema),
});
export type MeGastroFollowsResponse = z.infer<typeof meGastroFollowsResponseSchema>;

export const gastroFollowStatusSchema = z.object({
  following: z.boolean(),
  followId: z.string().nullable(),
});
export type GastroFollowStatus = z.infer<typeof gastroFollowStatusSchema>;

export const meRecommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(12),
});
export type MeRecommendationsQuery = z.infer<typeof meRecommendationsQuerySchema>;

export const meRecommendationsResponseSchema = z.object({
  fromFollowedProducers: z.array(eventSummarySchema),
  forYou: z.array(eventSummarySchema),
  followedProducersCount: z.number().int(),
});
export type MeRecommendationsResponse = z.infer<typeof meRecommendationsResponseSchema>;

// ─── Cart (persisted) ──────────────────────────────────────────────────────

export const userCartItemSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  ticketTypeId: z.string(),
  occurrenceId: z.string().nullable().optional(),
  quantity: z.number().int().min(1),
  unitPrice: z.string(),
  eventTitle: z.string().optional(),
  ticketTypeName: z.string().optional(),
  occurrenceStartAt: z.string().datetime().nullable().optional(),
  category: z.string().optional(),
});
export type UserCartItem = z.infer<typeof userCartItemSchema>;

export const meCartResponseSchema = z.object({
  cartId: z.string(),
  items: z.array(userCartItemSchema),
  subtotal: z.string(),
  currency: z.string().default('ARS'),
  itemCount: z.number().int(),
});
export type MeCartResponse = z.infer<typeof meCartResponseSchema>;

export const addUserCartItemBodySchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  occurrenceId: z.string().min(1).optional(),
  quantity: z.coerce.number().int().min(1).max(20),
  tenantId: z.string().min(1),
});
export type AddUserCartItemBody = z.infer<typeof addUserCartItemBodySchema>;

export const patchUserCartItemBodySchema = z.object({
  quantity: z.coerce.number().int().min(0).max(20),
});
export type PatchUserCartItemBody = z.infer<typeof patchUserCartItemBodySchema>;

export const meCartCheckoutBodySchema = z.object({
  tenantId: z.string().min(1),
  referralCode: z.string().optional(),
});
export type MeCartCheckoutBody = z.infer<typeof meCartCheckoutBodySchema>;

export const meCartCheckoutResponseSchema = z.object({
  orderIds: z.array(z.string()),
  checkoutUrls: z.array(z.string()).optional(),
});
export type MeCartCheckoutResponse = z.infer<typeof meCartCheckoutResponseSchema>;

/** Pending orders section on /me/cart */
export const mePendingOrdersResponseSchema = z.object({
  orders: z.array(
    meOrderItemSchema.extend({
      eventTitle: z.string().optional(),
      expiresAt: z.string().datetime().nullable().optional(),
    }),
  ),
});
export type MePendingOrdersResponse = z.infer<typeof mePendingOrdersResponseSchema>;

// ─── Dashboard ─────────────────────────────────────────────────────────────

export const meDashboardNextExperienceSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  startAt: z.string().datetime(),
  venueName: z.string().nullable(),
  category: z.string(),
  ticketId: z.string().optional(),
  hoursUntilStart: z.number().optional(),
});
export type MeDashboardNextExperience = z.infer<typeof meDashboardNextExperienceSchema>;

export const meDashboardPendingReviewSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  category: publicReviewCategorySchema,
  entityId: z.string(),
  attendedAt: z.string().datetime().nullable().optional(),
});
export type MeDashboardPendingReview = z.infer<typeof meDashboardPendingReviewSchema>;

export const meDashboardRecentFavoriteSchema = userFavoriteSchema.pick({
  id: true,
  entityType: true,
  entityId: true,
  category: true,
  title: true,
  imageUrl: true,
  href: true,
});
export type MeDashboardRecentFavorite = z.infer<typeof meDashboardRecentFavoriteSchema>;

export const meDashboardCartSummarySchema = z.object({
  itemCount: z.number().int(),
  subtotal: z.string(),
  hasItems: z.boolean(),
});
export type MeDashboardCartSummary = z.infer<typeof meDashboardCartSummarySchema>;

export const meDashboardRecommendedEventSchema = eventSummarySchema.extend({
  producerDisplayName: z.string().optional(),
});

export const meDashboardResponseSchema = z.object({
  stats: z.object({
    activeTicketsCount: z.number().int(),
    upcomingExperiencesCount: z.number().int(),
    pendingReviewsCount: z.number().int(),
    favoritesCount: z.number().int(),
    followedProducersCount: z.number().int(),
    attendedEventsCount: z.number().int(),
  }),
  nextExperience: meDashboardNextExperienceSchema.nullable(),
  pendingReviews: z.array(meDashboardPendingReviewSchema),
  recentFavorites: z.array(meDashboardRecentFavoriteSchema),
  recommendedEvents: z.array(meDashboardRecommendedEventSchema).max(6).optional(),
  cartSummary: meDashboardCartSummarySchema,
  recentTickets: z.array(meTicketItemSchema).max(5).optional(),
});
export type MeDashboardResponse = z.infer<typeof meDashboardResponseSchema>;

// ─── Tickets (portal extensions) ───────────────────────────────────────────

export const patchTicketReminderBodySchema = z.object({
  enabled: z.boolean(),
});
export type PatchTicketReminderBody = z.infer<typeof patchTicketReminderBodySchema>;

export const meTicketDetailSchema = meTicketItemSchema.extend({
  source: z.enum(['ORDER', 'COURTESY', 'TRANSFER']).optional(),
  reminderEnabled: z.boolean(),
  transferOffer: ticketTransferOfferSummarySchema.nullable().optional(),
  canTransfer: z.boolean(),
  category: z.string().optional(),
  orderId: z.string().nullable().optional(),
  holderName: z.string().nullable().optional(),
  batchName: z.string().nullable().optional(),
  /** Producer canvas template when linked to ticket type; null if none. */
  ticketTemplate: ticketTemplateResponseSchema.nullable().optional(),
});
export type MeTicketDetail = z.infer<typeof meTicketDetailSchema>;

export const meTicketsPortalResponseSchema = z.object({
  active: z.array(meTicketItemSchema),
  used: z.array(meTicketItemSchema).optional(),
  revoked: z.array(meTicketItemSchema).optional(),
  transferred: z.array(meTicketItemSchema).optional(),
});
export type MeTicketsPortalResponse = z.infer<typeof meTicketsPortalResponseSchema>;

// ─── Activity ──────────────────────────────────────────────────────────────

export const meAttendedEventSchema = z.object({
  eventId: z.string(),
  title: z.string(),
  category: z.string(),
  startAt: z.string().datetime(),
  attendedAt: z.string().datetime(),
  hasReview: z.boolean(),
  reviewId: z.string().nullable().optional(),
});
export type MeAttendedEvent = z.infer<typeof meAttendedEventSchema>;

export const meMyReviewActivitySchema = z.object({
  id: z.string(),
  eventId: z.string(),
  entityId: z.string(),
  category: publicReviewCategorySchema,
  overallRating: z.number().nullable(),
  comment: z.string().nullable(),
  status: z.string(),
  createdAt: z.string().datetime(),
  officialReply: z.string().nullable().optional(),
  eventTitle: z.string().optional(),
});
export type MeMyReviewActivity = z.infer<typeof meMyReviewActivitySchema>;

export const meActivityResponseSchema = z.object({
  attended: z.array(meAttendedEventSchema),
  reviews: z.array(meMyReviewActivitySchema),
  transfers: z.array(ticketTransferOfferSummarySchema),
});
export type MeActivityResponse = z.infer<typeof meActivityResponseSchema>;

export const meActivityAttendedResponseSchema = z.object({
  events: z.array(meAttendedEventSchema),
});
export type MeActivityAttendedResponse = z.infer<typeof meActivityAttendedResponseSchema>;

export const meActivityReviewsResponseSchema = z.object({
  reviews: z.array(meMyReviewActivitySchema),
});
export type MeActivityReviewsResponse = z.infer<typeof meActivityReviewsResponseSchema>;

// ─── Account ───────────────────────────────────────────────────────────────

export const meAccountSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  city: z.string().nullable().optional(),
  avatarUrl: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
});
export type MeAccount = z.infer<typeof meAccountSchema>;

export const patchMeAccountBodySchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(40).nullable().optional(),
  city: z.string().max(120).nullable().optional(),
  avatarUrl: z.string().max(2_000_000).nullable().optional(),
  dateOfBirth: z.string().date().nullable().optional(),
});
export type PatchMeAccountBody = z.infer<typeof patchMeAccountBodySchema>;

export const changePasswordBodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(128),
});
export type ChangePasswordBody = z.infer<typeof changePasswordBodySchema>;

export const changePasswordResponseSchema = z.object({
  message: z.string(),
});
export type ChangePasswordResponse = z.infer<typeof changePasswordResponseSchema>;
