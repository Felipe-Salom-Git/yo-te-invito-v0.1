/**
 * Centralized TanStack Query keys.
 * Single source of truth for cache keys and invalidation.
 */

import type { EventsSearchQuery } from '@/repositories/interfaces';

// ─── Events ────────────────────────────────────────────────────────────────

export const eventsKeys = {
  all: ['events'] as const,
  list: (tenantId: string, page: number, limit: number) =>
    [...eventsKeys.all, 'list', tenantId, page, limit] as const,
  search: (query: EventsSearchQuery) => [...eventsKeys.all, 'search', query] as const,
  trending: (tenantId: string, limit: number) =>
    [...eventsKeys.all, 'trending', tenantId, limit] as const,
  detail: (eventId: string, tenantId: string) =>
    ['event', eventId, tenantId] as const,
  byProducer: (producerId: string, tenantId: string) =>
    [...eventsKeys.all, 'producer', producerId, tenantId] as const,
};

// ─── Home carousels ────────────────────────────────────────────────────────

export const homeKeys = {
  all: ['home'] as const,
  trending: (tenantId: string) => [...homeKeys.all, 'trending', tenantId] as const,
  recommended: (tenantId: string) => [...homeKeys.all, 'recommended', tenantId] as const,
  nearYou: (tenantId: string, city: string) =>
    [...homeKeys.all, 'nearYou', tenantId, city] as const,
  new: (tenantId: string, dateFrom: string) =>
    [...homeKeys.all, 'new', tenantId, dateFrom] as const,
  category: (tenantId: string, category: string) =>
    [...homeKeys.all, category, tenantId] as const,
  categoryRecommended: (tenantId: string, category: string) =>
    [...homeKeys.all, 'category-recommended', tenantId, category] as const,
};

// ─── Tickets ───────────────────────────────────────────────────────────────

export const ticketsKeys = {
  all: ['tickets'] as const,
  me: (userId: string) => [...ticketsKeys.all, 'me', userId] as const,
  byEvent: (eventId: string) => [...ticketsKeys.all, 'event', eventId] as const,
  detail: (ticketId: string) => [...ticketsKeys.all, 'detail', ticketId] as const,
};

// ─── Ticket types ──────────────────────────────────────────────────────────

export const ticketTypesKeys = {
  all: ['ticketTypes'] as const,
  byEvent: (eventId: string) => ['ticketTypes', eventId] as const,
  /** Producer list with full batches (GET /producer/events/:eventId/ticket-types). */
  producerByEvent: (eventId: string) => [...ticketTypesKeys.all, 'producer', eventId] as const,
};

export const ticketTemplateKeys = {
  all: ['ticketTemplate'] as const,
  byTicketType: (eventId: string, ticketTypeId: string) =>
    [...ticketTemplateKeys.all, eventId, ticketTypeId] as const,
};

// ─── Reviews ───────────────────────────────────────────────────────────────

export const reviewsKeys = {
  all: ['reviews'] as const,
  byEvent: (eventId: string, tenantId: string, page?: number) =>
    [...reviewsKeys.all, eventId, tenantId, page] as const,
  publicV2: (
    category: string,
    entityId: string,
    tenantId: string,
    page?: number,
  ) => [...reviewsKeys.all, 'v2', category, entityId, tenantId, page] as const,
  /** Invalidate all pages for an entity's public reviews */
  publicV2Entity: (category: string, entityId: string, tenantId: string) =>
    [...reviewsKeys.all, 'v2', category, entityId, tenantId] as const,
};

// ─── Me portal (usuario final) ─────────────────────────────────────────────

