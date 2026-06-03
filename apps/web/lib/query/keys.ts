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

export const referralKeys = {
  eventAssignments: (eventId: string) => ['producer', 'referrers', 'event-assignments', eventId] as const,
  eventLinks: (eventId: string) => ['referralLinks', eventId] as const,
  eventCommissions: (eventId: string) => ['referralCommissions', 'event', eventId] as const,
};

export const producerReferralProposalKeys = {
  all: ['producer', 'referral-proposals'] as const,
  list: () => [...producerReferralProposalKeys.all, 'list'] as const,
  detail: (id: string) => [...producerReferralProposalKeys.all, 'detail', id] as const,
  byEvent: (eventId: string) => [...producerReferralProposalKeys.all, 'event', eventId] as const,
};

export const referrerReferralProposalKeys = {
  all: ['referrer', 'referral-proposals'] as const,
  list: () => [...referrerReferralProposalKeys.all, 'list'] as const,
  detail: (id: string) => [...referrerReferralProposalKeys.all, 'detail', id] as const,
};

export const referrerCommissionKeys = {
  all: ['referrer', 'commissions'] as const,
  list: (userId: string) => [...referrerCommissionKeys.all, userId] as const,
};

export const referrerPaymentRequestKeys = {
  all: ['referrer', 'payment-requests'] as const,
  list: () => [...referrerPaymentRequestKeys.all, 'list'] as const,
  detail: (id: string) => [...referrerPaymentRequestKeys.all, 'detail', id] as const,
  eligible: () => [...referrerPaymentRequestKeys.all, 'eligible'] as const,
};

export const producerPaymentRequestKeys = {
  all: ['producer', 'referral-payment-requests'] as const,
  list: () => [...producerPaymentRequestKeys.all, 'list'] as const,
  detail: (id: string) => [...producerPaymentRequestKeys.all, 'detail', id] as const,
};

export const producerReferralMetricsKeys = {
  all: ['producer', 'referral-metrics'] as const,
  global: () => [...producerReferralMetricsKeys.all, 'global'] as const,
  event: (eventId: string) => [...producerReferralMetricsKeys.all, 'event', eventId] as const,
};

export const referrerReferralMetricsKeys = {
  all: ['referrer', 'referral-metrics'] as const,
  global: () => [...referrerReferralMetricsKeys.all, 'global'] as const,
  agreement: (id: string) => [...referrerReferralMetricsKeys.all, 'agreement', id] as const,
};

export const courtesyKeys = {
  grants: (eventId: string) => ['courtesies', 'grants', eventId] as const,
  ticketTypes: (eventId: string) => ['courtesies', 'ticket-types', eventId] as const,
};

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
    filtersKey?: string,
  ) => [...reviewsKeys.all, 'v2', category, entityId, tenantId, page, filtersKey] as const,
  /** Invalidate all pages for an entity's public reviews */
  publicV2Entity: (category: string, entityId: string, tenantId: string) =>
    [...reviewsKeys.all, 'v2', category, entityId, tenantId] as const,
  userPublic: (userId: string, tenantId: string, page?: number, filtersKey?: string) =>
    [...reviewsKeys.all, 'user', userId, tenantId, page, filtersKey] as const,
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
  checkoutStatus: (orderId: string, paymentId?: string) =>
    [...ordersKeys.all, orderId, 'checkout-status', paymentId ?? ''] as const,
  byBuyer: (userId: string) => [...ordersKeys.all, 'buyer', userId] as const,
};

// ─── Explore ───────────────────────────────────────────────────────────────

export const exploreKeys = {
  all: ['explore'] as const,
  search: (query: EventsSearchQuery) => [...exploreKeys.all, query] as const,
};

// ─── Navbar city selector ────────────────────────────────────────────────────

