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
  nearYou: (tenantId: string, city: string) =>
    [...homeKeys.all, 'nearYou', tenantId, city] as const,
  new: (tenantId: string, dateFrom: string) =>
    [...homeKeys.all, 'new', tenantId, dateFrom] as const,
  category: (tenantId: string, category: string) =>
    [...homeKeys.all, category, tenantId] as const,
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
};

// ─── Reviews ───────────────────────────────────────────────────────────────

export const reviewsKeys = {
  all: ['reviews'] as const,
  byEvent: (eventId: string, tenantId: string, page?: number) =>
    [...reviewsKeys.all, eventId, tenantId, page] as const,
};

// ─── Orders / Checkout ─────────────────────────────────────────────────────

export const ordersKeys = {
  all: ['orders'] as const,
  detail: (orderId: string) => [...ordersKeys.all, orderId] as const,
  byBuyer: (userId: string) => [...ordersKeys.all, 'buyer', userId] as const,
};

// ─── Explore ───────────────────────────────────────────────────────────────

export const exploreKeys = {
  all: ['explore'] as const,
  search: (query: EventsSearchQuery) => [...exploreKeys.all, query] as const,
};

// ─── Producers ─────────────────────────────────────────────────────────────

export const producersKeys = {
  all: ['producers'] as const,
  detail: (id: string) => ['producer', id] as const,
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
