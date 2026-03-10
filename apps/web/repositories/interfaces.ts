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
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  minRating?: number;
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
  producerId?: string;
  status?: string;
}

export interface ProducerSummary {
  id: string;
  tenantId: string;
  displayName: string;
  slug: string;
  ratingAvg?: number | null;
  ratingCount?: number;
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

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: string;
  firstName: string;
  lastName: string;
  [k: string]: unknown;
}

export interface ReviewItem {
  id: string;
  score: number;
  title: string | null;
  comment: string | null;
  userName: string;
  createdAt: string;
}

export interface ReviewsResponse {
  reviews: ReviewItem[];
  page: number;
  total: number;
}

export interface ReferralLinkSummary {
  id: string;
  code: string;
  label: string | null;
  attributedOrdersCount: number;
  createdAt: string;
  eventId?: string;
  referrerId?: string | null;
}

export interface ReferrerListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
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

export interface TicketTypeResponse {
  id: string;
  name: string;
  price: string | number;
  capacityAvailable: number;
  capacityTotal?: number;
  eventId?: string;
  saleStart?: string | null;
  saleEnd?: string | null;
  order?: number;
  [k: string]: unknown;
}

export interface TicketTypeCreateInput {
  name: string;
  price: number;
  capacityAvailable: number;
  saleStart?: string | null;
  saleEnd?: string | null;
  order?: number;
}

export interface TicketTypesRepo {
  create(eventId: string, input: TicketTypeCreateInput): Promise<TicketTypeResponse>;
  update(id: string, patch: Partial<TicketTypeResponse>): Promise<TicketTypeResponse | null>;
}

export interface EventMetrics {
  ticketsSold: number;
  courtesyCount: number;
  revenue: string;
  currency: string;
  scanCount: number;
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

export interface EventsRepo {
  list(query: EventsListQuery): Promise<EventsPaginatedResponse>;
  search(query: EventsSearchQuery): Promise<EventsPaginatedResponse>;
  trending(tenantId: string, limit?: number): Promise<EventSummary[]>;
  getDetail(eventId: string, tenantId: string): Promise<EventDetail | null>;
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
  confirmDemoPayment(orderId: string, tenantId: string, userId: string): Promise<Order>;
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
  create(eventId: string, body: { score: number; title?: string; comment?: string }, userId: string): Promise<{ id: string }>;
}

export interface ReferralsRepo {
  lookup(code: string): Promise<{ eventId: string | null; tenantId?: string }>;
  listLinks(eventId: string, userId: string): Promise<{ links: ReferralLinkSummary[] }>;
  listLinksByUser(userId: string): Promise<{ links: (ReferralLinkSummary & { eventId?: string })[] }>;
  createLink(eventId: string, body: { code: string; label?: string; referrerUserId?: string }, userId: string): Promise<{ id: string; code: string; url: string; label: string | null }>;
  /** List referrers (users with REFERRER role) for producer context */
  listReferrers(): Promise<ReferrerListItem[]>;
  /** Assign referrers to event (demo-style: replaces current assignment) */
  assignReferrersToEvent(eventId: string, referrerIds: string[]): Promise<{ links: ReferralLinkSummary[] }>;
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
  get(id: string): Promise<ProducerSummary | null>;
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

export interface Repositories {
  events: EventsRepo;
  applications: ApplicationsRepo;
  gastro: GastroRepo;
  ticketTypes: TicketTypesRepo;
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