export const mePortalKeys = {
  all: ['mePortal'] as const,
  dashboard: () => [...mePortalKeys.all, 'dashboard'] as const,
  preferences: () => [...mePortalKeys.all, 'preferences'] as const,
  favorites: () => [...mePortalKeys.all, 'favorites'] as const,
  expectedEvents: () => [...mePortalKeys.all, 'expectedEvents'] as const,
  cart: () => [...mePortalKeys.all, 'cart'] as const,
  pendingOrders: () => [...mePortalKeys.all, 'pendingOrders'] as const,
  activity: () => [...mePortalKeys.all, 'activity'] as const,
  account: () => [...mePortalKeys.all, 'account'] as const,
  ticketDetail: (ticketId: string) => [...mePortalKeys.all, 'ticket', ticketId] as const,
  transferOffers: (role?: string, status?: string) =>
    [...mePortalKeys.all, 'transferOffers', role ?? 'all', status ?? ''] as const,
  transferLookup: (token: string) =>
    [...mePortalKeys.all, 'transferLookup', token] as const,
  transferAccept: (token: string) => [...mePortalKeys.all, 'transferAccept', token] as const,
  notifications: () => [...mePortalKeys.all, 'notifications'] as const,
  notificationsUnread: () => [...mePortalKeys.all, 'notificationsUnread'] as const,
  producerFollows: () => [...mePortalKeys.all, 'producerFollows'] as const,
  producerFollowStatus: (producerProfileId: string) =>
    [...mePortalKeys.all, 'producerFollowStatus', producerProfileId] as const,
  gastroFollows: () => [...mePortalKeys.all, 'gastroFollows'] as const,
  gastroFollowStatus: (gastroProfileId: string) =>
    [...mePortalKeys.all, 'gastroFollowStatus', gastroProfileId] as const,
  pushConfig: () => [...mePortalKeys.all, 'pushConfig'] as const,
  pushSubscriptions: () => [...mePortalKeys.all, 'pushSubscriptions'] as const,
  recommendations: (limit?: number) =>
    [...mePortalKeys.all, 'recommendations', limit ?? 12] as const,
};

// ─── Orders / Checkout ─────────────────────────────────────────────────────

export const ordersKeys = {
  all: ['orders'] as const,
  detail: (orderId: string) => [...ordersKeys.all, orderId] as const,
  paymentStatus: (orderId: string) => [...ordersKeys.all, orderId, 'payment-status'] as const,
  byBuyer: (userId: string) => [...ordersKeys.all, 'buyer', userId] as const,
};

// ─── Explore ───────────────────────────────────────────────────────────────

export const exploreKeys = {
  all: ['explore'] as const,
  search: (query: EventsSearchQuery) => [...exploreKeys.all, query] as const,
};

// ─── Subcategories ─────────────────────────────────────────────────────────

export const subcategoriesKeys = {
  all: ['subcategories'] as const,
  public: (tenantId: string, category: string) =>
    [...subcategoriesKeys.all, 'public', tenantId, category] as const,
  admin: (category: string) => [...subcategoriesKeys.all, 'admin', category] as const,
};

export const generalPublicationsKeys = {
  all: ['general-publications'] as const,
  list: (filters: string) => [...generalPublicationsKeys.all, 'list', filters] as const,
};

export const adminProducersKeys = {
  all: ['admin-producers'] as const,
  list: (filters: string) => [...adminProducersKeys.all, 'list', filters] as const,
  detail: (producerId: string) => [...adminProducersKeys.all, 'detail', producerId] as const,
  events: (producerId: string) => [...adminProducersKeys.all, 'events', producerId] as const,
  eventMetrics: (producerId: string, eventId: string) =>
    [...adminProducersKeys.all, 'metrics', producerId, eventId] as const,
};

export const excursionOperatorsKeys = {
  all: ['excursion-operators'] as const,
  adminList: (tenantId: string) =>
    [...excursionOperatorsKeys.all, 'admin', tenantId] as const,
  adminDetail: (operatorId: string) =>
    [...excursionOperatorsKeys.all, 'admin', operatorId] as const,
};

export const categoryBannersKeys = {
  all: ['categoryBanners'] as const,
  public: (tenantId: string, category: string) =>
    [...categoryBannersKeys.all, 'public', tenantId, category] as const,
  admin: (category: string) => [...categoryBannersKeys.all, 'admin', category] as const,
};

export const categoryLandingKeys = {
  all: ['categoryLanding'] as const,
  rails: (tenantId: string, category: string, subcategorySlug?: string) =>
    [...categoryLandingKeys.all, tenantId, category, subcategorySlug ?? ''] as const,
  carousel: (tenantId: string, category: string, kind: string, slug: string) =>
    [...categoryLandingKeys.all, 'carousel', tenantId, category, kind, slug] as const,
  crossCategory: (tenantId: string, selected: string, other: string) =>
    [...categoryLandingKeys.all, 'cross', tenantId, selected, other] as const,
};

