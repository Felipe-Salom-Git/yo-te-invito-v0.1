/**
 * ApiRepository — HTTP implementation of Repositories against the backend API.
 */

import { ApiClient, ApiClientError } from '@/lib/api/client';
import type {
  Repositories,
  AuthRepo,
  ApplicationsRepo,
  ProfilesRepo,
  HotelRepo,
  HotelProfile,
  PendingProducerProfile,
  RoleApplication,
  EventsRepo,
  TicketsRepo,
  OrdersRepo,
  UsersRepo,
  MePortalRepo,
  ReviewsRepo,
  InboxRepo,
  InboxItemSummary,
  ProducerReviewRow,
  ReferralsRepo,
  CourtesiesRepo,
  MetricsRepo,
  PayoutsRepo,
  GastroRepo,
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
  CourtesyCreateResult,
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
  ScannerAccountsRepo,
  ScannerAccountsPortal,
  ScanResult,
  TicketScanLogItem,
  PayoutRequest,
  PayoutStatus,
  GastroContent,
  GastroDiscount,
  GastroDiscountValidation,
  GastroDashboardResponse,
  GastroValidationListResponse,
  GastroLocal,
  GastroPortalDiscount,
  PublicGastroLocation,
  PublicGastroLocationDiscount,
  PublicGastroDiscountListItem,
  PublicGastroDiscountDetail,
  PublicGastroDiscountClaimResult,
  PublicGastroDiscountClaimView,
  PublicGastroLocationsRepo,
  PublicHotelLocationsRepo,
  PublicHotelLocation,
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
  ReferralCommercialProposalDto,
  ReferralCommercialProposalList,
  CreateReferralCommercialProposalInput,
  AcceptReferralCommercialProposalResponse,
  ReferralPaymentRequestDto,
  ReferralPaymentRequestList,
  CreateReferralPaymentRequestInput,
  RejectReferralPaymentRequestInput,
  EligibleReferralCommissionsList,
  ProducerReferralMetricsResponse,
  ProducerEventReferralMetricsResponse,
  ReferrerReferralMetricsResponse,
  ReferrerAgreementMetricsResponse,
  PlatformConfig,
  PlatformConfigRepo,
  CreatePaymentResult,
  PaymentStatusResult,
  SubcategoriesRepo,
  ContentTagsRepo,
  CategoryBannersRepo,
  RentalLocationsRepo,
  RentalLocationSummary,
  RentalLocationDetail,
  ExcursionOperatorsRepo,
  ExcursionOperatorSummary,
  ExcursionOperatorDetail,
  GeneralPublicationsRepo,
  AdminProducersRepo,
  AdminProducerDetail,
  AdminProducerListItem,
  AdminProducerEventListItem,
  AdminProducerEventMetrics,
  AdminGastroRepo,
  AdminGastroLocationListItem,
  AdminGastroLocationDetail,
  AdminGastroDiscountListItem,
  AdminGastroDiscountDetail,
  AdminGastroDiscountMetrics,
  AdminGastroPendingDiscountItem,
  PublicSubcategorySummary,
  SubcategoryAdmin,
  ContentMainCategory,
  ContentCategory,
} from './interfaces';

type RawOrderTicket = {
  id: string;
  qrPayload: string;
  status: string;
  ticketTypeName?: string | null;
};

type RawOrderLineItem = {
  id: string;
  ticketTypeId: string;
  ticketTypeName?: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  tickets?: RawOrderTicket[];
};

function mapOrderTicket(t: RawOrderTicket) {
  return {
    id: t.id,
    qrPayload: t.qrPayload,
    status: t.status,
    ticketTypeName: t.ticketTypeName ?? null,
  };
}

function mapOrderLineItem(oi: RawOrderLineItem) {
  return {
    id: oi.id,
    ticketTypeId: oi.ticketTypeId,
    ticketTypeName: oi.ticketTypeName ?? 'Entrada',
    quantity: oi.quantity,
    unitPrice: oi.unitPrice,
    subtotal: oi.subtotal,
    tickets: oi.tickets?.map(mapOrderTicket),
  };
}

