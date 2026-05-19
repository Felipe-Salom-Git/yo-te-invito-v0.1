/**
 * ApiRepository — HTTP implementation of Repositories against the backend API.
 */

import { ApiClient, ApiClientError } from '@/lib/api/client';
import type {
  Repositories,
  ApplicationsRepo,
  ProfilesRepo,
  HotelRepo,
  HotelProfileSummary,
  PendingProducerProfile,
  RoleApplication,
  EventsRepo,
  TicketsRepo,
  OrdersRepo,
  UsersRepo,
  ReviewsRepo,
  InboxRepo,
  InboxItemSummary,
  ProducerReviewRow,
  ReferralsRepo,
  CourtesiesRepo,
  MetricsRepo,
  PayoutsRepo,
  GastroRepo,
  ResaleRepo,
  EventsListQuery,
  EventsSearchQuery,
  EventsPaginatedResponse,
  EventSummary,
  EventDetail,
  PublicGastroDiscountSummary,
  Ticket,
  Order,
  User,
  UserPreferences,
  ReviewsResponse,
  ReferralLinkSummary,
  ReferrerListItem,
  ReferrerProfileSummary,
  ProducerReferrerRelationship,
  ProducerReferrerAssociationResult,
  ProducerReferrerContext,
  ReferrerProducerRelationshipRow,
  ReferralCommission,
  CourtesyGrantSummary,
  TicketTypeResponse,
  TicketTypesRepo,
  TicketTypeCreateInput,
  TicketTypeUpdateInput,
  TicketTemplatesRepo,
  TicketTemplateUpsertInput,
  TicketTemplateResponse,
  EventMetrics,
  PlatformMetrics,
  ProducersRepo,
  ProducerSummary,
  ProducerDetail,
  ScannerRepo,
  ScanResult,
  TicketScanLogItem,
  PayoutRequest,
  PayoutStatus,
  GastroContent,
  GastroDiscount,
  GastroDiscountValidation,
  ResaleListing,
  CreateReferrerInput,
  ReferrerOwnProfile,
  ReferrerDashboardResponse,
  PublicReferrersListResponse,
  PublicReferrerListItem,
  ReferrerAssociationResolveResponse,
  AssignReferrerToEventResponse,
  ProducerEventAssignmentsResponse,
  FreelanceReferrerListItem,
  ProducerFreelanceReferrersParams,
  PlatformConfig,
  PlatformConfigRepo,
  CreatePaymentResult,
  PaymentStatusResult,
  SubcategoriesRepo,
  RentalLocationsRepo,
  RentalLocationSummary,
  RentalLocationDetail,
  PublicSubcategorySummary,
  SubcategoryAdmin,
  ContentMainCategory,
  ContentCategory,
} from './interfaces';

function mapOrderResponse(raw: {
  id: string;
  tenantId: string;
  status: string;
  buyerEmail: string;
  totalAmount: string;
  orderItems?: Array<{ tickets?: Array<{ id: string; qrPayload: string; status: string }> }>;
  tickets?: Array<{ id: string; qrPayload: string; status: string }>;
  [k: string]: unknown;
}): Order {
  const tickets =
    raw.tickets ??
    raw.orderItems?.flatMap((oi) => oi.tickets ?? []) ??
    [];
  return {
    ...raw,
    eventId: (raw as { eventId?: string }).eventId ?? '',
    status: raw.status,
    buyerEmail: raw.buyerEmail,
    totalAmount: raw.totalAmount,
    tickets: tickets.map((t) => ({ id: t.id, qrPayload: t.qrPayload, status: t.status })),
  };
}

type MeTicketApiRow = {
  ticketId: string;
  status: string;
  qrPayload: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  event: { id: string; title?: string; startAt?: string; venueName?: string | null };
  ticketType?: { id: string; name: string };
};

function mapMeTicketToTicket(item: MeTicketApiRow): Ticket {
  return {
    id: item.ticketId,
    eventId: item.event.id,
    qrPayload: item.qrPayload,
    status: item.status as Ticket['status'],
    usedAt: item.usedAt ?? undefined,
    revokedAt: item.revokedAt ?? undefined,
    eventTitle: item.event.title,
    ticketTypeName: item.ticketType?.name,
  };
}

export interface ApiRepositoryOptions {
  client: ApiClient;
  /** Default tenantId for public routes */
  defaultTenantId?: string;
}

export class ApiRepository implements Repositories {
  private client: ApiClient;
  private defaultTenantId: string;

  constructor(options: ApiRepositoryOptions) {
    this.client = options.client;
    this.defaultTenantId = options.defaultTenantId ?? 'tenant-demo';
  }

  private q(params: Record<string, string | number | boolean | undefined>) {
    const t = this.defaultTenantId;
    return { tenantId: t, ...params } as Record<string, string | number | boolean | undefined>;
  }