// ─── Producers ─────────────────────────────────────────────────────────────

export const producersKeys = {
  all: ['producers'] as const,
  detail: (id: string) => ['producer', id] as const,
  myProfile: () => ['producer', 'my-profile'] as const,
};

export const producerReviewsKeys = {
  all: ['producer', 'reviews'] as const,
  summary: () => [...producerReviewsKeys.all, 'summary'] as const,
  list: (filtersKey: string) => [...producerReviewsKeys.all, 'list', filtersKey] as const,
};

export const gastroReviewsKeys = {
  all: ['gastro', 'reviews'] as const,
  summary: () => [...gastroReviewsKeys.all, 'summary'] as const,
  list: (filtersKey: string) => [...gastroReviewsKeys.all, 'list', filtersKey] as const,
};

export const hotelReviewsKeys = {
  all: ['hotel', 'reviews'] as const,
  summary: () => [...hotelReviewsKeys.all, 'summary'] as const,
  list: (filtersKey: string) => [...hotelReviewsKeys.all, 'list', filtersKey] as const,
};

export const adminReviewDisputesKeys = {
  all: ['admin', 'review-disputes'] as const,
  list: (filtersKey: string) => [...adminReviewDisputesKeys.all, 'list', filtersKey] as const,
  detail: (id: string) => [...adminReviewDisputesKeys.all, 'detail', id] as const,
};

// ─── Metrics / Admin ───────────────────────────────────────────────────────

export const metricsKeys = {
  platform: ['metrics', 'platform'] as const,
  admin: ['admin', 'metrics'] as const,
};

// ─── Payouts ───────────────────────────────────────────────────────────────

export const payoutsKeys = {
  all: ['payouts'] as const,
  byProducer: (producerId: string) => [...payoutsKeys.all, 'producer', producerId] as const,
  byEvent: (eventId: string) => [...payoutsKeys.all, 'event', eventId] as const,
};

// ─── Referrals ─────────────────────────────────────────────────────────────

export const referralsKeys = {
  byUser: (userId: string) => ['referrals', 'user', userId] as const,
};

// ─── User / Me ─────────────────────────────────────────────────────────────

export const meKeys = {
  all: ['me'] as const,
  detail: (userId: string) => [...meKeys.all, userId] as const,
};

// ─── Gastro portal ─────────────────────────────────────────────────────────

export const publicGastroKeys = {
  all: ['public', 'gastro-locations'] as const,
  list: (tenantId: string, city?: string) =>
    [...publicGastroKeys.all, 'list', tenantId, city ?? ''] as const,
  detail: (id: string, tenantId: string) =>
    [...publicGastroKeys.all, 'detail', id, tenantId] as const,
  byEvent: (eventId: string, tenantId: string) =>
    [...publicGastroKeys.all, 'by-event', eventId, tenantId] as const,
  discounts: (locationId: string, tenantId: string) =>
    [...publicGastroKeys.all, 'discounts', locationId, tenantId] as const,
};

export const gastroKeys = {
  all: ['gastro'] as const,
  local: () => [...gastroKeys.all, 'local'] as const,
  discounts: () => [...gastroKeys.all, 'discounts'] as const,
  discount: (id: string) => [...gastroKeys.all, 'discount', id] as const,
};

export const adminGastroKeys = {
  all: ['admin', 'gastronomicos'] as const,
  pendingDiscounts: () => [...adminGastroKeys.all, 'pending-discounts'] as const,
  list: (filters: string) => [...adminGastroKeys.all, 'list', filters] as const,
  detail: (profileId: string) => [...adminGastroKeys.all, 'detail', profileId] as const,
  discounts: (profileId: string) => [...adminGastroKeys.all, 'discounts', profileId] as const,
  discount: (profileId: string, discountId: string) =>
    [...adminGastroKeys.all, 'discount', profileId, discountId] as const,
  metrics: (profileId: string, discountId: string) =>
    [...adminGastroKeys.all, 'metrics', profileId, discountId] as const,
};