function mapOrderResponse(raw: {
  id: string;
  tenantId: string;
  status: string;
  buyerEmail: string;
  totalAmount: string;
  eventId?: string;
  currency?: string;
  createdAt?: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  orderItems?: RawOrderLineItem[];
  tickets?: RawOrderTicket[];
  [k: string]: unknown;
}): Order {
  const orderItems = raw.orderItems?.map(mapOrderLineItem);
  const tickets = (raw.tickets ?? orderItems?.flatMap((oi) => oi.tickets ?? []) ?? []).map(
    mapOrderTicket,
  );
  return {
    id: raw.id,
    tenantId: raw.tenantId,
    eventId: raw.eventId ?? '',
    status: raw.status,
    buyerEmail: raw.buyerEmail,
    totalAmount: raw.totalAmount,
    currency: raw.currency,
    createdAt: raw.createdAt,
    buyerFirstName: raw.buyerFirstName,
    buyerLastName: raw.buyerLastName,
    orderItems,
    tickets,
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
    eventStartAt: item.event.startAt,
    eventVenueName: item.event.venueName ?? undefined,
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
          sort: query.sort,
          ...(query.hasTicketing !== undefined ? { hasTicketing: query.hasTicketing } : {}),
          ...(query.excludeGeneralPublications !== undefined
            ? { excludeGeneralPublications: query.excludeGeneralPublications }
            : {}),
        },
      );
      return raw;
    },
    listCalendarMonth: async (query) =>
      this.client.get<{ data: EventSummary[] }>('/public/events/calendar', {
        tenantId: query.tenantId,
        month: query.month,
        ...(query.category ? { category: query.category } : {}),
        ...(query.subcategorySlug ? { subcategorySlug: query.subcategorySlug } : {}),
        ...(query.subcategoryId ? { subcategoryId: query.subcategoryId } : {}),
      }),
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
    recommended: async (query) => {
      const t = query.tenantId ?? this.defaultTenantId;
      return this.client.get<EventSummary[]>('/public/events/recommended', {
        tenantId: t,
        category: query.category,
        limit: query.limit,
        minValidReviews: query.minValidReviews,
        mode: query.mode ?? 'recommended',
      });
    },
    getDetail: async (eventId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      const raw = await this.client.get<EventDetail | null>('/public/events/' + encodeURIComponent(eventId), {
        tenantId: t,
      });
      return raw;
    },
    recordPublicView: async (eventId: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.post<{ recorded: boolean }>(
        `/public/events/${encodeURIComponent(eventId)}/view`,
        undefined,
        { tenantId: t },
      );
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
    getTicketTypes: async (eventId: string, occurrenceId?: string) => {
      const raw = await this.client.get<Array<TicketTypeResponse & { price?: string | number }>>(
        `/public/events/${encodeURIComponent(eventId)}/ticket-types`,
        this.q(occurrenceId ? { occurrenceId } : {}),
      );
      return raw.map((tt) => ({
        ...tt,
        price: typeof tt.price === 'string' ? parseFloat(tt.price) : tt.price ?? 0,
        capacityAvailable: tt.capacityAvailable ?? (tt as { capacityTotal?: number }).capacityTotal ?? 0,
      }));
    },
    listEventOccurrences: async (eventId: string) => {
      return this.client.get<import('./interfaces').EventOccurrenceWithStats[]>(
        `/producer/events/${encodeURIComponent(eventId)}/occurrences`,
      );
    },
    createEventOccurrence: async (eventId, body) => {
      return this.client.post<import('./interfaces').EventOccurrenceResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/occurrences`,
        body,
      );
    },
    updateEventOccurrence: async (eventId, occurrenceId, body) => {
      return this.client.patch<import('./interfaces').EventOccurrenceResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/occurrences/${encodeURIComponent(occurrenceId)}`,
        body,
      );
    },
    deleteEventOccurrence: async (eventId, occurrenceId) => {
      return this.client.delete<{ ok: true }>(
        `/producer/events/${encodeURIComponent(eventId)}/occurrences/${encodeURIComponent(occurrenceId)}`,
      );
    },
    listDateChangeRequests: async (eventId, query) => {
      return this.client.get(
        `/producer/events/${encodeURIComponent(eventId)}/date-change-requests`,
        query as Record<string, string>,
      );
    },
    approveDateChangeRequest: async (requestId) => {
      return this.client.post(
        `/producer/date-change-requests/${encodeURIComponent(requestId)}/approve`,
      );
    },
    rejectDateChangeRequest: async (requestId, body) => {
      return this.client.post(
        `/producer/date-change-requests/${encodeURIComponent(requestId)}/reject`,
        body ?? {},
      );
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
        eventMode: (input as { eventMode?: 'PUBLICITY_ONLY' | 'TICKETED' }).eventMode ?? 'TICKETED',
        ...((input as { tagIds?: string[] }).tagIds?.length
          ? { tagIds: (input as { tagIds?: string[] }).tagIds }
          : {}),
      };
      return this.client.post<EventDetail>('/producer/events', body) as Promise<EventDetail>;
    },
    update: async (eventId: string, patch) => {
      return this.client.patch<EventDetail | null>(
        '/producer/events/' + encodeURIComponent(eventId),
        patch
      ) as Promise<EventDetail | null>;
    },
    getEventPublicationLegalStatus: async (eventId) => {
      return this.client.get<import('@yo-te-invito/shared').EventPublicationLegalStatus>(
        `/producer/events/${encodeURIComponent(eventId)}/legal/publication-terms`,
      );
    },
    acceptEventPublicationTerms: async (eventId) => {
      return this.client.post<import('@yo-te-invito/shared').EventPublicationLegalAcceptResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/legal/accept-publication-terms`,
        {},
      );
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

  generalPublications: GeneralPublicationsRepo = {
    list: async (params) =>
      this.client.get<{
        data: EventSummary[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/admin/general-publications', {
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.category ? { category: params.category } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      }),
    create: async (input) =>
      this.client.post<{ id: string; title: string; category: string | null; status: string }>(
        '/admin/general-publications',
        input,
      ),
  };

  adminProducers: AdminProducersRepo = {
    listProducers: async (params) =>
      this.client.get<{
        data: AdminProducerListItem[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/admin/producers', {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.hasPendingEvents ? { hasPendingEvents: true } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      }),
    getProducer: async (producerId) =>
      this.client.get<AdminProducerDetail>(
        `/admin/producers/${encodeURIComponent(producerId)}`,
      ),
    listProducerEvents: async (producerId) =>
      this.client.get<{ data: AdminProducerEventListItem[] }>(
        `/admin/producers/${encodeURIComponent(producerId)}/events`,
      ),
    getProducerEventMetrics: async (producerId, eventId) =>
      this.client.get<AdminProducerEventMetrics>(
        `/admin/producers/${encodeURIComponent(producerId)}/events/${encodeURIComponent(eventId)}/metrics`,
      ),
    approveProducerEvent: async (producerId, eventId) =>
      this.client.post<{ id: string; status: string }>(
        `/admin/producers/${encodeURIComponent(producerId)}/events/${encodeURIComponent(eventId)}/approve`,
        {},
      ),
    rejectProducerEvent: async (producerId, eventId, reason) =>
      this.client.post<{ id: string; status: string }>(
        `/admin/producers/${encodeURIComponent(producerId)}/events/${encodeURIComponent(eventId)}/reject`,
        { reason },
      ),
    postponeProducerEvent: async (producerId, eventId, reason, newStartAt) =>
      this.client.post<{ id: string; status: string }>(
        `/admin/producers/${encodeURIComponent(producerId)}/events/${encodeURIComponent(eventId)}/postpone`,
        { reason, ...(newStartAt ? { newStartAt } : {}) },
      ),
    cancelProducerEvent: async (producerId, eventId, reason) =>
      this.client.post<{ id: string; status: string }>(
        `/admin/producers/${encodeURIComponent(producerId)}/events/${encodeURIComponent(eventId)}/cancel`,
        { reason },
      ),
  };

  excursionOperators: ExcursionOperatorsRepo = {
    listAdmin: async (query) =>
      this.client.get<{ data: ExcursionOperatorSummary[] }>('/admin/excursion-operators', {
        ...(query?.tenantId ? { tenantId: query.tenantId } : {}),
        ...(query?.includeInactive ? { includeInactive: true } : {}),
      }),
    getAdmin: async (id) =>
      this.client.get<ExcursionOperatorDetail>(
        `/admin/excursion-operators/${encodeURIComponent(id)}`,
      ),
    create: async (input) =>
      this.client.post<ExcursionOperatorSummary>('/admin/excursion-operators', input),
    update: async (id, patch) =>
      this.client.patch<ExcursionOperatorSummary>(
        `/admin/excursion-operators/${encodeURIComponent(id)}`,
        patch,
      ),
    remove: async (id) =>
      this.client.delete<{ ok: true }>(
        `/admin/excursion-operators/${encodeURIComponent(id)}`,
      ),
    createExcursion: async (operatorId, input) =>
      this.client.post<{ id: string; title: string }>(
        `/admin/excursion-operators/${encodeURIComponent(operatorId)}/excursions`,
        input,
      ),
    updateExcursion: async (operatorId, excursionId, patch) =>
      this.client.patch<{ id: string; title: string }>(
        `/admin/excursion-operators/${encodeURIComponent(operatorId)}/excursions/${encodeURIComponent(excursionId)}`,
        patch,
      ),
  };

  categoryBanners: CategoryBannersRepo = {
    getPublic: async (tenantId, category) => {
      const t = tenantId || this.defaultTenantId;
      return this.client.get<{ mode: 'automatic' | 'manual'; data: import('./interfaces').CategoryBannerResolvedItem[] }>(
        '/public/category-banners',
        { tenantId: t, category },
      );
    },
    getAdmin: async (category) =>
      this.client.get<{ mode: 'automatic' | 'manual'; items: import('./interfaces').CategoryBannerAdminItem[] }>(
        '/admin/category-banners',
        { category },
      ),
    updateAdmin: async (category, items) =>
      this.client.put<{ mode: 'automatic' | 'manual'; items: import('./interfaces').CategoryBannerAdminItem[] }>(
        `/admin/category-banners/${encodeURIComponent(category)}`,
        { items },
      ),
    removeAdminItem: async (category, itemId) =>
      this.client.delete<{ mode: 'automatic' | 'manual'; items: import('./interfaces').CategoryBannerAdminItem[] }>(
        `/admin/category-banners/${encodeURIComponent(category)}/${encodeURIComponent(itemId)}`,
      ),
  };

  categoryEditorialBanners: import('./interfaces').CategoryEditorialBannersRepo = {
    getPublic: async (tenantId, category) => {
      const t = tenantId || this.defaultTenantId;
      return this.client.get<{ data: import('./interfaces').CategoryEditorialBannerPublicItem[] }>(
        '/public/category-editorial-banners',
        { tenantId: t, category },
      );
    },
    listAdmin: async (category) =>
      this.client.get<{ data: import('./interfaces').CategoryEditorialBannerItem[] }>(
        '/admin/category-editorial-banners',
        { category },
      ),
    create: async (input) =>
      this.client.post<{ data: import('./interfaces').CategoryEditorialBannerItem[] }>(
        '/admin/category-editorial-banners',
        input,
      ),
    update: async (id, patch) =>
      this.client.patch<{ data: import('./interfaces').CategoryEditorialBannerItem[] }>(
        `/admin/category-editorial-banners/${encodeURIComponent(id)}`,
        patch,
      ),
    reorder: async (id, direction) =>
      this.client.post<{ data: import('./interfaces').CategoryEditorialBannerItem[] }>(
        `/admin/category-editorial-banners/${encodeURIComponent(id)}/reorder`,
        { direction },
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

  contentTags: ContentTagsRepo = {
    listPublic: async (tenantId, category) => {
      const raw = await this.client.get<{ data: import('./interfaces').ContentTagPublic[] }>(
        '/public/tags',
        {
          tenantId: tenantId ?? this.defaultTenantId,
          ...(category ? { category } : {}),
        },
      );
      return raw.data;
    },
    listAdmin: async (params) =>
      this.client.get<{
        data: import('./interfaces').ContentTagAdmin[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/admin/tags', params as Record<string, string | number | boolean | undefined>),
    create: async (input) =>
      this.client.post<import('./interfaces').ContentTagAdmin>('/admin/tags', input),
    update: async (id, patch) =>
      this.client.patch<import('./interfaces').ContentTagAdmin>(
        `/admin/tags/${encodeURIComponent(id)}`,
        patch,
      ),
    archive: async (id) =>
      this.client.post<import('./interfaces').ContentTagAdmin>(
        `/admin/tags/${encodeURIComponent(id)}/archive`,
        {},
      ),
    restore: async (id) =>
      this.client.post<import('./interfaces').ContentTagAdmin>(
        `/admin/tags/${encodeURIComponent(id)}/restore`,
        {},
      ),
  };

  auth: AuthRepo = {
    register: async (body) => this.client.post('/auth/register', body),
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
      return this.client.get<{ profile: HotelProfile | null }>('/hotel/me');
    },
    updateMe: async (input) => {
      return this.client.patch<{ profile: HotelProfile }>('/hotel/me', input);
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
    getCheckoutPaymentStatus: async (orderId, tenantId, options) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.get<import('@yo-te-invito/shared').CheckoutPaymentStatusResponse>(
        `/public/orders/${encodeURIComponent(orderId)}/checkout-status`,
        {
          tenantId: t,
          ...(options?.paymentId ? { paymentId: options.paymentId } : {}),
          ...(options?.cancelled ? { cancelled: '1' } : {}),
        },
      );
    },
    refreshCheckoutPaymentStatus: async (paymentId, tenantId) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.post<import('@yo-te-invito/shared').CheckoutPaymentStatusResponse>(
        `/public/payments/${encodeURIComponent(paymentId)}/refresh-status`,
        {},
        { tenantId: t },
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
      const portal = await this.client.get<import('@yo-te-invito/shared').UserPortalPreferences>(
        '/me/preferences',
      );
      return {
        userId: portal.userId,
        preferredCity: portal.preferredCity,
        notifyNewEvents: portal.webNotificationsEnabled,
        notifyReminders: portal.ticketReminder24hEnabled,
        favoriteEventIds: [],
        expectedEventIds: [],
      };
    },
    updatePreferences: async (_userId: string, patch: Partial<UserPreferences>) => {
      const portalPatch: import('@yo-te-invito/shared').UserPortalPreferencesPatch = {};
      if (patch.preferredCity !== undefined) portalPatch.preferredCity = patch.preferredCity;
      if (patch.notifyNewEvents !== undefined) {
        portalPatch.webNotificationsEnabled = patch.notifyNewEvents;
      }
      if (patch.notifyReminders !== undefined) {
        portalPatch.ticketReminder24hEnabled = patch.notifyReminders;
      }
      const portal = await this.client.patch<import('@yo-te-invito/shared').UserPortalPreferences>(
        '/me/preferences',
        portalPatch,
      );
      return {
        userId: portal.userId,
        preferredCity: portal.preferredCity,
        notifyNewEvents: portal.webNotificationsEnabled,
        notifyReminders: portal.ticketReminder24hEnabled,
        favoriteEventIds: [],
        expectedEventIds: [],
      };
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
    createPublic: async (body) => {
      return this.client.post<{ id: string }>('/me/reviews', body);
    },
    getSummary: async (category, entityId, tenantId) => {
      return this.client.get('/public/reviews/summary', {
        tenantId,
        category,
        entityId,
      });
    },
    listPublicV2: async (category, entityId, tenantId, page = 1, limit = 20, filters) => {
      return this.client.get('/public/reviews', {
        tenantId,
        category,
        entityId,
        page,
        limit,
        ...filters,
      });
    },
    getUserReviewProfile: async (userId, tenantId) => {
      return this.client.get(
        `/public/users/${encodeURIComponent(userId)}/review-profile`,
        { tenantId },
      );
    },
    listUserPublicReviews: async (userId, tenantId, page = 1, limit = 20, filters) => {
      return this.client.get(
        `/public/users/${encodeURIComponent(userId)}/reviews`,
        { tenantId, page, limit, ...filters },
      );
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
    listProducerReferralProposals: async () => {
      return this.client.get<ReferralCommercialProposalList>('/producer/referrals/proposals');
    },
    getProducerReferralProposal: async (proposalId: string) => {
      return this.client.get<ReferralCommercialProposalDto>(
        `/producer/referrals/proposals/${encodeURIComponent(proposalId)}`,
      );
    },
    createProducerReferralProposal: async (body: CreateReferralCommercialProposalInput) => {
      return this.client.post<ReferralCommercialProposalDto>('/producer/referrals/proposals', body);
    },
    cancelProducerReferralProposal: async (proposalId: string) => {
      return this.client.post<ReferralCommercialProposalDto>(
        `/producer/referrals/proposals/${encodeURIComponent(proposalId)}/cancel`,
      );
    },
    listReferrerProposals: async () => {
      return this.client.get<ReferralCommercialProposalList>('/referrer/proposals');
    },
    getReferrerProposal: async (proposalId: string) => {
      return this.client.get<ReferralCommercialProposalDto>(
        `/referrer/proposals/${encodeURIComponent(proposalId)}`,
      );
    },
    acceptReferrerProposal: async (proposalId: string) => {
      return this.client.post<AcceptReferralCommercialProposalResponse>(
        `/referrer/proposals/${encodeURIComponent(proposalId)}/accept`,
      );
    },
    rejectReferrerProposal: async (proposalId: string) => {
      return this.client.post<ReferralCommercialProposalDto>(
        `/referrer/proposals/${encodeURIComponent(proposalId)}/reject`,
      );
    },
    listReferrerEligibleCommissions: async () => {
      return this.client.get<EligibleReferralCommissionsList>(
        '/referrer/payment-requests/eligible-commissions',
      );
    },
    listReferrerPaymentRequests: async () => {
      return this.client.get<ReferralPaymentRequestList>('/referrer/payment-requests');
    },
    getReferrerPaymentRequest: async (id: string) => {
      return this.client.get<ReferralPaymentRequestDto>(
        `/referrer/payment-requests/${encodeURIComponent(id)}`,
      );
    },
    createReferrerPaymentRequest: async (body: CreateReferralPaymentRequestInput) => {
      return this.client.post<ReferralPaymentRequestDto>('/referrer/payment-requests', body);
    },
    cancelReferrerPaymentRequest: async (id: string) => {
      return this.client.post<ReferralPaymentRequestDto>(
        `/referrer/payment-requests/${encodeURIComponent(id)}/cancel`,
      );
    },
    listProducerReferralPaymentRequests: async () => {
      return this.client.get<ReferralPaymentRequestList>('/producer/referrals/payment-requests');
    },
    getProducerReferralPaymentRequest: async (id: string) => {
      return this.client.get<ReferralPaymentRequestDto>(
        `/producer/referrals/payment-requests/${encodeURIComponent(id)}`,
      );
    },
    markProducerReferralPaymentRequestInReview: async (id: string) => {
      return this.client.post<ReferralPaymentRequestDto>(
        `/producer/referrals/payment-requests/${encodeURIComponent(id)}/mark-in-review`,
      );
    },
    markProducerReferralPaymentRequestPaid: async (id: string) => {
      return this.client.post<ReferralPaymentRequestDto>(
        `/producer/referrals/payment-requests/${encodeURIComponent(id)}/mark-paid`,
      );
    },
    rejectProducerReferralPaymentRequest: async (
      id: string,
      body: RejectReferralPaymentRequestInput,
    ) => {
      return this.client.post<ReferralPaymentRequestDto>(
        `/producer/referrals/payment-requests/${encodeURIComponent(id)}/reject`,
        body,
      );
    },
    getProducerReferralMetrics: async () => {
      return this.client.get<ProducerReferralMetricsResponse>('/producer/referrals/metrics');
    },
    getProducerEventReferralMetrics: async (eventId: string) => {
      return this.client.get<ProducerEventReferralMetricsResponse>(
        `/producer/events/${encodeURIComponent(eventId)}/referrals/metrics`,
      );
    },
    getReferrerReferralMetrics: async () => {
      return this.client.get<ReferrerReferralMetricsResponse>('/referrer/metrics');
    },
    getReferrerAgreementMetrics: async (agreementId: string) => {
      return this.client.get<ReferrerAgreementMetricsResponse>(
        `/referrer/agreements/${encodeURIComponent(agreementId)}/metrics`,
      );
    },
  };

  courtesies: CourtesiesRepo = {
    list: async (eventId: string) => {
      const raw = await this.client.get<{ grants: CourtesyGrantSummary[] }>(
        `/events/${encodeURIComponent(eventId)}/courtesies`
      );
      return { grants: raw.grants ?? [] };
    },
    create: async (eventId, body) => {
      return this.client.post<CourtesyCreateResult>(
        `/events/${encodeURIComponent(eventId)}/courtesies`,
        {
          mode: body.mode,
          ticketTypeId: body.ticketTypeId ?? null,
          quantity: body.quantity,
          note: body.note ?? null,
        },
      );
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

  adminDashboard: import('./interfaces').AdminDashboardRepo = {
    getDashboard: async () => {
      return this.client.get<import('./interfaces').AdminDashboardResponse>('/admin/dashboard');
    },
  };

  adminEvents: import('./interfaces').AdminEventsRepo = {
    list: async (query) => {
      return this.client.get<import('./interfaces').AdminEventsListResponse>(
        '/admin/events',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
  };

  adminContentLifecycle: import('./interfaces').AdminContentLifecycleRepo = {
    pauseEvent: async (eventId, reason) => {
      return this.client.post<{ id: string; status: string }>(
        `/admin/events/${encodeURIComponent(eventId)}/pause`,
        reason ? { reason } : {},
      );
    },
    restoreEvent: async (eventId, reason) => {
      return this.client.post<{ id: string; status: string }>(
        `/admin/events/${encodeURIComponent(eventId)}/restore`,
        reason ? { reason } : {},
      );
    },
    deactivateRentalLocation: async (locationId, reason) => {
      return this.client.post<{ id: string; isActive: boolean }>(
        `/admin/rental-locations/${encodeURIComponent(locationId)}/deactivate`,
        reason ? { reason } : {},
      );
    },
    activateRentalLocation: async (locationId, reason) => {
      return this.client.post<{ id: string; isActive: boolean }>(
        `/admin/rental-locations/${encodeURIComponent(locationId)}/activate`,
        reason ? { reason } : {},
      );
    },
    deactivateExcursionOperator: async (operatorId, reason) => {
      return this.client.post<{ id: string; isActive: boolean }>(
        `/admin/excursion-operators/${encodeURIComponent(operatorId)}/deactivate`,
        reason ? { reason } : {},
      );
    },
    activateExcursionOperator: async (operatorId, reason) => {
      return this.client.post<{ id: string; isActive: boolean }>(
        `/admin/excursion-operators/${encodeURIComponent(operatorId)}/activate`,
        reason ? { reason } : {},
      );
    },
    suspendHotelProfile: async (profileId, reason) => {
      return this.client.post<{ id: string; status: string }>(
        `/admin/hotel-profiles/${encodeURIComponent(profileId)}/suspend`,
        reason ? { reason } : {},
      );
    },
    activateHotelProfile: async (profileId, reason) => {
      return this.client.post<{ id: string; status: string }>(
        `/admin/hotel-profiles/${encodeURIComponent(profileId)}/activate`,
        reason ? { reason } : {},
      );
    },
  };

  adminHotelProfiles: import('./interfaces').AdminHotelProfilesRepo = {
    list: async (query) => {
      return this.client.get<import('./interfaces').AdminHotelProfilesListResponse>(
        '/admin/hotel-profiles',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
  };

  adminAudit: import('./interfaces').AdminAuditRepo = {
    listLogs: async (query) => {
      return this.client.get<import('./interfaces').AuditLogsListResponse>(
        '/admin/audit-logs',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
  };

  adminUsers: import('./interfaces').AdminUsersRepo = {
    list: async (query) => {
      return this.client.get<import('./interfaces').AdminUsersListResponse>(
        '/admin/users',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
    updateRole: async (userId, role) => {
      return this.client.patch<User | null>(
        `/admin/users/${encodeURIComponent(userId)}/role`,
        { role },
      );
    },
  };

  adminPayments: import('./interfaces').AdminPaymentsRepo = {
    list: async (query) => {
      return this.client.get<import('./interfaces').AdminPaymentsListResponse>(
        '/admin/payments',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
    getDetail: async (paymentId) => {
      return this.client.get<import('./interfaces').AdminPaymentDetail>(
        `/admin/payments/${encodeURIComponent(paymentId)}`,
      );
    },
    reconcile: async (paymentId) => {
      return this.client.post<import('./interfaces').AdminPaymentReconcileResponse>(
        `/admin/payments/${encodeURIComponent(paymentId)}/reconcile`,
      );
    },
    markReviewed: async (paymentId, input) => {
      return this.client.post<import('./interfaces').AdminPaymentMarkReviewedResponse>(
        `/admin/payments/${encodeURIComponent(paymentId)}/mark-reviewed`,
        input,
      );
    },
  };

  legalDocuments: import('./interfaces').LegalDocumentsRepo = {
    listAdminLegalDocuments: async (query) => {
      return this.client.get<import('./interfaces').AdminLegalDocumentListResponse>(
        '/admin/legal-documents',
        query as Record<string, string | number | boolean | undefined>,
      );
    },
    getAdminLegalDocument: async (key) => {
      return this.client.get<import('./interfaces').AdminLegalDocumentDetail>(
        `/admin/legal-documents/${encodeURIComponent(key)}`,
      );
    },
    getAdminLegalDocumentVersions: async (key) => {
      return this.client.get<import('./interfaces').AdminLegalDocumentVersionsListResponse>(
        `/admin/legal-documents/${encodeURIComponent(key)}/versions`,
      );
    },
    updateAdminLegalDocument: async (key, payload) => {
      return this.client.patch<import('./interfaces').AdminLegalDocumentMutationResponse>(
        `/admin/legal-documents/${encodeURIComponent(key)}`,
        payload,
      );
    },
    saveAdminLegalDocumentDraft: async (key, payload) => {
      return this.client.post<import('./interfaces').AdminLegalDocumentMutationResponse>(
        `/admin/legal-documents/${encodeURIComponent(key)}/draft`,
        payload,
      );
    },
    publishAdminLegalDocument: async (key, payload) => {
      return this.client.post<import('./interfaces').AdminLegalDocumentMutationResponse>(
        `/admin/legal-documents/${encodeURIComponent(key)}/publish`,
        payload ?? {},
      );
    },
    getPublicLegalDocument: async (tenantId, slug) => {
      return this.client.get<import('./interfaces').PublicLegalDocumentResponse>(
        `/public/legal/${encodeURIComponent(slug)}`,
        { tenantId },
      );
    },
    getPublicLegalRequirements: async (query) => {
      return this.client.get<import('./interfaces').PublicLegalRequirementsResponse>(
        '/public/legal/requirements',
        query as Record<string, string | undefined>,
      );
    },
    getMyLegalRequirements: async (query) => {
      return this.client.get<import('./interfaces').MeLegalRequirementsResponse>(
        '/me/legal/requirements',
        query as Record<string, string | undefined>,
      );
    },
    acceptMyLegalDocuments: async (payload) => {
      return this.client.post<import('./interfaces').MeLegalAcceptResponse>(
        '/me/legal/accept',
        payload,
      );
    },
    getMyLegalAcceptances: async () => {
      return this.client.get<import('./interfaces').MeLegalAcceptanceHistoryResponse>(
        '/me/legal/acceptances',
      );
    },
  };

  producerDashboard: import('./interfaces').ProducerDashboardRepo = {
    getMetrics: async () => {
      return this.client.get<import('./interfaces').ProducerDashboardMetrics>(
        '/producer/dashboard/metrics',
      );
    },
  };

  producers: ProducersRepo = {
    get: async (id: string) => {
      return this.client.get<ProducerDetail | null>('/public/producers/' + encodeURIComponent(id));
    },
    recordPublicView: async (idOrSlug: string, tenantId: string) => {
      const t = tenantId ?? this.defaultTenantId;
      return this.client.post<{ recorded: boolean }>(
        `/public/producers/${encodeURIComponent(idOrSlug)}/view`,
        undefined,
        { tenantId: t },
      );
    },
    list: async (query) => {
      return this.client.get<{ producers: ProducerSummary[]; total: number }>('/public/producers', query);
    },
    getMyProfile: async () => {
      try {
        return await this.client.get<ProducerDetail | null>('/producer/profile');
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 404) return null;
        throw e;
      }
    },
    createMyProfile: async (data) => {
      return this.client.post<ProducerDetail>('/producer/profile', data);
    },
    updateMyProfile: async (data: import('@yo-te-invito/shared').UpdateProducerProfileInput) => {
      return this.client.patch<ProducerDetail>('/producer/profile', data);
    },
    updateMyProfileIdentity: async (data) => {
      return this.client.patch<ProducerDetail>('/producer/profile', data);
    },
    updateMyProfileImages: async (data) => {
      return this.client.patch<ProducerDetail>('/producer/profile', data);
    },
    updateMyProfileContact: async (data) => {
      return this.client.patch<ProducerDetail>('/producer/profile', data);
    },
    getReviewsSummary: async (idOrSlug: string) => {
      return this.client.get<import('./interfaces').ProducerReviewsSummary>(
        `/public/producers/${encodeURIComponent(idOrSlug)}/reviews-summary`,
      );
    },
    listReviews: async (idOrSlug, query) => {
      return this.client.get<{
        reviews: import('./interfaces').ProducerReviewListItem[];
        page: number;
        total: number;
      }>(`/public/producers/${encodeURIComponent(idOrSlug)}/reviews`, query);
    },
  };

  producerReviews: import('./interfaces').ProducerReviewsRepo = {
    reply: async (reviewId, payload) => {
      return this.client.post(
        `/producer/reviews/${encodeURIComponent(reviewId)}/reply`,
        payload,
      );
    },
    getSummary: async () => {
      return this.client.get('/producer/reviews/summary');
    },
    listReviews: async (params) => {
      return this.client.get<import('@yo-te-invito/shared').ProducerManagedReviewListResponse>(
        '/producer/reviews',
        params,
      );
    },
    createDispute: async (reviewId, payload) => {
      return this.client.post(`/producer/reviews/${encodeURIComponent(reviewId)}/dispute`, payload);
    },
    getDispute: async (id) => {
      return this.client.get(`/producer/review-disputes/${encodeURIComponent(id)}`);
    },
  };

  gastroReviews: import('./interfaces').ManagedVenueReviewsRepo = {
    reply: async (reviewId, payload) => {
      return this.client.post(
        `/gastro/reviews/${encodeURIComponent(reviewId)}/reply`,
        payload,
      );
    },
    getSummary: async () => {
      return this.client.get('/gastro/reviews/summary');
    },
    listReviews: async (params) => {
      return this.client.get<import('@yo-te-invito/shared').ProducerManagedReviewListResponse>(
        '/gastro/reviews',
        params,
      );
    },
  };

  hotelReviews: import('./interfaces').ManagedVenueReviewsRepo = {
    reply: async (reviewId, payload) => {
      return this.client.post(
        `/hotel/reviews/${encodeURIComponent(reviewId)}/reply`,
        payload,
      );
    },
    getSummary: async () => {
      return this.client.get('/hotel/reviews/summary');
    },
    listReviews: async (params) => {
      return this.client.get<import('@yo-te-invito/shared').ProducerManagedReviewListResponse>(
        '/hotel/reviews',
        params,
      );
    },
  };

  adminReviews: import('./interfaces').AdminReviewsRepo = {
    getReport: async (query) => {
      return this.client.get<import('@yo-te-invito/shared').AdminReviewsReportResponse>(
        '/admin/reviews/report',
        query,
      );
    },
    reply: async (reviewId, payload) => {
      return this.client.post(
        `/admin/reviews/${encodeURIComponent(reviewId)}/reply`,
        payload,
      );
    },
    hide: async (reviewId, payload) => {
      return this.client.post(
        `/admin/reviews/${encodeURIComponent(reviewId)}/hide`,
        payload ?? {},
      );
    },
    restore: async (reviewId, payload) => {
      return this.client.post(
        `/admin/reviews/${encodeURIComponent(reviewId)}/restore`,
        payload ?? {},
      );
    },
  };

  adminReviewDisputes: import('./interfaces').AdminReviewDisputesRepo = {
    list: async (params) => {
      return this.client.get('/admin/review-disputes', params);
    },
    get: async (id) => {
      return this.client.get(`/admin/review-disputes/${encodeURIComponent(id)}`);
    },
    markInReview: async (id, body) => {
      return this.client.post(`/admin/review-disputes/${encodeURIComponent(id)}/mark-in-review`, body ?? {});
    },
    accept: async (id, body) => {
      return this.client.post(`/admin/review-disputes/${encodeURIComponent(id)}/accept`, body ?? {});
    },
    reject: async (id, body) => {
      return this.client.post(`/admin/review-disputes/${encodeURIComponent(id)}/reject`, body ?? {});
    },
    resolve: async (id, body) => {
      return this.client.post(`/admin/review-disputes/${encodeURIComponent(id)}/resolve`, body ?? {});
    },
  };

  commercialReviews: import('./interfaces').CommercialReviewsRepo = {
    listForProducerReferrer: async (referrerProfileId) => {
      return this.client.get(
        `/producer/referrers/${encodeURIComponent(referrerProfileId)}/commercial-reviews`,
      );
    },
    createAsProducer: async (referrerProfileId, payload) => {
      return this.client.post(
        `/producer/referrers/${encodeURIComponent(referrerProfileId)}/commercial-reviews`,
        payload,
      );
    },
    listForReferrerProducer: async (producerProfileId) => {
      return this.client.get(
        `/referrer/me/producer-relationships/${encodeURIComponent(producerProfileId)}/commercial-reviews`,
      );
    },
    createAsReferrer: async (producerProfileId, payload) => {
      return this.client.post(
        `/referrer/me/producer-relationships/${encodeURIComponent(producerProfileId)}/commercial-reviews`,
        payload,
      );
    },
  };

  scannerAccounts: ScannerAccountsRepo = {
    list: async (portal: ScannerAccountsPortal) => {
      const base = portal === 'producer' ? '/producer/scanners' : '/gastro/scanners';
      return this.client.get<import('@yo-te-invito/shared').ScannerAccountsListResponse>(base);
    },
    create: async (portal, body) => {
      const base = portal === 'producer' ? '/producer/scanners' : '/gastro/scanners';
      return this.client.post<import('@yo-te-invito/shared').CreateScannerUserResponse>(base, body);
    },
    updateStatus: async (portal, accountId, isActive) => {
      const base = portal === 'producer' ? '/producer/scanners' : '/gastro/scanners';
      return this.client.patch<import('@yo-te-invito/shared').ScannerAccountSummary>(
        `${base}/${encodeURIComponent(accountId)}`,
        { isActive },
      );
    },
    resetPassword: async (portal, accountId, body = {}) => {
      const base = portal === 'producer' ? '/producer/scanners' : '/gastro/scanners';
      return this.client.post<import('@yo-te-invito/shared').ResetScannerPasswordResponse>(
        `${base}/${encodeURIComponent(accountId)}/reset-password`,
        body,
      );
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
      return this.client.patch<GastroContent>(`/gastro/content/${encodeURIComponent(id)}`, patch);
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
    getDashboard: async () => this.client.get<GastroDashboardResponse>('/gastro/dashboard'),
    listValidations: async (params) => {
      const query = params
        ? {
            discountId: params.discountId,
            from: params.from,
            to: params.to,
            page: params.page,
            limit: params.limit,
          }
        : undefined;
      return this.client.get<GastroValidationListResponse>('/gastro/validations', query);
    },
    recordValidation: async (discountId: string, userId?: string, orderId?: string) => {
      return this.client.post<GastroDiscountValidation>('/gastro/validations', {
        discountId,
        userId: userId ?? null,
        orderId: orderId ?? null,
      });
    },
    getMyLocal: async () => this.client.get<GastroLocal | null>('/gastro/local'),
    createMyLocal: async (payload) => this.client.post<GastroLocal>('/gastro/local', payload),
    updateMyLocal: async (payload) => this.client.patch<GastroLocal>('/gastro/local', payload),
    listMyDiscounts: async () =>
      this.client.get<{ data: GastroPortalDiscount[] }>('/gastro/discounts'),
    getMyDiscount: async (id) =>
      this.client.get<GastroPortalDiscount>(`/gastro/discounts/${encodeURIComponent(id)}`),
    createMyDiscount: async (payload) =>
      this.client.post<GastroPortalDiscount>('/gastro/discounts', payload),
    updateMyDiscount: async (id, payload) =>
      this.client.patch<GastroPortalDiscount>(
        `/gastro/discounts/${encodeURIComponent(id)}`,
        payload,
      ),
  };

  publicHotel: PublicHotelLocationsRepo = {
    getById: async (locationId, tenantId) =>
      this.client.get<PublicHotelLocation>(
        `/public/hotel-locations/${encodeURIComponent(locationId)}`,
        { tenantId },
      ),
    getByPublicEventId: async (eventId, tenantId) =>
      this.client.get<PublicHotelLocation>(
        `/public/hotel-locations/by-event/${encodeURIComponent(eventId)}`,
        { tenantId },
      ),
  };

  publicGastro: PublicGastroLocationsRepo = {
    getById: async (locationId, tenantId) =>
      this.client.get<PublicGastroLocation>(
        `/public/gastro-locations/${encodeURIComponent(locationId)}`,
        { tenantId },
      ),
    getByPublicEventId: async (eventId, tenantId) =>
      this.client.get<PublicGastroLocation>(
        `/public/gastro-locations/by-event/${encodeURIComponent(eventId)}`,
        { tenantId },
      ),
    listDiscounts: async (locationId, tenantId) =>
      this.client.get<{ discounts: PublicGastroLocationDiscount[] }>(
        `/public/gastro-locations/${encodeURIComponent(locationId)}/discounts`,
        { tenantId },
      ),
    list: async (params) =>
      this.client.get<{
        data: Array<{
          id: string;
          publicEventId: string | null;
          displayName: string;
          summary: string | null;
          city: string | null;
          province: string | null;
          bannerUrl: string | null;
          subcategoryName: string | null;
        }>;
      }>('/public/gastro-locations', {
        tenantId: params.tenantId,
        ...(params.city ? { city: params.city } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      }),
    countPublishedDiscounts: async (tenantId) =>
      this.client.get<{ count: number }>('/public/gastro-discounts/count', { tenantId }),
    listPublishedDiscounts: async (params) =>
      this.client.get<{ data: PublicGastroDiscountListItem[] }>('/public/gastro-discounts', {
        tenantId: params.tenantId,
        ...(params.subcategorySlug ? { subcategorySlug: params.subcategorySlug } : {}),
        ...(params.limit ? { limit: params.limit } : {}),
      }),
    getPublishedDiscount: async (discountId, tenantId) =>
      this.client.get<PublicGastroDiscountDetail>(
        `/public/gastro-discounts/${encodeURIComponent(discountId)}`,
        { tenantId },
      ),
    claimDiscount: async (discountId, body) =>
      this.client.post<PublicGastroDiscountClaimResult>(
        `/public/gastro-discounts/${encodeURIComponent(discountId)}/claim`,
        body,
      ),
    getDiscountClaim: async (claimId, params) =>
      this.client.get<PublicGastroDiscountClaimView>(
        `/public/gastro-discounts/claims/${encodeURIComponent(claimId)}`,
        params,
      ),
  };

  adminGastro: AdminGastroRepo = {
    listPendingDiscounts: async () =>
      this.client.get<{ data: AdminGastroPendingDiscountItem[] }>(
        '/admin/gastronomicos/pending-discounts',
      ),
    listLocations: async (params) =>
      this.client.get<{
        data: AdminGastroLocationListItem[];
        meta: { page: number; limit: number; total: number; totalPages: number };
      }>('/admin/gastronomicos', {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.hasPendingDiscounts ? { hasPendingDiscounts: true } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.limit ? { limit: params.limit } : {}),
      }),
    getLocation: async (profileId) =>
      this.client.get<AdminGastroLocationDetail>(
        `/admin/gastronomicos/${encodeURIComponent(profileId)}`,
      ),
    listLocationDiscounts: async (profileId) =>
      this.client.get<{ data: AdminGastroDiscountListItem[] }>(
        '/admin/gastro-discount-tickets',
        { profileId },
      ),
    getDiscount: async (profileId, discountId) =>
      this.client.get<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}`,
        { profileId },
      ),
    getDiscountMetrics: async (profileId, discountId) =>
      this.client.get<AdminGastroDiscountMetrics>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/metrics`,
        { profileId },
      ),
    updatePublication: async (profileId, discountId, body) =>
      this.client.patch<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/publication`,
        body,
        { profileId },
      ),
    markCommissionNegotiation: async (profileId, discountId, note) =>
      this.client.post<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/mark-commission-negotiation`,
        { note: note ?? null },
        { profileId },
      ),
    approve: async (profileId, discountId) =>
      this.client.post<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/approve`,
        {},
        { profileId },
      ),
    reject: async (profileId, discountId, reason, note) =>
      this.client.post<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/reject`,
        { reason, note: note ?? null },
        { profileId },
      ),
    cancel: async (profileId, discountId, reason, note) =>
      this.client.post<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/cancel`,
        { reason, note: note ?? null },
        { profileId },
      ),
    sendQrEmail: async (profileId, discountId) =>
      this.client.post<AdminGastroDiscountDetail>(
        `/admin/gastro-discount-tickets/${encodeURIComponent(discountId)}/send-qr-email`,
        {},
        { profileId },
      ),
    updateLocationStatus: async (profileId, body) =>
      this.client.patch<AdminGastroLocationDetail>(
        `/admin/gastronomicos/${encodeURIComponent(profileId)}/status`,
        body,
      ),
    createLocation: async (body) =>
      this.client.post<AdminGastroLocationDetail>('/admin/gastronomicos', body),
    updateLocation: async (profileId, body) =>
      this.client.patch<AdminGastroLocationDetail>(
        `/admin/gastronomicos/${encodeURIComponent(profileId)}`,
        body,
      ),
  };

  mePortal: MePortalRepo = {
    getDashboard: async () => this.client.get('/me/dashboard'),
    getPreferences: async () => this.client.get('/me/preferences'),
    patchPreferences: async (patch) => this.client.patch('/me/preferences', patch),
    listFavorites: async () => this.client.get('/me/favorites'),
    createFavorite: async (body) => this.client.post('/me/favorites', body),
    deleteFavorite: async (id) => {
      await this.client.delete(`/me/favorites/${encodeURIComponent(id)}`);
    },
    patchFavoriteNotifications: async (id, body) =>
      this.client.patch(`/me/favorites/${encodeURIComponent(id)}/notifications`, body),
    listExpectedEvents: async () => this.client.get('/me/expected-events'),
    createExpectedEvent: async (body) => this.client.post('/me/expected-events', body),
    deleteExpectedEvent: async (id) => {
      await this.client.delete(`/me/expected-events/${encodeURIComponent(id)}`);
    },
    patchExpectedEventNotifications: async (id, body) =>
      this.client.patch(`/me/expected-events/${encodeURIComponent(id)}/notifications`, body),
    getCart: async () => this.client.get('/me/cart'),
    addCartItem: async (body) => this.client.post('/me/cart/items', body),
    patchCartItem: async (itemId, body) =>
      this.client.patch(`/me/cart/items/${encodeURIComponent(itemId)}`, body),
    removeCartItem: async (itemId) =>
      this.client.delete(`/me/cart/items/${encodeURIComponent(itemId)}`),
    getPendingOrders: async () => this.client.get('/me/cart/pending-orders'),
    checkout: async (body) => this.client.post('/me/cart/checkout', body),
    getActivity: async () => this.client.get('/me/activity'),
    getAccount: async () => this.client.get('/me/account'),
    patchAccount: async (body) => this.client.patch('/me/account', body),
    changePassword: async (body) => this.client.post('/me/account/change-password', body),
    getTicketDetail: async (ticketId) =>
      this.client.get(`/me/tickets/${encodeURIComponent(ticketId)}`),
    patchTicketReminder: async (ticketId, body) =>
      this.client.patch(`/me/tickets/${encodeURIComponent(ticketId)}/reminder`, body),
    listTransferOffers: async (query) =>
      this.client.get('/me/ticket-transfer-offers', query as Record<string, string>),
    createTransferOffer: async (ticketId, body) =>
      this.client.post(`/me/tickets/${encodeURIComponent(ticketId)}/transfer-offers`, body),
    cancelTransferOffer: async (offerId) =>
      this.client.post(`/me/ticket-transfer-offers/${encodeURIComponent(offerId)}/cancel`),
    acceptTransferOffer: async (token) =>
      this.client.post(`/me/ticket-transfer-offers/${encodeURIComponent(token)}/accept`),
    lookupTransferOffer: async (token) =>
      this.client.get(`/me/ticket-transfer-offers/lookup/${encodeURIComponent(token)}`),
    rejectTransferOffer: async (offerId) =>
      this.client.post(`/me/ticket-transfer-offers/${encodeURIComponent(offerId)}/reject`),
    getTicketDateChangeOptions: async (ticketId) =>
      this.client.get(`/me/tickets/${encodeURIComponent(ticketId)}/date-change-options`),
    createTicketDateChangeRequest: async (ticketId, body) =>
      this.client.post(`/me/tickets/${encodeURIComponent(ticketId)}/date-change-requests`, body),
    listNotifications: async () => this.client.get('/me/notifications'),
    getNotificationsUnreadCount: async () => this.client.get('/me/notifications/unread-count'),
    markNotificationRead: async (notificationId) =>
      this.client.patch(`/me/notifications/${encodeURIComponent(notificationId)}/read`),
    markAllNotificationsRead: async () => this.client.post('/me/notifications/read-all'),
    listProducerFollows: async () => this.client.get('/me/producer-follows'),
    getProducerFollowStatus: async (producerProfileId) =>
      this.client.get('/me/producer-follows/status', { producerProfileId }),
    createProducerFollow: async (body) => this.client.post('/me/producer-follows', body),
    deleteProducerFollow: async (id) => {
      await this.client.delete(`/me/producer-follows/${encodeURIComponent(id)}`);
    },
    listGastroFollows: async () => this.client.get('/me/gastro-follows'),
    getGastroFollowStatus: async (gastroProfileId) =>
      this.client.get('/me/gastro-follows/status', { gastroProfileId }),
    createGastroFollow: async (body) => this.client.post('/me/gastro-follows', body),
    deleteGastroFollow: async (id) => {
      await this.client.delete(`/me/gastro-follows/${encodeURIComponent(id)}`);
    },
    patchGastroFollowNotifications: async (id, body) =>
      this.client.patch<import('@yo-te-invito/shared').UserGastroFollow>(
        `/me/gastro-follows/${encodeURIComponent(id)}/notifications`,
        body,
      ),
    getPushSubscriptionsConfig: async () =>
      this.client.get('/me/push-subscriptions/config'),
    listPushSubscriptions: async () => this.client.get('/me/push-subscriptions'),
    registerPushSubscription: async (body) =>
      this.client.post('/me/push-subscriptions', body),
    deactivatePushSubscription: async (body) =>
      this.client.delete('/me/push-subscriptions/current', undefined, body),
    sendTestPushNotification: async (body = {}) =>
      this.client.post('/me/push-subscriptions/test', body),
    getRecommendations: async (limit = 12) =>
      this.client.get('/me/recommendations', { limit: String(limit) }),
  };

  platformConfig: PlatformConfigRepo = {
    get: async (_tenantId: string): Promise<PlatformConfig> => {
      return this.client.get<PlatformConfig>('/admin/config');
    },
    update: async (_tenantId: string, patch: { contact?: PlatformConfig['contact']; categories?: PlatformConfig['categories'] }): Promise<PlatformConfig> => {
      return this.client.patch<PlatformConfig>('/admin/config', patch);
    },
  };

  publicPlatformConfig = {
    get: async (tenantId: string) => {
      return this.client.get<import('./interfaces').PublicPlatformConfig>(
        '/public/platform-config',
        { tenantId },
      );
    },
  };

  uploads: import('./interfaces').UploadsRepo = {
    uploadPublicImage: async (input) => {
      const formData = new FormData();
      formData.append('file', input.file);
      formData.append('scope', input.scope);
      formData.append('purpose', input.purpose);
      if (input.entityId) {
        formData.append('entityId', input.entityId);
      }
      const raw = await this.client.postFormData<unknown>('/uploads/public-image', formData);
      const { publicImageUploadResponseSchema } = await import('@yo-te-invito/shared');
      return publicImageUploadResponseSchema.parse(raw);
    },
  };
}