export const navbarCityKeys = {
  all: ['navbar', 'discovery-cities'] as const,
  discovery: (tenantId: string, category: string) =>
    [...navbarCityKeys.all, tenantId, category] as const,
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

export const producerDashboardKeys = {
  all: ['producer', 'dashboard'] as const,
  metrics: () => [...producerDashboardKeys.all, 'metrics'] as const,
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

export const adminReviewsReportKeys = {
  all: ['admin', 'reviews-report'] as const,
  report: (filtersKey: string) => [...adminReviewsReportKeys.all, filtersKey] as const,
};

// ─── Metrics / Admin ───────────────────────────────────────────────────────

export const metricsKeys = {
  platform: ['metrics', 'platform'] as const,
  admin: ['admin', 'metrics'] as const,
};

export const adminDashboardKeys = {
  all: ['admin', 'dashboard'] as const,
};

export const adminEventsKeys = {
  all: ['admin', 'events'] as const,
  list: (filtersKey: string) => [...adminEventsKeys.all, 'list', filtersKey] as const,
};

export const adminAuditKeys = {
  all: ['admin', 'audit-logs'] as const,
  list: (filtersKey: string) => [...adminAuditKeys.all, 'list', filtersKey] as const,
};

export const adminUsersKeys = {
  all: ['admin', 'users'] as const,
  list: (filtersKey: string) => [...adminUsersKeys.all, 'list', filtersKey] as const,
};

export const adminPaymentsKeys = {
  all: ['admin', 'payments'] as const,
  list: (filtersKey: string) => [...adminPaymentsKeys.all, 'list', filtersKey] as const,
  detail: (paymentId: string) => [...adminPaymentsKeys.all, 'detail', paymentId] as const,
};

export const adminLegalDocumentsKeys = {
  all: ['admin', 'legal-documents'] as const,
  list: (filtersKey: string) => [...adminLegalDocumentsKeys.all, 'list', filtersKey] as const,
  detail: (key: string) => [...adminLegalDocumentsKeys.all, 'detail', key] as const,
  versions: (key: string) => [...adminLegalDocumentsKeys.all, 'versions', key] as const,
};

export const publicLegalDocumentsKeys = {
  all: ['public', 'legal'] as const,
  bySlug: (tenantId: string, slug: string) =>
    [...publicLegalDocumentsKeys.all, tenantId, slug] as const,
  requirements: (tenantId: string, context: string, profileType?: string) =>
    [...publicLegalDocumentsKeys.all, 'requirements', tenantId, context, profileType ?? ''] as const,
};

/** @alias publicLegalDocumentsKeys */
export const publicLegalKeys = publicLegalDocumentsKeys;

export const meLegalKeys = {
  all: ['me', 'legal'] as const,
  requirements: (context: string, profileType?: string) =>
    [...meLegalKeys.all, 'requirements', context, profileType ?? ''] as const,
  acceptances: () => [...meLegalKeys.all, 'acceptances'] as const,
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

export const hotelKeys = {
  all: ['hotel'] as const,
  me: () => [...hotelKeys.all, 'me'] as const,
};

export const publicHotelKeys = {
  all: ['public', 'hotel'] as const,
  detail: (id: string, tenantId: string) =>
    [...publicHotelKeys.all, 'detail', id, tenantId] as const,
  byEvent: (eventId: string, tenantId: string) =>
    [...publicHotelKeys.all, 'by-event', eventId, tenantId] as const,
};

export const gastroKeys = {
  all: ['gastro'] as const,
  dashboard: () => [...gastroKeys.all, 'dashboard'] as const,
  local: () => [...gastroKeys.all, 'local'] as const,
  discounts: () => [...gastroKeys.all, 'discounts'] as const,
  discount: (id: string) => [...gastroKeys.all, 'discount', id] as const,
  content: (eventId: string) => [...gastroKeys.all, 'content', eventId] as const,
  validations: (filtersKey: string) => [...gastroKeys.all, 'validations', filtersKey] as const,
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

// ─── Public platform config (footer contact) ───────────────────────────────

export const publicPlatformConfigKeys = {
  all: ['publicPlatformConfig'] as const,
  byTenant: (tenantId: string) => [...publicPlatformConfigKeys.all, tenantId] as const,
};