  events: EventsRepo = {
    list: async (query: EventsListQuery) => {
      const t = query.tenantId ?? this.defaultTenantId;
      if (query.forAdmin) {
        const raw = await this.client.get<{ data: EventSummary[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
          '/admin/events',
          { page: query.page, limit: query.limit, status: query.status }
        );
        return raw;
      }
      if (query.producerId || query.status) {
        const raw = await this.client.get<{ data: EventSummary[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
          '/producer/events',
          { page: query.page, limit: query.limit, status: query.status }
        );
        return raw;
      }
      const raw = await this.client.get<{ data: EventSummary[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        '/public/events',
        {
          tenantId: t,
          page: query.page,
          limit: query.limit,
          city: query.city,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          category: query.category,
          subcategoryId: query.subcategoryId,
          subcategorySlug: query.subcategorySlug,
        },
      );
      return raw;
    },
    search: async (query: EventsSearchQuery) => {
      const t = query.tenantId ?? this.defaultTenantId;
      return this.client.get<EventsPaginatedResponse>('/public/events/search', {
        tenantId: t,
        q: query.q,
        city: query.city,
        category: query.category,
        subcategoryId: query.subcategoryId,
        subcategorySlug: query.subcategorySlug,
        page: query.page,
        limit: query.limit,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        minRating: query.minRating,
      });
    },
    trending: async (tenantId: string, limit = 10) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.get<EventSummary[]>('/public/events/trending', {
        tenantId: t,
        limit,
      });
    },
    getDetail: async (eventId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      const raw = await this.client.get<EventDetail | null>('/public/events/' + encodeURIComponent(eventId), {
        tenantId: t,
      });
      return raw;
    },
    listPublicDiscounts: async (eventId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.get<{ discounts: PublicGastroDiscountSummary[] }>(
        `/public/events/${encodeURIComponent(eventId)}/discounts`,
        { tenantId: t },
      );
    },
    getDetailForProducer: async (eventId: string) => {
      const raw = await this.client.get<EventDetail | null>(
        '/producer/events/' + encodeURIComponent(eventId)
      );
      return raw;
    },
    getTicketTypes: async (eventId: string) => {
      const raw = await this.client.get<Array<TicketTypeResponse & { price?: string | number }>>(
        `/public/events/${encodeURIComponent(eventId)}/ticket-types`,
        this.q({})
      );
      return raw.map((tt) => ({
        ...tt,
        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price ?? 0,
        capacityAvailable: tt.capacityAvailable ?? (tt as { capacityTotal?: number }).capacityTotal ?? 0,
      }));
    },
    create: async (input) => {
      const body = {
        title: input.title ?? 'Nuevo evento',
        description: input.description ?? '',
        startAt: input.startAt ?? new Date().toISOString(),
        endAt: input.endAt ?? null,
        city: input.city ?? null,
        venueName: input.venueName ?? null,
        venueAddress: input.venueAddress ?? null,
        capacityTotal: input.capacityTotal ?? null,
        coverImageUrl: input.coverImageUrl ?? null,
        geoLat: input.geoLat ?? null,
        geoLng: input.geoLng ?? null,
        category: input.category ?? 'event',
        subcategoryId: (input as { subcategoryId?: string | null }).subcategoryId ?? null,
      };
      return this.client.post<EventDetail>('/producer/events', body) as Promise<EventDetail>;
    },
    update: async (eventId: string, patch) => {
      return this.client.patch<EventDetail | null>(
        '/producer/events/' + encodeURIComponent(eventId),
        patch
      ) as Promise<EventDetail | null>;
    },
  };

  rentalLocations: RentalLocationsRepo = {
    listAdmin: async (query) =>
      this.client.get<{ data: RentalLocationSummary[] }>('/admin/rental-locations', {
        ...(query?.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query?.includeInactive ? { includeInactive: true } : {}),
      }),
    getAdmin: async (id) =>
      this.client.get<RentalLocationDetail>(
        `/admin/rental-locations/${encodeURIComponent(id)}`,
      ),
    create: async (input) =>
      this.client.post<RentalLocationSummary>('/admin/rental-locations', input),
    update: async (id, patch) =>
      this.client.patch<RentalLocationSummary>(
        `/admin/rental-locations/${encodeURIComponent(id)}`,
        patch,
      ),
    remove: async (id) =>
      this.client.delete<{ ok: true }>(
        `/admin/rental-locations/${encodeURIComponent(id)}`,
      ),
    createProduct: async (locationId, input) =>
      this.client.post<{ id: string; title: string }>(
        `/admin/rental-locations/${encodeURIComponent(locationId)}/products`,
        input,
      ),
    updateProduct: async (locationId, productId, patch) =>
      this.client.patch<{ id: string; title: string }>(
        `/admin/rental-locations/${encodeURIComponent(locationId)}/products/${encodeURIComponent(productId)}`,
        patch,
      ),
  };

  subcategories: SubcategoriesRepo = {
    listPublic: async (tenantId: string, category: ContentMainCategory) => {
      const raw = await this.client.get<{ data: PublicSubcategorySummary[] }>(
        '/public/subcategories',
        { tenantId: tenantId ?? this.defaultTenantId, category },
      );
      return raw.data;
    },
    listAdmin: async (category: ContentCategory) => {
      return this.client.get<{ data: SubcategoryAdmin[]; comingSoon?: boolean }>(
        '/admin/subcategories',
        { category },
      );
    },
    create: async (input) => this.client.post<SubcategoryAdmin>('/admin/subcategories', input),
    update: async (id, patch) =>
      this.client.patch<SubcategoryAdmin>(`/admin/subcategories/${encodeURIComponent(id)}`, patch),
    deactivate: async (id) =>
      this.client.delete<SubcategoryAdmin>(`/admin/subcategories/${encodeURIComponent(id)}`),
  };

  applications: ApplicationsRepo = {
    listPending: async () => {
      const raw = await this.client.get<RoleApplication[]>('/admin/applications');
      return raw.map((a) => ({ ...a, createdAt: String(a.createdAt ?? '') }));
    },
    approve: async (tenantId: string, applicationId: string) => {
      return this.client.post<{ id: string; email: string; role: string }>(
        `/admin/applications/${encodeURIComponent(applicationId)}/approve`
      );
    },
    reject: async (tenantId: string, applicationId: string) => {
      await this.client.post(`/admin/applications/${encodeURIComponent(applicationId)}/reject`);
    },
  };

  profiles: ProfilesRepo = {
    applyProducer: async (body) => this.client.post('/profiles/producer/apply', body),
    applyGastro: async (body) => this.client.post('/profiles/gastro/apply', body),
    applyHotel: async (body) => this.client.post('/profiles/hotel/apply', body),
    applyReferrer: async (body) => this.client.post('/profiles/referrer/apply', body),
    listPendingProducerProfiles: async () =>
      this.client.get<{ profiles: PendingProducerProfile[] }>('/admin/profiles/producer/pending'),
    approveProducerProfile: async (profileId: string) =>
      this.client.post<{ id: string; status: string; message: string }>(
        `/admin/profiles/producer/${encodeURIComponent(profileId)}/approve`
      ),
    listPendingGastroProfiles: async () =>
      this.client.get<{ profiles: PendingProducerProfile[] }>('/admin/profiles/gastro/pending'),
    approveGastroProfile: async (profileId: string) =>
      this.client.post<{ id: string; status: string; message: string }>(
        `/admin/profiles/gastro/${encodeURIComponent(profileId)}/approve`
      ),
    listPendingHotelProfiles: async () =>
      this.client.get<{ profiles: PendingProducerProfile[] }>('/admin/profiles/hotel/pending'),
    approveHotelProfile: async (profileId: string) =>
      this.client.post<{ id: string; status: string; message: string }>(
        `/admin/profiles/hotel/${encodeURIComponent(profileId)}/approve`
      ),
    listPendingReferrerProfiles: async () =>
      this.client.get<{ profiles: PendingProducerProfile[] }>('/admin/profiles/referrer/pending'),
    approveReferrerProfile: async (profileId: string) =>
      this.client.post<{ id: string; status: string; message: string }>(
        `/admin/profiles/referrer/${encodeURIComponent(profileId)}/approve`
      ),
    getMyReferrerProfile: async () => this.client.get<ReferrerOwnProfile>('/referrer/me'),
    updateMyReferrerProfile: async (patch) =>
      this.client.patch<ReferrerOwnProfile>('/referrer/me', patch),
    getReferrerDashboard: async () =>
      this.client.get<ReferrerDashboardResponse>('/referrer/me/dashboard'),
    listPublicReferrers: async (tenantId: string, page = 1, limit = 24) => {
      const t = tenantId || this.defaultTenantId;
      return this.client.get<PublicReferrersListResponse>('/public/referrers', {
        tenantId: t,
        page,
        limit,
      });
    },
    getPublicReferrerBySlug: async (tenantId: string, slug: string) => {
      const t = tenantId || this.defaultTenantId;
      return this.client.get<
        PublicReferrerListItem & { longBio: string | null; coverImageUrl: string | null }
      >(`/public/referrers/slug/${encodeURIComponent(slug)}`, { tenantId: t });
    },
    resolveReferrerAssociation: async (tenantId: string, token: string) => {
      const t = tenantId || this.defaultTenantId;
      return this.client.get<ReferrerAssociationResolveResponse>(
        `/public/referrers/association/${encodeURIComponent(token)}`,
        { tenantId: t },
      );
    },
  };

  hotel: HotelRepo = {
    getMe: async () => {
      return this.client.get<{ profile: HotelProfileSummary | null }>('/hotel/me');
    },
  };

  ticketTypes: TicketTypesRepo = {
    list: async (eventId: string) => {
      const raw = await this.client.get<Array<TicketTypeResponse & { price?: string | number }>>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types`,
      );
      return raw.map((t) => ({
        ...t,
        price: typeof t.price === 'string' ? parseFloat(t.price) : t.price,
        capacityAvailable: t.capacityAvailable ?? (t as { capacityTotal?: number }).capacityTotal ?? 0,
        saleStart: (t as { salesStartAt?: string }).salesStartAt ?? null,
        saleEnd: (t as { salesEndAt?: string }).salesEndAt ?? null,
      }));
    },
    create: async (eventId: string, input: TicketTypeCreateInput) => {
      const capacityTotal = input.capacityTotal ?? input.capacityAvailable;
      if (capacityTotal == null || capacityTotal < 1) {
        throw new Error('capacityTotal (or capacityAvailable) is required and must be >= 1');
      }
      const body: Record<string, unknown> = {
        name: input.name,
        capacityTotal,
        currency: input.currency ?? 'ARS',
        maxPerOrder: input.maxPerOrder ?? 10,
      };
      if (input.description !== undefined) body.description = input.description;
      if (input.status != null) body.status = input.status;
      if (input.batches?.length) {
        const sorted = [...input.batches].sort((a, b) => a.orderIndex - b.orderIndex);
        body.batches = sorted.map((b) => ({
          orderIndex: b.orderIndex,
          name: b.name,
          startAt: b.startAt,
          endAt: b.endAt,
          baseQuantity: b.baseQuantity,
          price: b.price,
        }));
        body.price = input.price ?? sorted[0]?.price ?? 0;
      } else {
        body.price = input.price ?? 0;
        if (input.saleStart) body.salesStartAt = new Date(input.saleStart).toISOString();
        if (input.saleEnd) body.salesEndAt = new Date(input.saleEnd).toISOString();
      }
      const raw = await this.client.post<TicketTypeResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types`,
        body
      );
      return {
        ...raw,
        price: typeof raw.price === 'string' ? parseFloat(raw.price) : raw.price,
        capacityAvailable: raw.capacityAvailable ?? (raw as { capacityTotal?: number }).capacityTotal ?? 0,
        saleStart: (raw as { salesStartAt?: string }).salesStartAt ?? null,
        saleEnd: (raw as { salesEndAt?: string }).salesEndAt ?? null,
      };
    },
    update: async (id: string, patch: TicketTypeUpdateInput) => {
      const eventId = patch.eventId;
      if (!eventId) {
        throw new Error('ApiRepository ticketTypes.update requires eventId in patch');
      }
      const body: Record<string, unknown> = {};
      if (patch.name != null) body.name = patch.name;
      if (patch.description !== undefined) body.description = patch.description;
      if (patch.price != null) body.price = patch.price;
      if (patch.capacityTotal != null) body.capacityTotal = patch.capacityTotal;
      if (patch.capacityAvailable != null) body.capacityTotal = patch.capacityAvailable;
      if (patch.maxPerOrder != null) body.maxPerOrder = patch.maxPerOrder;
      if (patch.status != null) body.status = patch.status;
      if (patch.saleStart !== undefined) {
        body.salesStartAt = patch.saleStart ? new Date(patch.saleStart).toISOString() : null;
      }
      if (patch.saleEnd !== undefined) {
        body.salesEndAt = patch.saleEnd ? new Date(patch.saleEnd).toISOString() : null;
      }
      if (patch.batches?.length) {
        const sorted = [...patch.batches].sort((a, b) => a.orderIndex - b.orderIndex);
        body.batches = sorted.map((b) => ({
          orderIndex: b.orderIndex,
          name: b.name,
          startAt: b.startAt,
          endAt: b.endAt,
          baseQuantity: b.baseQuantity,
          price: b.price,
        }));
      }
      const raw = await this.client.patch<TicketTypeResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(id)}`,
        body
      );
      return {
        ...raw,
        price: typeof raw.price === 'string' ? parseFloat(raw.price) : raw.price,
        capacityAvailable: raw.capacityAvailable ?? (raw as { capacityTotal?: number }).capacityTotal ?? 0,
        saleStart: (raw as { salesStartAt?: string }).salesStartAt ?? null,
        saleEnd: (raw as { salesEndAt?: string }).salesEndAt ?? null,
      };
    },
  };

  ticketTemplates: TicketTemplatesRepo = {
    get: async (eventId: string, ticketTypeId: string) => {
      return this.client.get<{ template: TicketTemplateResponse | null }>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}/ticket-template`,
      );
    },
    upsert: async (eventId: string, ticketTypeId: string, body: TicketTemplateUpsertInput) => {
      return this.client.put<{ template: TicketTemplateResponse }>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}/ticket-template`,
        body,
      );
    },
    delete: async (eventId: string, ticketTypeId: string) => {
      return this.client.delete<{ ok: true }>(
        `/producer/events/${encodeURIComponent(eventId)}/ticket-types/${encodeURIComponent(ticketTypeId)}/ticket-template`,
      );
    },
  };

  tickets: TicketsRepo = {
    listByOwner: async (userId: string) => {
      const raw = await this.client.get<{ tickets: MeTicketApiRow[] }>('/me/tickets');
      return (raw.tickets ?? []).map(mapMeTicketToTicket);
    },
    listByEvent: async (eventId: string) => {
      const raw = await this.client.get<{ tickets: Array<{ id?: string; ticketId?: string; eventId?: string; status: string; qrPayload: string }> }>(
        `/producer/events/${encodeURIComponent(eventId)}/tickets`
      );
      return (raw.tickets ?? []).map((t) => {
        const id = t.id ?? t.ticketId ?? '';
        const evId = t.eventId ?? eventId;
        return { id, eventId: evId, qrPayload: t.qrPayload, status: t.status as Ticket['status'] };
      });
    },
    get: async (ticketId: string) => {
      try {
        const raw = await this.client.get<MeTicketApiRow>(
          `/me/tickets/${encodeURIComponent(ticketId)}`,
        );
        return mapMeTicketToTicket(raw);
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 404) return null;
        throw e;
      }
    },
    create: async () => {
      throw new Error('NotImplemented: tickets are created via orders');
    },
    update: async () => null,
    delete: async () => {
      throw new Error('NotImplemented: use admin revoke');
    },
  };

  orders: OrdersRepo = {
    get: async (orderId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      const raw = await this.client.get<Parameters<typeof mapOrderResponse>[0]>(
        '/public/orders/' + encodeURIComponent(orderId),
        { tenantId: t }
      );
      return mapOrderResponse(raw as Parameters<typeof mapOrderResponse>[0]);
    },
    listByBuyer: async (userId: string, tenantId?: string) => {
      const raw = await this.client.get<{ orders: Array<{ id: string; eventId: string; status: string; buyerEmail: string; totalAmount: string; createdAt: string }> }>('/me/orders');
      const list = raw.orders ?? [];
      return list.map((o) =>
        mapOrderResponse({
          id: o.id,
          tenantId: tenantId ?? this.defaultTenantId,
          eventId: o.eventId,
          status: o.status,
          buyerEmail: o.buyerEmail,
          totalAmount: o.totalAmount,
          tickets: [],
        })
      );
    },
    create: async (input) => {
      const t = input.tenantId ?? this.defaultTenantId;
      const [firstName = '', ...lastParts] = (input.buyerName ?? '').trim().split(/\s+/);
      const lastName = lastParts.join(' ') || '—';
      const body = {
        eventId: input.eventId,
        buyer: {
          email: input.buyerEmail,
          firstName: firstName || 'Cliente',
          lastName,
        },
        items: input.items.map((i) => ({ ticketTypeId: i.ticketTypeId, quantity: i.quantity })),
        ...(input.referralCode?.trim() ? { referralCode: input.referralCode.trim() } : {}),
        ...(input.buyerUserId?.trim() ? { buyerUserId: input.buyerUserId.trim() } : {}),
      };
      const raw = await this.client.post<Parameters<typeof mapOrderResponse>[0]>('/public/orders', body, {
        tenantId: t,
      });
      return mapOrderResponse(raw as Parameters<typeof mapOrderResponse>[0]);
    },
    createPayment: async (
      orderId: string,
      tenantId: string,
      provider: 'DEMO' | 'GETNET'
    ) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.post<CreatePaymentResult>(
        `/public/orders/${encodeURIComponent(orderId)}/payments`,
        { provider },
        { tenantId: t }
      );
    },
    confirmDemoPayment: async (orderId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      const createPayment = await this.client.post<{ paymentId: string }>(
        `/public/orders/${encodeURIComponent(orderId)}/payments`,
        { provider: 'DEMO' },
        { tenantId: t }
      );
      const raw = await this.client.post<Parameters<typeof mapOrderResponse>[0]>(
        `/public/payments/${encodeURIComponent(createPayment.paymentId)}/demo-confirm`,
        {},
        { tenantId: t }
      );
      return mapOrderResponse(raw as Parameters<typeof mapOrderResponse>[0]);
    },
    refreshPaymentStatus: async (paymentId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.get<PaymentStatusResult>(
        `/public/payments/${encodeURIComponent(paymentId)}/status`,
        { tenantId: t }
      );
    },
    getOrderPaymentStatus: async (orderId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.get<PaymentStatusResult>(
        `/public/orders/${encodeURIComponent(orderId)}/payment-status`,
        { tenantId: t }
      );
    },
  };

  users: UsersRepo = {
    getMe: async () => {
      return this.client.get<User>('/me');
    },
    getMyTickets: async (userId: string) => {
      const raw = await this.client.get<{ tickets: MeTicketApiRow[] }>('/me/tickets');
      return (raw.tickets ?? []).map(mapMeTicketToTicket);
    },
    createReferrer: async (input: CreateReferrerInput) => {
      return this.client.post<User>('/admin/users/referrer', {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
      });
    },
    getPreferences: async () => {
      const raw = await this.client.get<UserPreferences | null>('/me/preferences');
      if (!raw) return null;
      return {
        ...raw,
        favoriteEventIds: raw.favoriteEventIds ?? [],
        expectedEventIds: raw.expectedEventIds ?? [],
      };
    },
    updatePreferences: async (userId: string, patch: Partial<UserPreferences>) => {
      return this.client.patch<UserPreferences>('/me/preferences', patch);
    },
    list: async (tenantId?: string) => {
      const raw = await this.client.get<{ users?: User[]; data?: User[] }>('/admin/users', {
        tenantId: tenantId ?? this.defaultTenantId,
      });
      const arr = raw.users ?? raw.data ?? [];
      return Array.isArray(arr) ? arr : [];
    },
    updateRole: async (userId: string, role: string) => {
      return this.client.patch<User | null>(`/admin/users/${encodeURIComponent(userId)}/role`, { role });
    },
  };

  reviews: ReviewsRepo = {
    list: async (eventId: string, tenantId: string, page = 1, limit = 20) => {
      const t = tenantId ?? this.defaultTenantId;
      const raw = await this.client.get<ReviewsResponse>(
        `/public/events/${encodeURIComponent(eventId)}/reviews`,
        { tenantId: t, page, limit }
      );
      return raw;
    },
    create: async (eventId: string, body: { score: number; title?: string; comment?: string; guestName?: string }) => {
      return this.client.post<{ id: string }>(`/events/${encodeURIComponent(eventId)}/reviews`, {
        score: body.score,
        title: body.title ?? null,
        comment: body.comment ?? null,
        ...(body.guestName?.trim() ? { guestName: body.guestName.trim() } : {}),
      });
    },
    listForProducer: async (eventId: string) => {
      return this.client.get<{ reviews: ProducerReviewRow[] }>(
        `/producer/events/${encodeURIComponent(eventId)}/reviews`,
      );
    },
  };

  inbox: InboxRepo = {
    listMine: async () => {
      return this.client.get<{ items: InboxItemSummary[] }>('/me/inbox');
    },
    createGastroPromotion: async (body) => {
      return this.client.post<InboxItemSummary>('/me/inbox/gastro-promotion', body);
    },
    createReviewModeration: async (body) => {
      return this.client.post<InboxItemSummary>('/me/inbox/review-moderation', body);
    },
    listAdmin: async (query) => {
      return this.client.get<{ items: InboxItemSummary[] }>('/admin/inbox', query);
    },
    resolveAdmin: async (id, body) => {
      return this.client.post<InboxItemSummary>(
        `/admin/inbox/${encodeURIComponent(id)}/resolve`,
        body,
      );
    },
  };

  referrals: ReferralsRepo = {
    lookup: async (code: string) => {
      const raw = await this.client.get<{
        eventId?: string | null;
        tenantId?: string | null;
        checkoutUrl?: string | null;
      }>('/public/referral/' + encodeURIComponent(code));
      return {
        eventId: raw.eventId ?? null,
        tenantId: raw.tenantId ?? null,
        checkoutUrl: raw.checkoutUrl ?? null,
      };
    },
    listLinks: async (eventId: string) => {
      const raw = await this.client.get<{ links: ReferralLinkSummary[] }>(
        `/events/${encodeURIComponent(eventId)}/referral-links`
      );
      return { links: raw.links ?? [] };
    },
    listLinksByUser: async () => {
      const raw = await this.client.get<{ links: (ReferralLinkSummary & { eventId?: string })[] }>('/me/referral-links');
      return { links: raw.links ?? [] };
    },
    createLink: async (eventId: string, body: { code: string; label?: string; referrerUserId?: string }) => {
      return this.client.post<{ id: string; code: string; url: string; label: string | null }>(
        `/events/${encodeURIComponent(eventId)}/referral-links`,
        { code: body.code, label: body.label ?? null }
      );
    },
    listReferrers: async () => {
      const raw = await this.client.get<ReferrerListItem[]>('/producer/referrers');
      return raw ?? [];
    },
    getAssociatedReferrers: async () => {
      const raw = await this.client.get<ProducerReferrerRelationship[]>('/producer/referrers/associated');
      return Array.isArray(raw) ? raw : [];
    },
    getFreelanceReferrers: async (params?: ProducerFreelanceReferrersParams) => {
      const query: Record<string, string | number | undefined> = {};
      const q = params?.q?.trim();
      if (q) query.q = q;
      if (params?.sort) query.sort = params.sort;
      if (params?.relationship) query.relationship = params.relationship;
      if (params?.activity) query.activity = params.activity;
      if (params?.assignedEvents) query.assignedEvents = params.assignedEvents;
      if (params?.limit != null) query.limit = params.limit;
      const raw = await this.client.get<FreelanceReferrerListItem[]>('/producer/referrers/freelance', query);
      return Array.isArray(raw) ? raw : [];
    },
    setAssociationStatus: async (referrerProfileId, status, notes) => {
      return this.client.post<ProducerReferrerRelationship>(
        `/producer/referrers/${encodeURIComponent(referrerProfileId)}/association`,
        { status, notes }
      );
    },
    getProducerReferrerContext: async () => {
      return this.client.get<ProducerReferrerContext>('/producer/referrers/context');
    },
    requestFreelanceAssociation: async (referrerProfileId: string) => {
      return this.client.post<ProducerReferrerAssociationResult>(
        '/producer/referrers/freelance/request',
        { referrerProfileId },
      );
    },
    associateFromReferrerLink: async (token: string) => {
      return this.client.post<ProducerReferrerAssociationResult>('/producer/referrers/association-from-link', {
        token,
      });
    },
    listReferrerProducerRelationships: async () => {
      const raw = await this.client.get<ReferrerProducerRelationshipRow[]>(
        '/referrer/me/producer-relationships',
      );
      return Array.isArray(raw) ? raw : [];
    },
    respondToProducerAssociation: async (producerProfileId, status, notes) => {
      return this.client.post<ReferrerProducerRelationshipRow>(
        `/referrer/me/producer-relationships/${encodeURIComponent(producerProfileId)}/respond`,
        { status, notes },
      );
    },
    listEventAssignments: async (eventId: string) => {
      return this.client.get<ProducerEventAssignmentsResponse>(
        `/producer/referrers/events/${encodeURIComponent(eventId)}/assignments`,
      );
    },
    assignReferrerToEvent: async (eventId, referrerProfileId, courtesyQuota) => {
      return this.client.post<AssignReferrerToEventResponse>(
        `/producer/referrers/events/${encodeURIComponent(eventId)}/assign`,
        { referrerProfileId, courtesyQuota },
      );
    },
    assignReferrersToEventLegacy: async (eventId: string, referrerIds: string[]) => {
      const raw = await this.client.put<{ links: ReferralLinkSummary[] }>(
        `/events/${encodeURIComponent(eventId)}/referrals`,
        { referrerIds }
      );
      return { links: raw.links ?? [] };
    },
    listCommissionsByUser: async () => {
      const raw = await this.client.get<{ commissions: ReferralCommission[] }>('/me/commissions');
      return raw.commissions ?? [];
    },
    requestCommission: async (referrerId: string, referralLinkId: string) => {
      return this.client.post<ReferralCommission>('/me/commissions/request', { referralLinkId });
    },
    listCommissionRequestsForEvent: async (eventId: string) => {
      const raw = await this.client.get<ReferralCommission[]>(
        `/producer/events/${encodeURIComponent(eventId)}/commission-requests`
      );
      return Array.isArray(raw) ? raw : [];
    },
    confirmCommissionPayout: async (commissionId: string) => {
      return this.client.post<ReferralCommission | null>(`/admin/commissions/${encodeURIComponent(commissionId)}/confirm`);
    },
  };

  courtesies: CourtesiesRepo = {
    list: async (eventId: string) => {
      const raw = await this.client.get<{ grants: CourtesyGrantSummary[] }>(
        `/events/${encodeURIComponent(eventId)}/courtesies`
      );
      return { grants: raw.grants ?? [] };
    },
    create: async (eventId: string, body: { mode: string; ticketTypeId?: string; quantity: number; note?: string }) => {
      return this.client.post<{ issued: number }>(`/events/${encodeURIComponent(eventId)}/courtesies`, {
        mode: body.mode,
        ticketTypeId: body.ticketTypeId ?? null,
        quantity: body.quantity,
        note: body.note ?? null,
      });
    },
    fetchTicketTypes: async (eventId: string) => {
      const raw = await this.client.get<Array<TicketTypeResponse & { price?: string | number }>>(
        `/events/${encodeURIComponent(eventId)}/ticket-types`
      );
      return raw.map((tt) => ({
        ...tt,
        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price ?? 0,
        capacityAvailable: tt.capacityAvailable ?? (tt as { capacityTotal?: number }).capacityTotal ?? 0,
      }));
    },
  };

  metrics: MetricsRepo = {
    getEventMetrics: async (eventId: string) => {
      const raw = await this.client.get<EventMetrics>(
        `/producer/events/${encodeURIComponent(eventId)}/metrics`
      );
      return raw;
    },
    getPlatformMetrics: async () => {
      return this.client.get<PlatformMetrics>('/admin/platform/metrics');
    },
  };

  producers: ProducersRepo = {
    get: async (id: string) => {
      return this.client.get<ProducerDetail | null>('/public/producers/' + encodeURIComponent(id));
    },
    list: async (query) => {
      return this.client.get<{ producers: ProducerSummary[]; total: number }>('/public/producers', query);
    },
    getMyProfile: async () => {
      return this.client.get<ProducerDetail | null>('/producer/profile');
    },
    updateMyProfile: async (data: any) => {
      return this.client.patch<ProducerDetail>('/producer/profile', data);
    },
  };

  scanner: ScannerRepo = {
    scan: async (qrPayload: string, eventId?: string) => {
      if (!eventId) {
        throw new Error('ApiRepository scanner.scan requires eventId when using API');
      }
      const raw = await this.client.post<{ result: ScanResult; ticketId?: string; ticketTypeName?: string }>(
        '/scanner/scan',
        { eventId, qrPayload }
      );
      const ticket = raw.ticketId
        ? ({ id: raw.ticketId, qrPayload, status: 'USED', eventId } as Ticket)
        : undefined;
      return { result: raw.result as ScanResult, ticket: ticket ?? null };
    },
    listScanLogs: async (eventId?: string, limit = 50) => {
      if (!eventId) return [];
      const raw = await this.client.get<TicketScanLogItem[]>(
        `/scanner/events/${encodeURIComponent(eventId)}/logs`,
        { limit }
      );
      return Array.isArray(raw) ? raw : [];
    },
  };

  payouts: PayoutsRepo = {
    listAll: async (tenantId?: string) => {
      const raw = await this.client.get<PayoutRequest[]>('/admin/payouts');
      return Array.isArray(raw) ? raw : [];
    },
    listByProducer: async (producerId: string, tenantId?: string) => {
      const raw = await this.client.get<PayoutRequest[]>('/producer/payouts');
      return Array.isArray(raw) ? raw : [];
    },
    listByEvent: async (eventId: string) => {
      const raw = await this.client.get<PayoutRequest[]>(
        `/producer/events/${encodeURIComponent(eventId)}/payouts`
      );
      return Array.isArray(raw) ? raw : [];
    },
    updateStatus: async (payoutId: string, status: PayoutStatus) => {
      return this.client.patch<PayoutRequest>(`/admin/payouts/${encodeURIComponent(payoutId)}`, {
        status,
      });
    },
    create: async (input) => {
      return this.client.post<PayoutRequest>('/producer/payouts', {
        eventId: input.eventId,
        amountCents: input.amountCents,
        bankInfo: input.bankInfo,
      });
    },
  };

  gastro: GastroRepo = {
    listContent: async (eventId: string) => {
      const raw = await this.client.get<GastroContent[]>(`/gastro/events/${encodeURIComponent(eventId)}/content`);
      return Array.isArray(raw) ? raw : [];
    },
    createContent: async (eventId: string, input) => {
      return this.client.post<GastroContent>(`/gastro/events/${encodeURIComponent(eventId)}/content`, input);
    },
    updateContent: async (id: string, patch) => {
      return this.client.patch<GastroContent | null>(`/gastro/content/${encodeURIComponent(id)}`, patch);
    },
    listDiscounts: async (eventId: string) => {
      const raw = await this.client.get<GastroDiscount[]>(`/gastro/events/${encodeURIComponent(eventId)}/discounts`);
      return Array.isArray(raw) ? raw : [];
    },
    createDiscount: async (eventId: string, input) => {
      return this.client.post<GastroDiscount>(`/gastro/events/${encodeURIComponent(eventId)}/discounts`, input);
    },
    updateDiscount: async (id: string, patch) => {
      return this.client.patch<GastroDiscount | null>(`/gastro/discounts/${encodeURIComponent(id)}`, patch);
    },
    listValidations: async (discountId?: string) => {
      const raw = await this.client.get<GastroDiscountValidation[]>(
        '/gastro/validations',
        discountId ? { discountId } : undefined
      );
      return Array.isArray(raw) ? raw : [];
    },
    recordValidation: async (discountId: string, userId?: string, orderId?: string) => {
      return this.client.post<GastroDiscountValidation>('/gastro/validations', {
        discountId,
        userId: userId ?? null,
        orderId: orderId ?? null,
      });
    },
  };

  resale: ResaleRepo = {
    get: async (listingId: string) => {
      return this.client.get<ResaleListing | null>('/resale/listings/' + encodeURIComponent(listingId));
    },
    listActive: async () => {
      const raw = await this.client.get<ResaleListing[]>('/resale/listings/active');
      return Array.isArray(raw) ? raw : [];
    },
    listByEvent: async (eventId: string) => {
      const raw = await this.client.get<ResaleListing[]>(
        `/resale/events/${encodeURIComponent(eventId)}/listings`
      );
      return Array.isArray(raw) ? raw : [];
    },
    create: async (input) => {
      return this.client.post<ResaleListing>('/resale/listings', input);
    },
    purchase: async (listingId: string, buyerUserId: string) => {
      return this.client.post<ResaleListing>(`/resale/listings/${encodeURIComponent(listingId)}/purchase`, {
        buyerUserId,
      });
    },
  };

  platformConfig: PlatformConfigRepo = {
    get: async (_tenantId: string): Promise<PlatformConfig> => {
      return this.client.get<PlatformConfig>('/admin/config');
    },
    update: async (_tenantId: string, patch: { contact?: PlatformConfig['contact']; categories?: PlatformConfig['categories'] }): Promise<PlatformConfig> => {
      return this.client.patch<PlatformConfig>('/admin/config', patch);
    },
  };
}
