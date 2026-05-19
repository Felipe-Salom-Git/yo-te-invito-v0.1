/**
 * Repository interfaces — all UI uses these only.
 * Implemented by ApiRepository (backend API).
 */

// ─── Shared types (minimal, align with API responses) ─────────────────────

export interface EventsListQuery {
  tenantId: string;
  page?: number;
  limit?: number;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  category?: string;
  subcategoryId?: string;
  subcategorySlug?: string;
  producerId?: string;
  status?: string;
  /** When true, use GET /admin/events (all events for approval queue) */
  forAdmin?: boolean;
}

export interface EventsSearchQuery {
  tenantId: string;
  q?: string;
  city?: string;
  category?: string;
  subcategoryId?: string;
  subcategorySlug?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  minRating?: number;
}

export type ContentMainCategory = 'event' | 'gastro' | 'rental' | 'excursion';
export type ContentCategory = ContentMainCategory | 'hotel';

export interface PublicSubcategorySummary {
  id: string;
  category: ContentCategory;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  iconName: string | null;
  sortOrder: number;
}

export interface SubcategoryAdmin extends PublicSubcategorySummary {
  tenantId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RentalLocationSummary {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  openingHours: import('@yo-te-invito/shared').RentalOpeningHours | null;
  openingHoursNote: string | null;
  geoLat: number | null;
  geoLng: number | null;
  isActive: boolean;
  sortOrder: number;
  productCount?: number;
}

export interface RentalLocationDetail extends RentalLocationSummary {
  createdAt: string;
  updatedAt: string;
  products?: Array<{
    id: string;
    title: string;
    startAt: string;
    city: string | null;
    venueName: string | null;
    coverImageUrl: string | null;
    category?: string | null;
    subcategoryId?: string | null;
    description?: string | null;
  }>;
}

export interface RentalLocationsRepo {
  listAdmin(query?: { tenantId?: string; includeInactive?: boolean }): Promise<{
    data: RentalLocationSummary[];
  }>;
  getAdmin(id: string): Promise<RentalLocationDetail>;
  create(input: {
    tenantId?: string;
    name: string;
    address?: string | null;
    openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
    openingHoursNote?: string | null;
    geoLat?: number | null;
    geoLng?: number | null;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<RentalLocationSummary>;
  update(
    id: string,
    patch: {
      name?: string;
      address?: string | null;
      openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
      openingHoursNote?: string | null;
      geoLat?: number | null;
      geoLng?: number | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<RentalLocationSummary>;
  remove(id: string): Promise<{ ok: true }>;
  createProduct(
    locationId: string,
    input: {
      title: string;
      description?: string | null;
      subcategoryId?: string | null;
      headerImageUrl?: string | null;
      galleryImages?: Array<{ url: string; type?: string }>;
      coverImageUrl?: string | null;
      media?: Array<{ id: string; type: string; url: string; sortOrder: number }>;
      status?: string;
    },
  ): Promise<{ id: string; title: string }>;
  updateProduct(
    locationId: string,
    productId: string,
    patch: {
      title?: string;
      description?: string | null;
      subcategoryId?: string | null;
      headerImageUrl?: string | null;
      galleryImages?: Array<{ url: string; type?: string }>;
      coverImageUrl?: string | null;
      media?: Array<{ id: string; type: string; url: string; sortOrder: number }>;
      status?: string;
    },
  ): Promise<{ id: string; title: string }>;
}

export interface SubcategoriesRepo {
  listPublic(tenantId: string, category: ContentMainCategory): Promise<PublicSubcategorySummary[]>;
  listAdmin(category: ContentCategory): Promise<{ data: SubcategoryAdmin[]; comingSoon?: boolean }>;
  create(input: {
    category: ContentMainCategory;
    name: string;
    slug?: string;
    description?: string | null;
    imageUrl?: string | null;
    iconName?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<SubcategoryAdmin>;
  update(
    id: string,
    patch: {
      name?: string;
      slug?: string;
      description?: string | null;
      imageUrl?: string | null;
      iconName?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<SubcategoryAdmin>;
  deactivate(id: string): Promise<SubcategoryAdmin>;
}

export interface EventsPaginatedResponse {
  data: EventSummary[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface EventSummary {
  id: string;
  title: string;
  startAt: string;
  city: string | null;
  venueName: string | null;
  coverImageUrl: string | null;
  category?: string;
  subcategoryId?: string | null;
  producerId?: string;
  status?: string;
  /** API: list with category=gastro may include first active discount teaser */
  gastroPromoLabel?: string | null;
  gastroPromoImageUrl?: string | null;
}

export interface ProducerSummary {
  id: string;
  tenantId: string;
  slug: string | null;
  displayName: string;
  shortDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  country: string | null;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface ProducerDetail extends ProducerSummary {
  longDescription: string | null;
  legalName: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  whatsapp: string | null;
  socialLinks: any;
  events: EventSummary[];
}

export interface EventDetail extends EventSummary {
  description: string | null;
  endAt: string | null;
  venueAddress: string | null;
  geoLat: number | null;
  geoLng: number | null;
  capacityTotal: number | null;
  isTicketingEnabled: boolean;
  status: string;
  media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
  ratingAvg?: number | null;
  ratingCount?: number;
}

export interface Ticket {
  id: string;
  eventId: string;
  qrPayload: string;
  status: 'VALID' | 'USED' | 'REVOKED';
  ownerUserId?: string | null;
  usedAt?: string | null;
  /** From GET /me/tickets when API includes nested event */
  eventTitle?: string;
  ticketTypeName?: string;
  [k: string]: unknown;
}

export interface Order {
  id: string;
  eventId: string;
  status: string;
  buyerEmail: string;
  totalAmount: string | number;
  tickets?: Array<{ id: string; qrPayload: string; status: string }>;
  [k: string]: unknown;
}

export interface MeProfileSummary {
  id: string;
  displayName: string;
  status: string;
  membershipRole?: string;
}

export interface MeAvailableProfiles {
  producer?: { hasAccess: boolean; profiles: MeProfileSummary[] };
  gastro?: { hasAccess: boolean; profiles: MeProfileSummary[] };
  hotel?: { hasAccess: boolean; profiles: MeProfileSummary[] };
  referrer?: { hasAccess: boolean; profiles: MeProfileSummary[] };
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  availableProfiles?: MeAvailableProfiles;
  [k: string]: unknown;
}

export interface ReviewItem {
  id: string;
  score: number;
  title: string | null;
  comment: string | null;
  userName: string;
  createdAt: string;
  officialReply?: string | null;
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  page: number;
  total: number;
}

export interface ProducerReviewRow extends ReviewItem {
  hiddenFromPublic: boolean;
  officialReply: string | null;
}

export interface ReferralLinkSummary {
  id: string;
  code: string;
  label: string | null;
  attributedOrdersCount: number;
  createdAt: string;
  eventId?: string;
  referrerId?: string | null;
  referrerProfileId?: string | null;
}

export interface EventReferrerAssignmentDto {
  id: string;
  eventId: string;
  referrerProfileId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELED';
  courtesyQuota: number;
  courtesyUsedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssignReferrerToEventResponse {
  assignment: EventReferrerAssignmentDto;
  referralLink: {
    id: string;
    code: string;
    url: string;
    label: string | null;
  };
  alreadyAssigned: boolean;
}

export interface ProducerEventAssignmentListItem {
  assignment: EventReferrerAssignmentDto;
  referrerProfile: {
    id: string;
    displayName: string;
    publicHandle: string | null;
    salesScore: number | null;
    completedSales: number;
  };
  referralLink: {
    id: string;
    code: string;
    url: string;
    label: string | null;
    attributedOrdersCount: number;
  } | null;
}

export interface ProducerEventAssignmentsResponse {
  assignments: ProducerEventAssignmentListItem[];
}

export interface ReferrerListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface ReferrerProfileSummary {
  id: string;
  tenantId: string;
  displayName: string;
  publicHandle: string | null;
  bio: string | null;
  salesScore: number | null;
  completedSales: number;
  slug?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  region?: string | null;
  publicVisibility?: boolean;
}

/** Ítem del directorio freelance (productor) con señales para descubrimiento */
export interface FreelanceReferrerListItem extends ReferrerProfileSummary {
  activeAssignedEventsCount: number;
  /** Con tu productora; null si no hay fila (o sin perfil productor en API) */
  relationshipStatusWithProducer: string | null;
}

export type FreelanceReferrersSort =
  | 'default'
  | 'recent'
  | 'name_asc'
  | 'name_desc'
  | 'activity'
  | 'assigned_events'
  | 'completed_sales';

export interface ProducerFreelanceReferrersParams {
  q?: string;
  sort?: FreelanceReferrersSort;
  relationship?: 'any' | 'none' | 'active' | 'pending' | 'closed';
  activity?: 'any' | 'with_sales' | 'no_sales';
  assignedEvents?: 'any' | 'with' | 'without';
  limit?: number;
}

export interface ReferrerOwnProfile {
  id: string;
  tenantId: string;
  displayName: string;
  slug: string | null;
  publicHandle: string | null;
  bio: string | null;
  longBio: string | null;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  region: string | null;
  publicVisibility: boolean;
  associationLinkToken: string;
  salesScore: number | null;
  completedSales: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
}

export interface ReferrerDashboardAssignedEvent {
  eventId: string;
  title: string;
  startAt: string;
  city: string | null;
  venueName: string | null;
  eventStatus: string;
  assignmentStatus: 'ACTIVE' | 'PAUSED' | 'CANCELED';
  referralCode: string | null;
  referralLinkId: string | null;
  courtesyQuota: number;
  courtesyUsedCount: number;
  paidAttributedOrdersCount: number;
  ticketsSoldCount: number;
  grossRevenueFromReferralsCents: number;
}

export interface ReferrerDashboardSaleLink {
  id: string;
  code: string;
  url: string;
  eventId: string;
  eventTitle: string;
  eventStatus: string;
  attributedOrdersTotalCount: number;
  paidAttributedOrdersCount: number;
  ticketsSoldCount: number;
  grossRevenueFromReferralsCents: number;
}

export interface ReferrerDashboardMetrics {
  salesScore: number | null;
  completedSales: number;
  /** Atribuciones registradas (cualquier estado de pago del pedido) */
  attributedOrdersCount: number;
  /** Pedidos con pago confirmado atribuidos a tus links */
  paidAttributedOrdersCount: number;
  ticketsSoldViaPaidReferralsCount: number;
  /** Suma de totalAmount de pedidos PAID atribuidos (centavos) */
  grossRevenueFromPaidReferralsCents: number;
  commissionsPaidCents: number;
  commissionsOutstandingCents: number;
  /** Activas + pendientes (compatibilidad) */
  associatedProducersCount: number;
  activeProducerRelationshipsCount: number;
  pendingProducerRelationshipsCount: number;
  assignedEventsCount: number;
  activeEventReferralLinksCount: number;
  totalRevenueGenerated: null;
  assignedEvents?: ReferrerDashboardAssignedEvent[];
  saleLinks?: ReferrerDashboardSaleLink[];
}

export interface ReferrerDashboardResponse {
  profile: Pick<
    ReferrerOwnProfile,
    | 'id'
    | 'displayName'
    | 'slug'
    | 'status'
    | 'publicVisibility'
    | 'bio'
    | 'avatarUrl'
    | 'coverImageUrl'
    | 'city'
    | 'region'
    | 'associationLinkToken'
    | 'salesScore'
    | 'completedSales'
  > & {
    publicHandle: string | null;
    /** Relative path e.g. `/referrers/juan-perez` (prepend web origin for absolute URL). */
    publicProfilePath: string | null;
  };
  metrics: ReferrerDashboardMetrics;
}

export interface PublicReferrerListItem {
  id: string;
  displayName: string;
  slug: string | null;
  bio: string | null;
  avatarUrl: string | null;
  city: string | null;
  region: string | null;
  salesScore: number | null;
  completedSales: number;
}

export interface PublicReferrersListResponse {
  referrers: PublicReferrerListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface ReferrerAssociationResolveResponse {
  referrerProfile: Pick<
    PublicReferrerListItem,
    'id' | 'displayName' | 'bio' | 'avatarUrl' | 'slug' | 'salesScore' | 'completedSales' | 'city' | 'region'
  >;
}

export interface ProducerReferrerRelationship {
  id: string;
  producerProfileId: string;
  referrerProfileId: string;
  status: string;
  origin: string;
  notes: string | null;
  referrerProfile: ReferrerProfileSummary;
}

export interface ProducerReferrerAssociationResult {
  relationship: ProducerReferrerRelationship;
  created: boolean;
}

/** Vista referidor: relación con una productora (GET /referrer/me/producer-relationships) */
export interface ReferrerSideProducerProfile {
  id: string;
  displayName: string;
  city?: string | null;
  logoUrl?: string | null;
  status?: string;
}

export interface ReferrerProducerRelationshipRow {
  id: string;
  producerProfileId: string;
  referrerProfileId: string;
  status: string;
  origin: string;
  notes: string | null;
  producerProfile: ReferrerSideProducerProfile;
  referrerProfile?: ReferrerProfileSummary;
}

export interface ProducerReferrerContext {
  hasProducerProfile: boolean;
  producerProfileId: string | null;
}

export type ReferralCommissionStatus = 'PENDING' | 'REQUESTED' | 'PAID' | 'REJECTED';

export interface ReferralCommission {
  id: string;
  referrerId: string;
  referralLinkId: string;
  eventId: string;
  amountCents: number;
  status: ReferralCommissionStatus;
  requestedAt: string | null;
  paidAt: string | null;
  confirmedByUserId: string | null;
}

export interface CourtesyGrantSummary {
  id: string;
  mode: string;
  quantity: number;
  issued: number;
  ticketTypeId?: string | null;
  note?: string | null;
  createdAt: string;
}

/** Batch row from producer/public API (aligned with @yo-te-invito/shared). */
export interface TicketBatchResponse {
  id: string;
  ticketTypeId: string;
  orderIndex: number;
  name: string;
  startAt: string;
  endAt: string;
  baseQuantity: number;
  rolloverQuantity: number;
  effectiveQuantity: number;
  reservedQuantity: number;
  soldCount: number;
  price: string | number;
  currency: string;
  status: string;
}

export interface TicketTypeResponse {
  id: string;
  name: string;
  price: string | number;
  capacityAvailable: number;
  capacityTotal?: number;
  eventId?: string;
  description?: string | null;
  currency?: string;
  maxPerOrder?: number;
  status?: string;
  saleStart?: string | null;
  saleEnd?: string | null;
  batches?: TicketBatchResponse[];
  activeTicketBatchId?: string | null;
  /** Present when a custom canvas template exists (Ticket Canvas Studio). */
  ticketTemplateId?: string | null;
  order?: number;
  [k: string]: unknown;
}

export interface TicketTemplateQrZoneClient {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TicketTemplateResponse {
  id: string;
  tenantId: string;
  ticketTypeId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: string;
  backgroundValue: string;
  elementsJson: unknown[];
  qrZoneJson: TicketTemplateQrZoneClient;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface TicketTemplateUpsertInput {
  name?: string;
  canvasWidth?: number;
  canvasHeight?: number;
  backgroundType?: 'SOLID' | 'IMAGE';
  backgroundValue?: string;
  elementsJson?: unknown[];
  qrZoneJson?: TicketTemplateQrZoneClient;
}

export interface TicketTemplatesRepo {
  get(eventId: string, ticketTypeId: string): Promise<{ template: TicketTemplateResponse | null }>;
  upsert(
    eventId: string,
    ticketTypeId: string,
    body: TicketTemplateUpsertInput,
  ): Promise<{ template: TicketTemplateResponse }>;
  delete(eventId: string, ticketTypeId: string): Promise<{ ok: true }>;
}

export interface TicketBatchCreateInput {
  orderIndex: number;
  name: string;
  /** ISO datetime */
  startAt: string;
  endAt: string;
  baseQuantity: number;
  price: number;
}

export interface TicketTypeCreateInput {
  name: string;
  /** Total pool; required. Use `capacityAvailable` only for legacy alias. */
  capacityTotal?: number;
  /** @deprecated use capacityTotal — same value sent as capacityTotal to API */
  capacityAvailable?: number;
  description?: string | null;
  currency?: string;
  maxPerOrder?: number;
  price?: number;
  saleStart?: string | null;
  saleEnd?: string | null;
  /** When set, API creates chained tandas; sum(baseQuantity) must equal capacityTotal. */
  batches?: TicketBatchCreateInput[];
  status?: 'ACTIVE' | 'PAUSED';
  order?: number;
}

export type TicketTypeUpdateInput = Partial<TicketTypeCreateInput> & { eventId: string };

export interface TicketTypesRepo {
  /** Producer: ticket types with optional `batches` + `activeTicketBatchId` from API. */
  list(eventId: string): Promise<TicketTypeResponse[]>;
  create(eventId: string, input: TicketTypeCreateInput): Promise<TicketTypeResponse>;
  update(id: string, patch: TicketTypeUpdateInput): Promise<TicketTypeResponse | null>;
}

export interface EventReferralPerformance {
  referralLinkId: string;
  code: string;
  referrerProfileId: string;
  referrerDisplayName: string | null;
  paidOrdersCount: number;
  ticketsSoldCount: number;
  grossRevenueCents: number;
}

export interface EventMetrics {
  ticketsSold: number;
  courtesyCount: number;
  revenue: string;
  currency: string;
  scanCount: number;
  referralPerformance?: EventReferralPerformance[];
}

export interface PlatformMetrics {
  totalEvents: number;
  activeEvents: number;
  ticketsSold: number;
  totalReviews: number;
  totalScans: number;
  ticketsValidated?: number;
  usageRatePercent?: number;
}

export type PayoutStatus = 'REQUESTED' | 'PENDING' | 'PROCESSING' | 'SENT' | 'REJECTED';

export interface PayoutRequest {
  id: string;
  tenantId: string;
  eventId: string;
  producerId: string;
  status: PayoutStatus;
  amountCents: number;
  bankInfo?: { titular?: string; banco?: string; cbu?: string };
  requestedByUserId: string;
  createdAt: string;
  [k: string]: unknown;
}

export interface PayoutsRepo {
  listByProducer(producerId: string, tenantId?: string): Promise<PayoutRequest[]>;
  listByEvent(eventId: string, tenantId?: string): Promise<PayoutRequest[]>;
  listAll(tenantId?: string): Promise<PayoutRequest[]>;
  updateStatus(payoutId: string, status: PayoutStatus): Promise<PayoutRequest | null>;
  create(input: {
    tenantId: string;
    eventId: string;
    producerId: string;
    amountCents: number;
    bankInfo?: { titular?: string; banco?: string; cbu?: string };
    requestedByUserId: string;
  }): Promise<PayoutRequest>;
}

// ─── Repository interfaces ───────────────────────────────────────────────

/** Public gastro discounts (active window) for restaurant detail. */
export interface PublicGastroDiscountSummary {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  validFrom: string | null;
  validTo: string | null;
  displayTitle?: string | null;
  displayDescription?: string | null;
  displayImageUrls?: string[];
}

export interface EventsRepo {
  list(query: EventsListQuery): Promise<EventsPaginatedResponse>;
  search(query: EventsSearchQuery): Promise<EventsPaginatedResponse>;
  trending(tenantId: string, limit?: number): Promise<EventSummary[]>;
  getDetail(eventId: string, tenantId: string): Promise<EventDetail | null>;
  /** GET /public/events/:id/discounts — empty discounts if event is not gastro. */
  listPublicDiscounts(eventId: string, tenantId: string): Promise<{ discounts: PublicGastroDiscountSummary[] }>;
  /** Event detail for producer portal (includes DRAFT/PENDING). */
  getDetailForProducer(eventId: string): Promise<EventDetail | null>;
  getTicketTypes(eventId: string): Promise<TicketTypeResponse[]>;
  create(input: Partial<EventDetail> & { tenantId: string; producerId?: string }): Promise<EventDetail>;
  update(eventId: string, patch: Partial<EventDetail>): Promise<EventDetail | null>;
}

export interface TicketsRepo {
  listByOwner(userId: string): Promise<Ticket[]>;
  listByEvent(eventId: string): Promise<Ticket[]>;
  get(id: string): Promise<Ticket | null>;
  create(item: Omit<Ticket, 'id'> & { id?: string }): Promise<Ticket>;
  update(id: string, patch: Partial<Ticket>): Promise<Ticket | null>;
  delete(id: string): Promise<boolean>;
}

export interface CreatePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
  checkoutUrl?: string;
  provider?: string;
}

export interface PaymentStatusResult {
  paymentId: string;
  orderId: string;
  status: string;
  orderStatus: string;
}

export interface OrdersRepo {
  get(orderId: string, tenantId: string): Promise<Order | null>;
  listByBuyer(userId: string, tenantId?: string): Promise<Order[]>;
  create(input: {
    tenantId: string;
    eventId: string;
    buyerEmail: string;
    buyerName?: string;
    buyerUserId?: string;
    items: Array<{ ticketTypeId: string; quantity: number; unitPrice: number }>;
    referralCode?: string | null;
  }): Promise<Order>;
  createPayment(
    orderId: string,
    tenantId: string,
    provider: 'DEMO' | 'GETNET'
  ): Promise<CreatePaymentResult>;
  confirmDemoPayment(orderId: string, tenantId: string): Promise<Order>;
  refreshPaymentStatus(paymentId: string, tenantId: string): Promise<PaymentStatusResult>;
  getOrderPaymentStatus(orderId: string, tenantId: string): Promise<PaymentStatusResult>;
}

export interface CreateReferrerInput {
  email: string;
  firstName: string;
  lastName: string;
}

export interface UserPreferences {
  userId: string;
  preferredCity: string | null;
  notifyNewEvents: boolean;
  notifyReminders: boolean;
  favoriteEventIds: string[];
  expectedEventIds: string[];
}

export interface RoleApplication {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  businessName?: string;
  role: string;
  createdAt: string;
}

export interface ApplicationsRepo {
  listPending(tenantId: string): Promise<RoleApplication[]>;
  approve(tenantId: string, applicationId: string): Promise<{ id: string; email: string; role: string }>;
  reject(tenantId: string, applicationId: string): Promise<void>;
}

export interface PendingProducerProfile {
  id: string;
  displayName: string;
  createdByUserId: string;
  createdAt: string;
  websiteUrl?: string;
}

export interface ApplyReferrerBody {
  displayName: string;
  bio?: string;
  longBio?: string;
  avatarUrl?: string;
  city?: string;
  region?: string;
  publicVisibility?: boolean;
}

export interface ProfilesRepo {
  applyProducer(body: { displayName: string; legalName?: string; description?: string; city?: string; country?: string }): Promise<{ id: string; displayName: string; status: string; message: string }>;
  applyGastro(body: { displayName: string; legalName?: string; description?: string; address?: string; city?: string; contactPhone?: string }): Promise<{ id: string; displayName: string; status: string; message: string }>;
  applyHotel(body: {
    displayName: string;
    legalName?: string;
    description?: string;
    address?: string;
    city?: string;
    starCategory?: number;
    contactPhone?: string;
    contactEmail?: string;
    websiteUrl: string;
    bookingUrl?: string;
    socialLinks?: { instagram?: string; facebook?: string; tripadvisor?: string; other?: string };
  }): Promise<{ id: string; displayName: string; status: string; message: string }>;
  applyReferrer(body: ApplyReferrerBody): Promise<{ id: string; displayName: string; status: string; message: string }>;
  getMyReferrerProfile(): Promise<ReferrerOwnProfile>;
  updateMyReferrerProfile(patch: Partial<{
    displayName: string;
    slug: string | null;
    publicHandle: string | null;
    bio: string | null;
    longBio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    city: string | null;
    region: string | null;
    publicVisibility: boolean;
  }>): Promise<ReferrerOwnProfile>;
  getReferrerDashboard(): Promise<ReferrerDashboardResponse>;
  listPublicReferrers(tenantId: string, page?: number, limit?: number): Promise<PublicReferrersListResponse>;
  getPublicReferrerBySlug(
    tenantId: string,
    slug: string,
  ): Promise<PublicReferrerListItem & { longBio: string | null; coverImageUrl: string | null }>;
  resolveReferrerAssociation(tenantId: string, token: string): Promise<ReferrerAssociationResolveResponse>;
  listPendingProducerProfiles(): Promise<{ profiles: PendingProducerProfile[] }>;
  approveProducerProfile(profileId: string): Promise<{ id: string; status: string; message: string }>;
  listPendingGastroProfiles(): Promise<{ profiles: PendingProducerProfile[] }>;
  approveGastroProfile(profileId: string): Promise<{ id: string; status: string; message: string }>;
  listPendingHotelProfiles(): Promise<{ profiles: PendingProducerProfile[] }>;
  approveHotelProfile(profileId: string): Promise<{ id: string; status: string; message: string }>;
  listPendingReferrerProfiles(): Promise<{ profiles: PendingProducerProfile[] }>;
  approveReferrerProfile(profileId: string): Promise<{ id: string; status: string; message: string }>;
}

export interface UsersRepo {
  getMe(userId: string): Promise<User | null>;
  getMyTickets(userId: string): Promise<Ticket[]>;
  createReferrer(input: CreateReferrerInput): Promise<User>;
  getPreferences(userId: string): Promise<UserPreferences | null>;
  updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>;
  list(tenantId?: string): Promise<User[]>;
  updateRole(userId: string, role: string): Promise<User | null>;
}

export interface ReviewsRepo {
  list(eventId: string, tenantId: string, page?: number, limit?: number): Promise<ReviewsResponse>;
  create(eventId: string, body: { score: number; title?: string; comment?: string; guestName?: string }): Promise<{ id: string }>;
  listForProducer(eventId: string): Promise<{ reviews: ProducerReviewRow[] }>;
}

export interface InboxItemSummary {
  id: string;
  kind: 'GASTRO_PROMOTION_REQUEST' | 'REVIEW_MODERATION_REQUEST';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  title: string;
  summary: string | null;
  payload: unknown;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
}

export interface InboxRepo {
  listMine(): Promise<{ items: InboxItemSummary[] }>;
  createGastroPromotion(body: {
    eventId: string;
    promotionTitle: string;
    promotionDescription?: string;
    contactPhones: string[];
    imageUrls?: string[];
    notesForAdmin?: string;
    suggestedDiscountType?: 'PERCENT' | 'FIXED';
    suggestedValue?: number;
  }): Promise<InboxItemSummary>;
  createReviewModeration(body: {
    reviewId: string;
    requestType: 'HIDE_FROM_PUBLIC' | 'OFFICIAL_REPLY' | 'BOTH';
    reason: string;
    proposedReply?: string;
  }): Promise<InboxItemSummary>;
  listAdmin(query?: { status?: string; kind?: string }): Promise<{ items: InboxItemSummary[] }>;
  resolveAdmin(
    id: string,
    body: {
      decision: 'APPROVED' | 'REJECTED';
      note?: string;
      discount?: {
        code: string;
        type: 'PERCENT' | 'FIXED';
        value: number;
        validFrom?: string;
        validTo?: string;
      };
      promotionValidFrom?: string;
      promotionValidTo?: string;
      officialReply?: string;
    },
  ): Promise<InboxItemSummary>;
}

export interface ReferralsRepo {
  lookup(code: string): Promise<{
    eventId: string | null;
    tenantId?: string | null;
    checkoutUrl?: string | null;
  }>;
  listLinks(eventId: string, userId: string): Promise<{ links: ReferralLinkSummary[] }>;
  listLinksByUser(userId: string): Promise<{ links: (ReferralLinkSummary & { eventId?: string })[] }>;
  createLink(eventId: string, body: { code: string; label?: string; referrerUserId?: string }, userId: string): Promise<{ id: string; code: string; url: string; label: string | null }>;
  /** List referrers (users with REFERRER role) for producer context */
  listReferrers(): Promise<ReferrerListItem[]>;
  getAssociatedReferrers(): Promise<ProducerReferrerRelationship[]>;
  getFreelanceReferrers(params?: ProducerFreelanceReferrersParams): Promise<FreelanceReferrerListItem[]>;
  setAssociationStatus(referrerProfileId: string, status: string, notes?: string): Promise<ProducerReferrerRelationship>;
  getProducerReferrerContext(): Promise<ProducerReferrerContext>;
  requestFreelanceAssociation(referrerProfileId: string): Promise<ProducerReferrerAssociationResult>;
  associateFromReferrerLink(token: string): Promise<ProducerReferrerAssociationResult>;
  /** Relaciones generales con productoras (lifecycle; no es asignación a evento) */
  listReferrerProducerRelationships(): Promise<ReferrerProducerRelationshipRow[]>;
  respondToProducerAssociation(
    producerProfileId: string,
    status: 'ACTIVE' | 'REJECTED',
    notes?: string,
  ): Promise<ReferrerProducerRelationshipRow>;
  listEventAssignments(eventId: string): Promise<ProducerEventAssignmentsResponse>;
  assignReferrerToEvent(
    eventId: string,
    referrerProfileId: string,
    courtesyQuota: number,
  ): Promise<AssignReferrerToEventResponse>;
  // Legacy
  assignReferrersToEventLegacy(eventId: string, referrerIds: string[]): Promise<{ links: ReferralLinkSummary[] }>;
  listCommissionsByUser(referrerId: string): Promise<ReferralCommission[]>;
  requestCommission(referrerId: string, referralLinkId: string): Promise<ReferralCommission>;
  listCommissionRequestsForEvent(eventId: string): Promise<ReferralCommission[]>;
  confirmCommissionPayout(commissionId: string, producerUserId: string): Promise<ReferralCommission | null>;
}

export interface CourtesiesRepo {
  list(eventId: string, userId: string): Promise<{ grants: CourtesyGrantSummary[] }>;
  create(eventId: string, body: { mode: string; ticketTypeId?: string; quantity: number; note?: string }, userId: string): Promise<{ issued: number }>;
  fetchTicketTypes(eventId: string, userId: string): Promise<TicketTypeResponse[]>;
}

export interface MetricsRepo {
  getEventMetrics(eventId: string, userId?: string): Promise<EventMetrics>;
  getPlatformMetrics(userId: string): Promise<PlatformMetrics>;
}

export interface ProducersRepo {
  get(id: string): Promise<ProducerDetail | null>;
  list(query: { page?: number; limit?: number; city?: string }): Promise<{ producers: ProducerSummary[]; total: number }>;
  getMyProfile(): Promise<ProducerDetail | null>;
  updateMyProfile(data: any): Promise<ProducerDetail>;
}

export type ScanResult = 'OK' | 'ALREADY_USED' | 'REVOKED' | 'INVALID';

export interface TicketScanLogItem {
  id: string;
  ticketId: string | null;
  eventId: string;
  qrPayload: string;
  result: ScanResult;
  scannedAt: string;
  [k: string]: unknown;
}

export interface ScannerRepo {
  /** eventId required when using API (scanner validates in event context) */
  scan(qrPayload: string, eventId?: string): Promise<{ result: ScanResult; ticket?: Ticket | null }>;
  listScanLogs(eventId?: string, limit?: number): Promise<TicketScanLogItem[]>;
}

export type ResaleStatus = 'ACTIVE' | 'SOLD' | 'CANCELLED';

export interface ResaleListing {
  id: string;
  ticketId: string;
  eventId: string;
  sellerUserId: string;
  askingPriceCents: number;
  status: ResaleStatus;
  createdAt: string;
}

export interface GastroContent {
  id: string;
  eventId: string;
  type: 'editorial' | 'image';
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export interface GastroDiscount {
  id: string;
  eventId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  validFrom: string | null;
  validTo: string | null;
  status: 'ACTIVE' | 'EXPIRED' | 'INACTIVE';
  createdAt: string;
}

export interface GastroDiscountValidation {
  id: string;
  discountId: string;
  validatedAt: string;
  userId: string | null;
  orderId: string | null;
}

export interface GastroRepo {
  listContent(eventId: string): Promise<GastroContent[]>;
  createContent(eventId: string, input: { type: string; title?: string; body?: string; imageUrl?: string; sortOrder?: number }): Promise<GastroContent>;
  updateContent(id: string, patch: Partial<GastroContent>): Promise<GastroContent | null>;
  listDiscounts(eventId: string): Promise<GastroDiscount[]>;
  createDiscount(eventId: string, input: { code: string; type: string; value: number; validFrom?: string; validTo?: string }): Promise<GastroDiscount>;
  updateDiscount(id: string, patch: Partial<GastroDiscount>): Promise<GastroDiscount | null>;
  listValidations(discountId?: string): Promise<GastroDiscountValidation[]>;
  recordValidation(discountId: string, userId?: string, orderId?: string): Promise<GastroDiscountValidation>;
}

export interface PlatformConfig {
  contact: { email: string; phone: string; address: string };
  categories: Array<{ id: string; label: string }>;
}

export interface PlatformConfigRepo {
  get(tenantId: string): Promise<PlatformConfig>;
  update(tenantId: string, patch: { contact?: PlatformConfig['contact']; categories?: PlatformConfig['categories'] }): Promise<PlatformConfig>;
}

export interface ResaleRepo {
  get(listingId: string): Promise<ResaleListing | null>;
  listActive(): Promise<ResaleListing[]>;
  listByEvent(eventId: string): Promise<ResaleListing[]>;
  create(input: {
    ticketId: string;
    eventId: string;
    sellerUserId: string;
    askingPriceCents: number;
  }): Promise<ResaleListing>;
  purchase(listingId: string, buyerUserId: string): Promise<ResaleListing>;
}

export interface HotelProfileSummary {
  id: string;
  displayName: string;
  websiteUrl: string | null;
  bookingUrl: string | null;
  socialLinks: unknown;
  city: string | null;
  starCategory: number | null;
}

export interface HotelRepo {
  getMe(): Promise<{ profile: HotelProfileSummary | null }>;
}

export interface Repositories {
  events: EventsRepo;
  rentalLocations: RentalLocationsRepo;
  subcategories: SubcategoriesRepo;
  applications: ApplicationsRepo;
  profiles: ProfilesRepo;
  hotel: HotelRepo;
  inbox: InboxRepo;
  gastro: GastroRepo;
  ticketTypes: TicketTypesRepo;
  ticketTemplates: TicketTemplatesRepo;
  tickets: TicketsRepo;
  orders: OrdersRepo;
  users: UsersRepo;
  reviews: ReviewsRepo;
  referrals: ReferralsRepo;
  courtesies: CourtesiesRepo;
  metrics: MetricsRepo;
  producers: ProducersRepo;
  scanner: ScannerRepo;
  payouts: PayoutsRepo;
  resale: ResaleRepo;
  platformConfig: PlatformConfigRepo;
}
