/**
 * Repository interfaces — all UI uses these only.
 * Implemented by ApiRepository (backend API).
 */

import type { HotelProfileResponse, HotelProfileUpdateInput } from '@yo-te-invito/shared';

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
  /** Public list sort — see packages/shared eventsListQuerySchema */
  sort?:
    | 'recent'
    | 'featured_rating'
    | 'featured_event'
    | 'recommended'
    | 'top_rated'
    | 'upcoming'
    | 'dateAsc';
  /** Minimum visible reviews for recommended/top_rated sorts (default 10 on API) */
  minValidReviews?: number;
  hasTicketing?: boolean;
  excludeGeneralPublications?: boolean;
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
  contactPhone?: string | null;
  whatsappPhone?: string | null;
  contactEmail?: string | null;
  websiteUrl?: string | null;
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
    status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAUSED' | 'CANCELLED';
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
    city?: string | null;
    province?: string | null;
    googlePlaceId?: string | null;
    openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
    openingHoursNote?: string | null;
    contactPhone?: string | null;
    whatsappPhone?: string | null;
    contactEmail?: string | null;
    websiteUrl?: string | null;
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
      city?: string | null;
      province?: string | null;
      googlePlaceId?: string | null;
      openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
      openingHoursNote?: string | null;
      contactPhone?: string | null;
      whatsappPhone?: string | null;
      contactEmail?: string | null;
      websiteUrl?: string | null;
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
      summary?: string | null;
      description?: string | null;
      subcategoryId?: string | null;
      tagIds?: string[];
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
      summary?: string | null;
      description?: string | null;
      subcategoryId?: string | null;
      tagIds?: string[] | null;
      headerImageUrl?: string | null;
      galleryImages?: Array<{ url: string; type?: string }>;
      coverImageUrl?: string | null;
      media?: Array<{ id: string; type: string; url: string; sortOrder: number }>;
      status?: string;
    },
  ): Promise<{ id: string; title: string }>;
}

export interface ExcursionOperatorSummary {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  city: string | null;
  openingHours: import('@yo-te-invito/shared').RentalOpeningHours | null;
  openingHoursNote: string | null;
  contactPhone: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  socialLinks: import('@yo-te-invito/shared').EntitySocialLinks | null;
  geoLat: number | null;
  geoLng: number | null;
  isActive: boolean;
  sortOrder: number;
  excursionCount?: number;
}

export interface ExcursionOperatorDetail extends ExcursionOperatorSummary {
  createdAt: string;
  updatedAt: string;
  excursions?: Array<{
    id: string;
    title: string;
    startAt: string;
    city: string | null;
    venueName: string | null;
    coverImageUrl: string | null;
    category?: string | null;
    subcategoryId?: string | null;
    description?: string | null;
    summary?: string | null;
    status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAUSED' | 'CANCELLED';
  }>;
}

export interface ExcursionOperatorsRepo {
  listAdmin(query?: { tenantId?: string; includeInactive?: boolean }): Promise<{
    data: ExcursionOperatorSummary[];
  }>;
  getAdmin(id: string): Promise<ExcursionOperatorDetail>;
  create(input: {
    tenantId?: string;
    name: string;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    googlePlaceId?: string | null;
    openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
    openingHoursNote?: string | null;
    contactPhone?: string | null;
    websiteUrl?: string | null;
    bookingUrl?: string | null;
    socialLinks?: import('@yo-te-invito/shared').EntitySocialLinks | null;
    geoLat?: number | null;
    geoLng?: number | null;
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<ExcursionOperatorSummary>;
  update(
    id: string,
    patch: {
      name?: string;
      address?: string | null;
      city?: string | null;
      province?: string | null;
      googlePlaceId?: string | null;
      openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
      openingHoursNote?: string | null;
      contactPhone?: string | null;
      websiteUrl?: string | null;
      bookingUrl?: string | null;
      socialLinks?: import('@yo-te-invito/shared').EntitySocialLinks | null;
      geoLat?: number | null;
      geoLng?: number | null;
      isActive?: boolean;
      sortOrder?: number;
    },
  ): Promise<ExcursionOperatorSummary>;
  remove(id: string): Promise<{ ok: true }>;
  createExcursion(
    operatorId: string,
    input: {
      title: string;
      summary?: string | null;
      description?: string | null;
      subcategoryId?: string | null;
      subcategoryIds?: string[];
      tagIds?: string[];
      headerImageUrl?: string | null;
      galleryImages?: Array<{ url: string; type?: string }>;
      coverImageUrl?: string | null;
      media?: Array<{ id: string; type: string; url: string; sortOrder: number }>;
      status?: string;
      departureTime?: string | null;
      durationText?: string | null;
      availableDaysText?: string | null;
      scheduleNotes?: string | null;
      meetingPoint?: string | null;
      venueAddress?: string | null;
      city?: string | null;
      province?: string | null;
      googlePlaceId?: string | null;
      geoLat?: number | null;
      geoLng?: number | null;
    },
  ): Promise<{ id: string; title: string }>;
  updateExcursion(
    operatorId: string,
    excursionId: string,
    patch: {
      title?: string;
      summary?: string | null;
      description?: string | null;
      subcategoryId?: string | null;
      subcategoryIds?: string[];
      tagIds?: string[] | null;
      headerImageUrl?: string | null;
      galleryImages?: Array<{ url: string; type?: string }>;
      coverImageUrl?: string | null;
      media?: Array<{ id: string; type: string; url: string; sortOrder: number }>;
      status?: string;
      departureTime?: string | null;
      durationText?: string | null;
      availableDaysText?: string | null;
      scheduleNotes?: string | null;
      meetingPoint?: string | null;
      venueAddress?: string | null;
      city?: string | null;
      province?: string | null;
      googlePlaceId?: string | null;
      geoLat?: number | null;
      geoLng?: number | null;
    },
  ): Promise<{ id: string; title: string }>;
}

export interface CategoryBannerResolvedItem {
  id: string;
  eventId: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  category: string | null;
  subcategoryId?: string | null;
  subcategoryName?: string | null;
  city: string | null;
  venueName: string | null;
  startAt: string;
  position?: number;
  isManual: boolean;
}

export interface CategoryBannerAdminItem {
  id: string;
  eventId: string;
  position: number;
  isActive: boolean;
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  status: string;
  startAt: string;
}

export interface CategoryBannersRepo {
  getPublic(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<{ mode: 'automatic' | 'manual'; data: CategoryBannerResolvedItem[] }>;
  getAdmin(category: ContentMainCategory): Promise<{
    mode: 'automatic' | 'manual';
    items: CategoryBannerAdminItem[];
  }>;
  updateAdmin(
    category: ContentMainCategory,
    items: Array<{ eventId: string; position: number }>,
  ): Promise<{ mode: 'automatic' | 'manual'; items: CategoryBannerAdminItem[] }>;
  removeAdminItem(
    category: ContentMainCategory,
    itemId: string,
  ): Promise<{ mode: 'automatic' | 'manual'; items: CategoryBannerAdminItem[] }>;
}

export interface CategoryEditorialBannerItem {
  id: string;
  category: ContentMainCategory;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  imageObjectKey?: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryEditorialBannerPublicItem {
  id: string;
  category: ContentMainCategory;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  sortOrder: number;
}

export interface CategoryEditorialBannersRepo {
  getPublic(
    tenantId: string,
    category: ContentMainCategory,
  ): Promise<{ data: CategoryEditorialBannerPublicItem[] }>;
  listAdmin(category: ContentMainCategory): Promise<{ data: CategoryEditorialBannerItem[] }>;
  create(input: {
    category: ContentMainCategory;
    title: string;
    subtitle?: string | null;
    imageUrl: string;
    imageObjectKey?: string | null;
    ctaLabel?: string | null;
    ctaHref?: string | null;
    isActive?: boolean;
  }): Promise<{ data: CategoryEditorialBannerItem[] }>;
  update(
    id: string,
    patch: {
      title?: string;
      subtitle?: string | null;
      imageUrl?: string;
      imageObjectKey?: string | null;
      ctaLabel?: string | null;
      ctaHref?: string | null;
      isActive?: boolean;
    },
  ): Promise<{ data: CategoryEditorialBannerItem[] }>;
  reorder(id: string, direction: 'up' | 'down'): Promise<{ data: CategoryEditorialBannerItem[] }>;
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

export type ContentTagScope = import('@yo-te-invito/shared').ContentTagScope;

export interface ContentTagAdmin {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string | null;
  categoryScope: ContentTagScope | null;
  isActive: boolean;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ContentTagPublic {
  id: string;
  name: string;
  slug: string;
}

export interface AdminContentTagsListParams {
  q?: string;
  categoryScope?: ContentTagScope;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ContentTagsRepo {
  listPublic(
    tenantId: string,
    category?: ContentMainCategory,
  ): Promise<ContentTagPublic[]>;
  listAdmin(
    params: AdminContentTagsListParams,
  ): Promise<{
    data: ContentTagAdmin[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  create(input: {
    name: string;
    slug?: string;
    description?: string | null;
    categoryScope?: ContentTagScope | null;
    isActive?: boolean;
  }): Promise<ContentTagAdmin>;
  update(
    id: string,
    patch: {
      name?: string;
      slug?: string;
      description?: string | null;
      categoryScope?: ContentTagScope | null;
      isActive?: boolean;
    },
  ): Promise<ContentTagAdmin>;
  archive(id: string): Promise<ContentTagAdmin>;
  restore(id: string): Promise<ContentTagAdmin>;
}

export interface EventsPaginatedResponse {
  data: EventSummary[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface EventSummary {
  id: string;
  title: string;
  startAt: string;
  endAt?: string | null;
  city: string | null;
  venueName: string | null;
  coverImageUrl: string | null;
  category?: string;
  subcategoryId?: string | null;
  summary?: string | null;
  description?: string | null;
  producerId?: string;
  status?: string;
  /** API: list with category=gastro may include first active discount teaser */
  gastroPromoLabel?: string | null;
  gastroPromoImageUrl?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  createdAt?: string;
  isTicketingEnabled?: boolean;
  hasTicketing?: boolean;
  isGeneralPublication?: boolean;
  subcategoryName?: string | null;
  /** Public list: minimum ticket price (major units). Null when not applicable. */
  fromPrice?: number | null;
  /** Public list: producer display name. Null when no active profile. */
  producerName?: string | null;
  tags?: ContentTagPublic[];
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

export interface ProducerGalleryItem {
  id: string;
  url: string;
  alt?: string;
  position?: number;
}

export interface PublicProducerEventSummary {
  id: string;
  title: string;
  startAt: string;
  coverImageUrl?: string | null;
  city?: string | null;
  venueName?: string | null;
  eventMode: 'PUBLICITY_ONLY' | 'TICKETED';
  hasTicketing: boolean;
  status: string;
  isTicketingEnabled?: boolean;
  isGeneralPublication?: boolean;
}

export interface ProducerDetail extends ProducerSummary {
  longDescription: string | null;
  legalName?: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  whatsapp: string | null;
  socialLinks?: { website?: string; instagram?: string } | null;
  websiteUrl?: string | null;
  instagramUrl?: string | null;
  gallery?: ProducerGalleryItem[];
  galleryUrls?: string[] | null;
  events: PublicProducerEventSummary[] | EventSummary[];
  /** Solo portal: estado Prisma del perfil */
  status?: string;
}

export interface EventProducerPublicSummary {
  id: string;
  slug: string | null;
  displayName: string;
  logoUrl?: string | null;
  shortDescription?: string | null;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  whatsapp?: string | null;
}

export interface ProducerReviewsSummary {
  averageRating: number | null;
  totalReviews: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
}

export interface ProducerReviewListItem {
  id: string;
  eventId: string;
  eventTitle: string;
  rating: number;
  comment: string | null;
  userDisplayName: string;
  createdAt: string;
}

export interface CommercialRelationshipReview {
  id: string;
  producerProfileId: string;
  referrerProfileId: string;
  relationshipId: string | null;
  reviewerUserId: string;
  reviewerRole: 'PRODUCER' | 'REFERRER';
  targetType: 'PRODUCER' | 'REFERRER';
  rating: number;
  overallRating: number | null;
  aspectRatings: Record<string, number> | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommercialReviewSubmitPayload {
  /** Legacy 1–5; sent when aspectRatings omitted */
  rating?: number;
  overallRating?: number;
  aspectRatings?: Record<string, number>;
  comment?: string;
}

export interface CommercialReviewsBundle {
  aboutReferrer: CommercialRelationshipReview[];
  aboutProducer: CommercialRelationshipReview[];
  summaryAboutReferrer: { averageRating: number | null; totalReviews: number };
  summaryAboutProducer: { averageRating: number | null; totalReviews: number };
}

export type ReviewDisputeReasonType =
  | 'UNFAIR_RATING'
  | 'OFFENSIVE'
  | 'FALSE_INFORMATION'
  | 'WRONG_EVENT'
  | 'OTHER';

export type ReviewDisputeStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'RESOLVED'
  | 'CANCELLED';

export type ProducerManagedReviewSummary = import('@yo-te-invito/shared').ProducerManagedReviewSummary;
export type ProducerManagedReviewListItem = import('@yo-te-invito/shared').ProducerManagedReviewListItem;

export interface ReviewDisputeDetail {
  id: string;
  reviewId: string;
  producerProfileId: string;
  eventId: string;
  eventTitle: string;
  eventCategory: import('@yo-te-invito/shared').PublicReviewCategory;
  reasonType: ReviewDisputeReasonType;
  message: string;
  status: ReviewDisputeStatus;
  adminNote: string | null;
  reviewScore: number;
  reviewOverallRating: number;
  reviewComment: string | null;
  reviewUserDisplayName: string;
  reviewPublicStatus: import('@yo-te-invito/shared').ReviewPublicStatus;
  reviewHiddenFromPublic: boolean;
  hasOfficialReply: boolean;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  producerDisplayName?: string;
}

export interface ManagedVenueReviewsRepo {
  reply(reviewId: string, body: { body: string }): Promise<{ ok: true }>;
  getSummary(): Promise<ProducerManagedReviewSummary>;
  listReviews(params?: {
    eventId?: string;
    overallRating?: number;
    rating?: number;
    disputeStatus?: string;
    replyFilter?: string;
    publicStatus?: string;
    sort?: 'newest' | 'oldest' | 'highest' | 'lowest';
    page?: number;
    limit?: number;
  }): Promise<{
    reviews: ProducerManagedReviewListItem[];
    page: number;
    total: number;
    events: Array<{ id: string; title: string }>;
  }>;
}

export interface ProducerReviewsRepo extends ManagedVenueReviewsRepo {
  createDispute(
    reviewId: string,
    payload: { reasonType: ReviewDisputeReasonType; message: string },
  ): Promise<ReviewDisputeDetail>;
  getDispute(id: string): Promise<ReviewDisputeDetail>;
}

export type AdminReviewsReportResponse = import('@yo-te-invito/shared').AdminReviewsReportResponse;
export type AdminReviewsReportQuery = import('@yo-te-invito/shared').AdminReviewsReportQuery;

export interface AdminReviewsRepo {
  getReport(query?: AdminReviewsReportQuery): Promise<AdminReviewsReportResponse>;
  reply(reviewId: string, body: { body: string }): Promise<{ ok: true }>;
  hide(
    reviewId: string,
    body?: { reason?: string; adminNote?: string },
  ): Promise<{ ok: true }>;
  restore(reviewId: string, body?: { adminNote?: string }): Promise<{ ok: true }>;
}

export interface AdminReviewDisputesRepo {
  list(params?: {
    status?: ReviewDisputeStatus;
    category?: import('@yo-te-invito/shared').PublicReviewCategory;
    q?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    disputes: ReviewDisputeDetail[];
    page: number;
    total: number;
  }>;
  get(id: string): Promise<ReviewDisputeDetail>;
  markInReview(id: string, body?: { adminNote?: string }): Promise<ReviewDisputeDetail>;
  accept(id: string, body?: { adminNote?: string }): Promise<ReviewDisputeDetail>;
  reject(id: string, body?: { adminNote?: string }): Promise<ReviewDisputeDetail>;
  resolve(id: string, body?: { adminNote?: string }): Promise<ReviewDisputeDetail>;
}

export interface EventDetail extends EventSummary {
  description: string | null;
  summary?: string | null;
  endAt: string | null;
  venueAddress: string | null;
  province?: string | null;
  googlePlaceId?: string | null;
  geoLat: number | null;
  geoLng: number | null;
  capacityTotal: number | null;
  isTicketingEnabled: boolean;
  status: string;
  media: Array<{ id: string; type: string; url: string; sortOrder: number }>;
  ratingAvg?: number | null;
  ratingCount?: number;
  producer?: EventProducerPublicSummary | null;
  excursionSchedule?: {
    departureTime: string | null;
    durationText: string | null;
    availableDaysText: string | null;
    scheduleNotes: string | null;
    meetingPoint: string | null;
  } | null;
  subcategories?: Array<{ id: string; name: string; isPrimary?: boolean }>;
  tags?: ContentTagPublic[];
}

export interface Ticket {
  id: string;
  eventId: string;
  qrPayload: string;
  status: 'VALID' | 'USED' | 'REVOKED' | 'TRANSFER_PENDING' | 'TRANSFERRED';
  ownerUserId?: string | null;
  usedAt?: string | null;
  revokedAt?: string | null;
  /** From GET /me/tickets when API includes nested event */
  eventTitle?: string;
  eventStartAt?: string;
  eventVenueName?: string | null;
  ticketTypeName?: string;
  [k: string]: unknown;
}

export interface OrderTicketSummary {
  id: string;
  qrPayload: string;
  status: string;
  ticketTypeName?: string | null;
}

export interface OrderLineItem {
  id: string;
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
  tickets?: OrderTicketSummary[];
}

export interface Order {
  id: string;
  eventId: string;
  status: string;
  buyerEmail: string;
  totalAmount: string | number;
  currency?: string;
  createdAt?: string;
  buyerFirstName?: string;
  buyerLastName?: string;
  orderItems?: OrderLineItem[];
  tickets?: OrderTicketSummary[];
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

export type ReferralCommissionStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'MARKED_AS_PAID'
  | 'REQUESTED'
  | 'PAID'
  | 'REJECTED';

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
  referralAttributionId?: string | null;
  agreementId?: string | null;
  producerProfileId?: string | null;
  referrerProfileId?: string | null;
  orderId?: string | null;
  commissionType?: 'PERCENTAGE' | 'FIXED_PER_TICKET' | null;
  commissionValue?: number | null;
  attributedSubtotalCents?: number | null;
  ticketQuantity?: number | null;
}

import type {
  ReferralCommercialProposalDto,
  ReferralCommercialProposalList,
  CreateReferralCommercialProposalInput,
  AcceptReferralCommercialProposalResponse,
  ReferralCommissionType,
  ReferralCommercialProposalStatus,
  ReferralPaymentRequestDto,
  ReferralPaymentRequestList,
  CreateReferralPaymentRequestInput,
  RejectReferralPaymentRequestInput,
  EligibleReferralCommissionsList,
  ProducerReferralMetricsResponse,
  ProducerEventReferralMetricsResponse,
  ReferrerReferralMetricsResponse,
  ReferrerAgreementMetricsResponse,
} from '@yo-te-invito/shared';

export type {
  ReferralPaymentRequestDto,
  ReferralPaymentRequestList,
  CreateReferralPaymentRequestInput,
  RejectReferralPaymentRequestInput,
  EligibleReferralCommissionsList,
  ProducerReferralMetricsResponse,
  ProducerEventReferralMetricsResponse,
  ReferrerReferralMetricsResponse,
  ReferrerAgreementMetricsResponse,
};

export type {
  ReferralCommercialProposalDto,
  ReferralCommercialProposalList,
  CreateReferralCommercialProposalInput,
  AcceptReferralCommercialProposalResponse,
  ReferralCommissionType,
  ReferralCommercialProposalStatus,
};

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
  viewCount: number;
  favoriteCount: number;
  expectedCount: number;
  referralPerformance?: EventReferralPerformance[];
}

export type ProducerDashboardMetrics = import('@yo-te-invito/shared').ProducerDashboardMetricsResponse;

export interface ProducerDashboardRepo {
  getMetrics(): Promise<ProducerDashboardMetrics>;
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

export type AdminDashboardMetrics = import('@yo-te-invito/shared').AdminDashboardMetrics;
export type AdminDashboardPendingEvent = import('@yo-te-invito/shared').AdminDashboardPendingEvent;
export type AdminDashboardResponse = import('@yo-te-invito/shared').AdminDashboardResponse;

export interface AdminDashboardRepo {
  getDashboard(): Promise<AdminDashboardResponse>;
}

export type AdminEventsListQuery = import('@yo-te-invito/shared').AdminEventsListQuery;
export type AdminEventListItem = import('@yo-te-invito/shared').AdminEventListItem;
export type AdminEventsListResponse = import('@yo-te-invito/shared').AdminEventsListResponse;

export interface AdminEventsRepo {
  list(query: AdminEventsListQuery): Promise<AdminEventsListResponse>;
}

export interface AdminContentLifecycleRepo {
  pauseEvent(eventId: string, reason?: string): Promise<{ id: string; status: string }>;
  restoreEvent(eventId: string, reason?: string): Promise<{ id: string; status: string }>;
  deactivateRentalLocation(
    locationId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }>;
  activateRentalLocation(
    locationId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }>;
  deactivateExcursionOperator(
    operatorId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }>;
  activateExcursionOperator(
    operatorId: string,
    reason?: string,
  ): Promise<{ id: string; isActive: boolean }>;
}

export type AuditLogsListQuery = import('@yo-te-invito/shared').AuditLogsListQuery;
export type AuditLogItem = import('@yo-te-invito/shared').AuditLogItem;
export type AuditLogsListResponse = import('@yo-te-invito/shared').AuditLogsListResponse;

export interface AdminAuditRepo {
  listLogs(query: AuditLogsListQuery): Promise<AuditLogsListResponse>;
}

export type AdminUsersListQuery = import('@yo-te-invito/shared').AdminUsersListQuery;
export type AdminUserListItem = import('@yo-te-invito/shared').AdminUserListItem;
export type AdminUsersListResponse = import('@yo-te-invito/shared').AdminUsersListResponse;

export interface AdminUsersRepo {
  list(query: AdminUsersListQuery): Promise<AdminUsersListResponse>;
  updateRole(userId: string, role: string): Promise<User | null>;
}

export type AdminPaymentsListQuery = import('@yo-te-invito/shared').AdminPaymentsListQuery;
export type AdminPaymentsListResponse =
  import('@yo-te-invito/shared').AdminPaymentsListResponse;
export type AdminPaymentListItem = import('@yo-te-invito/shared').AdminPaymentListItem;
export type AdminPaymentDetail = import('@yo-te-invito/shared').AdminPaymentDetail;
export type AdminPaymentReconcileResponse =
  import('@yo-te-invito/shared').AdminPaymentReconcileResponse;
export type AdminPaymentMarkReviewedInput =
  import('@yo-te-invito/shared').AdminPaymentMarkReviewedInput;
export type AdminPaymentMarkReviewedResponse =
  import('@yo-te-invito/shared').AdminPaymentMarkReviewedResponse;

export interface AdminPaymentsRepo {
  list(query: AdminPaymentsListQuery): Promise<AdminPaymentsListResponse>;
  getDetail(paymentId: string): Promise<AdminPaymentDetail>;
  reconcile(paymentId: string): Promise<AdminPaymentReconcileResponse>;
  markReviewed(
    paymentId: string,
    input: AdminPaymentMarkReviewedInput,
  ): Promise<AdminPaymentMarkReviewedResponse>;
}

export type AdminLegalDocumentListQuery =
  import('@yo-te-invito/shared').AdminLegalDocumentListQuery;
export type AdminLegalDocumentListItem =
  import('@yo-te-invito/shared').AdminLegalDocumentListItem;
export type AdminLegalDocumentListResponse =
  import('@yo-te-invito/shared').AdminLegalDocumentListResponse;
export type AdminLegalDocumentDetail = import('@yo-te-invito/shared').AdminLegalDocumentDetail;
export type AdminLegalDocumentVersionsListResponse =
  import('@yo-te-invito/shared').AdminLegalDocumentVersionsListResponse;
export type AdminLegalDocumentMutationResponse =
  import('@yo-te-invito/shared').AdminLegalDocumentMutationResponse;
export type AdminUpdateLegalDocument = import('@yo-te-invito/shared').AdminUpdateLegalDocument;
export type AdminSaveLegalDocumentDraft = import('@yo-te-invito/shared').AdminSaveLegalDocumentDraft;
export type AdminPublishLegalDocument = import('@yo-te-invito/shared').AdminPublishLegalDocument;
export type PublicLegalDocumentResponse =
  import('@yo-te-invito/shared').PublicLegalDocumentResponse;
export type LegalDocumentKeyValue = import('@yo-te-invito/shared').LegalDocumentKeyValue;
export type LegalDocumentVersionSummary =
  import('@yo-te-invito/shared').LegalDocumentVersionSummary;
export type MeLegalRequirementsQuery = import('@yo-te-invito/shared').MeLegalRequirementsQuery;
export type MeLegalRequirementsResponse =
  import('@yo-te-invito/shared').MeLegalRequirementsResponse;
export type MeLegalRequirementItem = import('@yo-te-invito/shared').MeLegalRequirementItem;
export type MeLegalAcceptRequest = import('@yo-te-invito/shared').MeLegalAcceptRequest;
export type MeLegalAcceptResponse = import('@yo-te-invito/shared').MeLegalAcceptResponse;
export type MeLegalAcceptanceHistoryResponse =
  import('@yo-te-invito/shared').MeLegalAcceptanceHistoryResponse;
export type PublicLegalRequirementsQuery =
  import('@yo-te-invito/shared').PublicLegalRequirementsQuery;
export type PublicLegalRequirementsResponse =
  import('@yo-te-invito/shared').PublicLegalRequirementsResponse;

export interface LegalDocumentsRepo {
  listAdminLegalDocuments(
    query?: AdminLegalDocumentListQuery,
  ): Promise<AdminLegalDocumentListResponse>;
  getAdminLegalDocument(key: string): Promise<AdminLegalDocumentDetail>;
  getAdminLegalDocumentVersions(key: string): Promise<AdminLegalDocumentVersionsListResponse>;
  updateAdminLegalDocument(
    key: string,
    payload: AdminUpdateLegalDocument,
  ): Promise<AdminLegalDocumentMutationResponse>;
  saveAdminLegalDocumentDraft(
    key: string,
    payload: AdminSaveLegalDocumentDraft,
  ): Promise<AdminLegalDocumentMutationResponse>;
  publishAdminLegalDocument(
    key: string,
    payload?: AdminPublishLegalDocument,
  ): Promise<AdminLegalDocumentMutationResponse>;
  getPublicLegalDocument(tenantId: string, slug: string): Promise<PublicLegalDocumentResponse>;
  getPublicLegalRequirements(
    query: PublicLegalRequirementsQuery,
  ): Promise<PublicLegalRequirementsResponse>;
  getMyLegalRequirements(
    query: import('@yo-te-invito/shared').MeLegalRequirementsQuery,
  ): Promise<import('@yo-te-invito/shared').MeLegalRequirementsResponse>;
  acceptMyLegalDocuments(
    payload: import('@yo-te-invito/shared').MeLegalAcceptRequest,
  ): Promise<import('@yo-te-invito/shared').MeLegalAcceptResponse>;
  getMyLegalAcceptances(): Promise<import('@yo-te-invito/shared').MeLegalAcceptanceHistoryResponse>;
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

export interface EventsCalendarMonthQuery {
  tenantId: string;
  month: string;
  category?: string;
  subcategorySlug?: string;
  subcategoryId?: string;
}

export interface EventsRepo {
  list(query: EventsListQuery): Promise<EventsPaginatedResponse>;
  search(query: EventsSearchQuery): Promise<EventsPaginatedResponse>;
  listCalendarMonth(query: EventsCalendarMonthQuery): Promise<{ data: EventSummary[] }>;
  trending(tenantId: string, limit?: number): Promise<EventSummary[]>;
  recommended(query: {
    tenantId: string;
    category?: string;
    limit?: number;
    minValidReviews?: number;
    mode?: 'recommended' | 'top_rated';
  }): Promise<EventSummary[]>;
  getDetail(eventId: string, tenantId: string): Promise<EventDetail | null>;
  /** POST /public/events/:id/view — public page view counter (V2). */
  recordPublicView(eventId: string, tenantId: string): Promise<{ recorded: boolean }>;
  /** GET /public/events/:id/discounts — empty discounts if event is not gastro. */
  listPublicDiscounts(eventId: string, tenantId: string): Promise<{ discounts: PublicGastroDiscountSummary[] }>;
  /** Event detail for producer portal (includes DRAFT/PENDING). */
  getDetailForProducer(eventId: string): Promise<EventDetail | null>;
  getTicketTypes(eventId: string): Promise<TicketTypeResponse[]>;
  create(
    input: Partial<EventDetail> & {
      tenantId: string;
      producerId?: string;
      eventMode?: 'PUBLICITY_ONLY' | 'TICKETED';
      tagIds?: string[];
    },
  ): Promise<EventDetail>;
  update(
    eventId: string,
    patch: Partial<EventDetail> & { tagIds?: string[] | null },
  ): Promise<EventDetail | null>;
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

export type { CheckoutPaymentStatusResponse } from '@yo-te-invito/shared';

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
  getCheckoutPaymentStatus(
    orderId: string,
    tenantId: string,
    options?: { paymentId?: string; cancelled?: boolean },
  ): Promise<import('@yo-te-invito/shared').CheckoutPaymentStatusResponse>;
  refreshCheckoutPaymentStatus(
    paymentId: string,
    tenantId: string,
  ): Promise<import('@yo-te-invito/shared').CheckoutPaymentStatusResponse>;
}

export interface CreateReferrerInput {
  email: string;
  firstName: string;
  lastName: string;
}

/** @deprecated Prefer MePortalRepo + UserPortalPreferences from shared */
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

export interface AuthRepo {
  register(body: import('@yo-te-invito/shared').AuthRegisterRequest): Promise<{
    token: string;
    user: {
      id: string;
      tenantId: string;
      email: string;
      role: string;
      status: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

export interface ProfilesRepo {
  applyProducer(body: { displayName: string; legalName?: string; description?: string; city?: string; country?: string }): Promise<{ id: string; displayName: string; status: string; message: string }>;
  applyGastro(body: {
    displayName: string;
    contactEmail: string;
    location: { province: string; city: string; address: string; lat?: number; lng?: number };
    summary?: string;
    legalName?: string;
    contactPhone?: string;
  }): Promise<{ id: string; displayName: string; status: string; message: string }>;
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

export interface MePortalRepo {
  getDashboard(): Promise<import('@yo-te-invito/shared').MeDashboardResponse>;
  getPreferences(): Promise<import('@yo-te-invito/shared').UserPortalPreferences>;
  patchPreferences(
    patch: import('@yo-te-invito/shared').UserPortalPreferencesPatch,
  ): Promise<import('@yo-te-invito/shared').UserPortalPreferences>;
  listFavorites(): Promise<import('@yo-te-invito/shared').MeFavoritesResponse>;
  createFavorite(
    body: import('@yo-te-invito/shared').CreateUserFavoriteBody,
  ): Promise<import('@yo-te-invito/shared').UserFavorite>;
  deleteFavorite(id: string): Promise<void>;
  patchFavoriteNotifications(
    id: string,
    body: import('@yo-te-invito/shared').PatchUserFavoriteNotifications,
  ): Promise<import('@yo-te-invito/shared').UserFavorite>;
  listExpectedEvents(): Promise<import('@yo-te-invito/shared').MeExpectedEventsResponse>;
  createExpectedEvent(
    body: import('@yo-te-invito/shared').CreateUserExpectedEventBody,
  ): Promise<import('@yo-te-invito/shared').UserExpectedEvent>;
  deleteExpectedEvent(id: string): Promise<void>;
  patchExpectedEventNotifications(
    id: string,
    body: import('@yo-te-invito/shared').PatchUserExpectedEventNotifications,
  ): Promise<import('@yo-te-invito/shared').UserExpectedEvent>;
  getCart(): Promise<import('@yo-te-invito/shared').MeCartResponse>;
  addCartItem(
    body: import('@yo-te-invito/shared').AddUserCartItemBody,
  ): Promise<import('@yo-te-invito/shared').MeCartResponse>;
  patchCartItem(
    itemId: string,
    body: import('@yo-te-invito/shared').PatchUserCartItemBody,
  ): Promise<import('@yo-te-invito/shared').MeCartResponse>;
  removeCartItem(itemId: string): Promise<import('@yo-te-invito/shared').MeCartResponse>;
  getPendingOrders(): Promise<import('@yo-te-invito/shared').MePendingOrdersResponse>;
  checkout(
    body: import('@yo-te-invito/shared').MeCartCheckoutBody,
  ): Promise<import('@yo-te-invito/shared').MeCartCheckoutResponse>;
  getActivity(): Promise<import('@yo-te-invito/shared').MeActivityResponse>;
  getAccount(): Promise<import('@yo-te-invito/shared').MeAccount>;
  patchAccount(
    body: import('@yo-te-invito/shared').PatchMeAccountBody,
  ): Promise<import('@yo-te-invito/shared').MeAccount>;
  changePassword(
    body: import('@yo-te-invito/shared').ChangePasswordBody,
  ): Promise<import('@yo-te-invito/shared').ChangePasswordResponse>;
  getTicketDetail(ticketId: string): Promise<import('@yo-te-invito/shared').MeTicketDetail>;
  patchTicketReminder(
    ticketId: string,
    body: import('@yo-te-invito/shared').PatchTicketReminderBody,
  ): Promise<{ ticketId: string; reminderEnabled: boolean }>;
  listTransferOffers(
    query?: import('@yo-te-invito/shared').MeTicketTransferOffersQuery,
  ): Promise<import('@yo-te-invito/shared').MeTicketTransferOffersResponse>;
  createTransferOffer(
    ticketId: string,
    body: import('@yo-te-invito/shared').CreateTicketTransferOfferBody,
  ): Promise<import('@yo-te-invito/shared').CreateTicketTransferOfferResponse>;
  cancelTransferOffer(offerId: string): Promise<import('@yo-te-invito/shared').TicketTransferOfferSummary>;
  acceptTransferOffer(
    token: string,
  ): Promise<import('@yo-te-invito/shared').AcceptTicketTransferOfferResponse>;
  lookupTransferOffer(
    token: string,
  ): Promise<import('@yo-te-invito/shared').TicketTransferLookupResponse>;
  rejectTransferOffer(
    offerId: string,
  ): Promise<import('@yo-te-invito/shared').TicketTransferOfferSummary>;
  listNotifications(): Promise<import('@yo-te-invito/shared').MeNotificationsResponse>;
  getNotificationsUnreadCount(): Promise<import('@yo-te-invito/shared').MeNotificationsUnread>;
  markNotificationRead(notificationId: string): Promise<import('@yo-te-invito/shared').UserNotification>;
  markAllNotificationsRead(): Promise<{ updated: number }>;
  listProducerFollows(): Promise<import('@yo-te-invito/shared').MeProducerFollowsResponse>;
  getProducerFollowStatus(
    producerProfileId: string,
  ): Promise<import('@yo-te-invito/shared').ProducerFollowStatus>;
  createProducerFollow(
    body: import('@yo-te-invito/shared').CreateUserProducerFollowBody,
  ): Promise<import('@yo-te-invito/shared').UserProducerFollow>;
  deleteProducerFollow(id: string): Promise<void>;
  listGastroFollows(): Promise<import('@yo-te-invito/shared').MeGastroFollowsResponse>;
  getGastroFollowStatus(
    gastroProfileId: string,
  ): Promise<import('@yo-te-invito/shared').GastroFollowStatus>;
  createGastroFollow(
    body: import('@yo-te-invito/shared').CreateUserGastroFollowBody,
  ): Promise<import('@yo-te-invito/shared').UserGastroFollow>;
  deleteGastroFollow(id: string): Promise<void>;
  patchGastroFollowNotifications(
    id: string,
    body: import('@yo-te-invito/shared').PatchUserGastroFollowNotifications,
  ): Promise<import('@yo-te-invito/shared').UserGastroFollow>;
  getPushSubscriptionsConfig(): Promise<import('@yo-te-invito/shared').PushSubscriptionsConfig>;
  listPushSubscriptions(): Promise<import('@yo-te-invito/shared').MePushSubscriptionsResponse>;
  registerPushSubscription(
    body: import('@yo-te-invito/shared').RegisterPushSubscriptionBody,
  ): Promise<import('@yo-te-invito/shared').PushSubscription>;
  deactivatePushSubscription(
    body: import('@yo-te-invito/shared').DeactivatePushSubscriptionBody,
  ): Promise<{ deactivated: boolean }>;
  sendTestPushNotification(
    body?: import('@yo-te-invito/shared').SendTestPushBody,
  ): Promise<import('@yo-te-invito/shared').SendTestPushResponse>;
  getRecommendations(
    limit?: number,
  ): Promise<import('@yo-te-invito/shared').MeRecommendationsResponse>;
}

export interface UsersRepo {
  getMe(userId: string): Promise<User | null>;
  getMyTickets(userId: string): Promise<Ticket[]>;
  createReferrer(input: CreateReferrerInput): Promise<User>;
  /** @deprecated Prefer mePortal.getPreferences */
  getPreferences(userId: string): Promise<UserPreferences | null>;
  /** @deprecated Prefer mePortal.patchPreferences */
  updatePreferences(userId: string, patch: Partial<UserPreferences>): Promise<UserPreferences>;
  list(tenantId?: string): Promise<User[]>;
  updateRole(userId: string, role: string): Promise<User | null>;
}

export interface ReviewsRepo {
  list(eventId: string, tenantId: string, page?: number, limit?: number): Promise<ReviewsResponse>;
  create(eventId: string, body: { score: number; title?: string; comment?: string; guestName?: string }): Promise<{ id: string }>;
  createPublic(body: import('@yo-te-invito/shared').MeCreatePublicReviewBody): Promise<{ id: string }>;
  getSummary(
    category: import('@yo-te-invito/shared').PublicReviewCategory,
    entityId: string,
    tenantId: string,
  ): Promise<import('@yo-te-invito/shared').ReviewEntitySummary>;
  listPublicV2(
    category: import('@yo-te-invito/shared').PublicReviewCategory,
    entityId: string,
    tenantId: string,
    page?: number,
    limit?: number,
    filters?: {
      sort?: import('@yo-te-invito/shared').PublicReviewListSort;
      replyFilter?: import('@yo-te-invito/shared').ProducerReviewReplyFilter;
      overallRating?: number;
    },
  ): Promise<import('@yo-te-invito/shared').PublicReviewsListResponse>;
  getUserReviewProfile(
    userId: string,
    tenantId: string,
  ): Promise<import('@yo-te-invito/shared').UserPublicReviewProfile>;
  listUserPublicReviews(
    userId: string,
    tenantId: string,
    page?: number,
    limit?: number,
    filters?: {
      sort?: import('@yo-te-invito/shared').PublicReviewListSort;
      replyFilter?: import('@yo-te-invito/shared').ProducerReviewReplyFilter;
      overallRating?: number;
    },
  ): Promise<import('@yo-te-invito/shared').UserPublicReviewsResponse>;
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
  listProducerReferralProposals(): Promise<ReferralCommercialProposalList>;
  getProducerReferralProposal(proposalId: string): Promise<ReferralCommercialProposalDto>;
  createProducerReferralProposal(
    body: CreateReferralCommercialProposalInput,
  ): Promise<ReferralCommercialProposalDto>;
  cancelProducerReferralProposal(proposalId: string): Promise<ReferralCommercialProposalDto>;
  listReferrerProposals(): Promise<ReferralCommercialProposalList>;
  getReferrerProposal(proposalId: string): Promise<ReferralCommercialProposalDto>;
  acceptReferrerProposal(proposalId: string): Promise<AcceptReferralCommercialProposalResponse>;
  rejectReferrerProposal(proposalId: string): Promise<ReferralCommercialProposalDto>;
  listReferrerEligibleCommissions(): Promise<EligibleReferralCommissionsList>;
  listReferrerPaymentRequests(): Promise<ReferralPaymentRequestList>;
  getReferrerPaymentRequest(id: string): Promise<ReferralPaymentRequestDto>;
  createReferrerPaymentRequest(
    body: CreateReferralPaymentRequestInput,
  ): Promise<ReferralPaymentRequestDto>;
  cancelReferrerPaymentRequest(id: string): Promise<ReferralPaymentRequestDto>;
  listProducerReferralPaymentRequests(): Promise<ReferralPaymentRequestList>;
  getProducerReferralPaymentRequest(id: string): Promise<ReferralPaymentRequestDto>;
  markProducerReferralPaymentRequestInReview(id: string): Promise<ReferralPaymentRequestDto>;
  markProducerReferralPaymentRequestPaid(id: string): Promise<ReferralPaymentRequestDto>;
  rejectProducerReferralPaymentRequest(
    id: string,
    body: RejectReferralPaymentRequestInput,
  ): Promise<ReferralPaymentRequestDto>;
  getProducerReferralMetrics(): Promise<ProducerReferralMetricsResponse>;
  getProducerEventReferralMetrics(eventId: string): Promise<ProducerEventReferralMetricsResponse>;
  getReferrerReferralMetrics(): Promise<ReferrerReferralMetricsResponse>;
  getReferrerAgreementMetrics(agreementId: string): Promise<ReferrerAgreementMetricsResponse>;
}

export interface CourtesyCreateResult {
  grantId: string;
  issued: number;
  tickets: Array<{ id: string; qrPayload: string }>;
}

export interface CourtesiesRepo {
  list(eventId: string): Promise<{ grants: CourtesyGrantSummary[] }>;
  create(
    eventId: string,
    body: {
      mode: 'CONSUMES_BATCH' | 'FREE_CAPACITY';
      ticketTypeId?: string;
      quantity: number;
      note?: string;
    },
  ): Promise<CourtesyCreateResult>;
  fetchTicketTypes(eventId: string): Promise<TicketTypeResponse[]>;
}

export interface MetricsRepo {
  getEventMetrics(eventId: string, userId?: string): Promise<EventMetrics>;
  getPlatformMetrics(userId: string): Promise<PlatformMetrics>;
}

export interface ProducersRepo {
  get(id: string): Promise<ProducerDetail | null>;
  list(query: { page?: number; limit?: number; city?: string }): Promise<{ producers: ProducerSummary[]; total: number }>;
  getMyProfile(): Promise<ProducerDetail | null>;
  createMyProfile(data: import('@yo-te-invito/shared').CreateProducerProfileInput): Promise<ProducerDetail>;
  updateMyProfile(data: import('@yo-te-invito/shared').UpdateProducerProfileInput): Promise<ProducerDetail>;
  updateMyProfileIdentity(
    data: import('@yo-te-invito/shared').ProducerProfileIdentityUpdateInput,
  ): Promise<ProducerDetail>;
  updateMyProfileImages(
    data: import('@yo-te-invito/shared').ProducerProfileImagesUpdateInput,
  ): Promise<ProducerDetail>;
  updateMyProfileContact(
    data: import('@yo-te-invito/shared').ProducerProfileContactUpdateInput,
  ): Promise<ProducerDetail>;
  /** POST /public/producers/:idOrSlug/view — public profile view counter (V2). */
  recordPublicView(idOrSlug: string, tenantId: string): Promise<{ recorded: boolean }>;
  getReviewsSummary(idOrSlug: string): Promise<ProducerReviewsSummary>;
  listReviews(
    idOrSlug: string,
    query?: { page?: number; limit?: number; minScore?: number },
  ): Promise<{ reviews: ProducerReviewListItem[]; page: number; total: number }>;
}

export interface CommercialReviewsRepo {
  listForProducerReferrer(referrerProfileId: string): Promise<CommercialReviewsBundle>;
  createAsProducer(
    referrerProfileId: string,
    payload: CommercialReviewSubmitPayload,
  ): Promise<CommercialRelationshipReview>;
  listForReferrerProducer(producerProfileId: string): Promise<CommercialReviewsBundle>;
  createAsReferrer(
    producerProfileId: string,
    payload: CommercialReviewSubmitPayload,
  ): Promise<CommercialRelationshipReview>;
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

export type GastroContentStatus = 'draft' | 'published' | 'inactive';

export interface GastroContent {
  id: string;
  eventId: string;
  gastroProfileId?: string;
  type: 'editorial' | 'image';
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  sortOrder: number;
  status: GastroContentStatus;
  createdAt?: string;
  updatedAt?: string;
}

export type PublicGastroContentItem = Omit<GastroContent, 'gastroProfileId'>;

export type GastroDiscountStatus =
  | 'PENDING_REVIEW'
  | 'COMMISSION_NEGOTIATION'
  | 'APPROVED'
  | 'ACTIVE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface GastroDiscount {
  id: string;
  eventId: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  validFrom: string | null;
  validTo: string | null;
  status: GastroDiscountStatus;
  createdAt: string;
}

export interface GastroLocal {
  id: string;
  tenantId: string;
  displayName: string;
  legalName: string | null;
  summary: string | null;
  detail: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  galleryUrls: string[] | null;
  province: string | null;
  city: string | null;
  address: string | null;
  googlePlaceId?: string | null;
  geoLat: number | null;
  geoLng: number | null;
  openingHours: import('@yo-te-invito/shared').RentalOpeningHours | null;
  openingHoursNote: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  menuUrl: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  socialLinks: import('@yo-te-invito/shared').EntitySocialLinks | null;
  subcategoryId: string | null;
  publicEventId: string | null;
  tags?: ContentTagPublic[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface GastroPortalDiscount {
  id: string;
  tenantId: string;
  eventId: string;
  gastroProfileId: string | null;
  gastroProfileName?: string | null;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  title: string | null;
  summary: string | null;
  detail: string | null;
  discountDate: string | null;
  validFrom: string | null;
  validTo: string | null;
  status: GastroDiscountStatus;
  adminNotes?: string | null;
  rejectionReason?: string | null;
  qrToken?: string | null;
  qrPayload?: string | null;
  emailSentAt?: string | null;
  emailSendError?: string | null;
  ownerEmail?: string | null;
  ownerPhone?: string | null;
  headerImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GastroLocalUpsertPayload {
  displayName: string;
  summary?: string | null;
  detail?: string | null;
  subcategoryId?: string | null;
  bannerUrl?: string | null;
  galleryUrls?: string[];
  location: {
    province: string;
    city: string;
    address: string;
    lat?: number | null;
    lng?: number | null;
    googlePlaceId?: string | null;
  };
  openingHours?: import('@yo-te-invito/shared').RentalOpeningHours | null;
  openingHoursNote?: string | null;
  contactPhone?: string | null;
  contactEmail: string;
  menuUrl?: string | null;
  websiteUrl?: string | null;
  bookingUrl?: string | null;
  socialLinks?: import('@yo-te-invito/shared').EntitySocialLinks | null;
  tagIds?: string[];
}

export interface GastroDiscountCreatePayload {
  title: string;
  summary: string;
  detail: string;
  imageUrls: string[];
  discountDate: string;
  commissionCoordinationAccepted: true;
}

export interface GastroDiscountValidation {
  id: string;
  discountId: string;
  validatedAt: string;
  userId: string | null;
  orderId: string | null;
}

export interface GastroValidationListItem {
  id: string;
  discountId: string;
  discountTitle: string;
  discountStatus: GastroDiscountStatus;
  validatedAt: string;
}

export interface GastroValidationListParams {
  discountId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface GastroValidationListResponse {
  data: GastroValidationListItem[];
  total: number;
  page: number;
  limit: number;
}

export type GastroDashboardAlert =
  | 'EXPIRED_DISCOUNTS'
  | 'INACTIVE_DISCOUNTS'
  | 'MISSING_PUBLIC_CONTENT'
  | 'MISSING_MAIN_IMAGE';

export interface GastroDashboardResponse {
  profile: {
    id: string | null;
    displayName: string | null;
    status: string | null;
    publicEventId: string | null;
    hasMainImage: boolean;
    publishedContentCount: number;
  };
  kpis: {
    activeDiscounts: number;
    totalValidations: number;
    validationsLast7Days: number;
    reviewsPendingReply: number | null;
  };
  alerts: GastroDashboardAlert[];
  recentValidations: Array<{
    id: string;
    discountId: string;
    discountTitle: string;
    validatedAt: string;
  }>;
}

export interface PublicGastroLocation extends GastroLocal {
  subcategoryName: string | null;
  ratingAvg?: number | null;
  ratingCount?: number;
  content?: PublicGastroContentItem[];
}

export interface PublicGastroLocationDiscount {
  id: string;
  title: string | null;
  summary: string | null;
  detail: string | null;
  headerImageUrl: string | null;
  discountDate: string | null;
  type: 'PERCENT' | 'FIXED';
  value: number;
}

export interface PublicGastroDiscountListItem extends PublicGastroLocationDiscount {
  locationId: string;
  locationName: string;
  locationCity: string | null;
  locationSlug: string | null;
}

export interface PublicGastroDiscountDetail extends PublicGastroDiscountListItem {
  imageUrls: string[];
  eventId: string;
  claimable: boolean;
}

export interface PublicGastroDiscountClaimResult {
  claimId: string;
  accessToken: string;
  email: string;
  emailSent: boolean;
  qrPayload: string;
  discountTitle: string | null;
  locationName: string;
}

export interface PublicGastroDiscountClaimView {
  claimId: string;
  email: string;
  qrPayload: string;
  discountTitle: string | null;
  discountSummary: string | null;
  locationName: string;
  locationId: string;
  discountDate: string | null;
  emailSentAt: string | null;
}

export interface PublicGastroLocationsRepo {
  getById(locationId: string, tenantId: string): Promise<PublicGastroLocation>;
  getByPublicEventId(eventId: string, tenantId: string): Promise<PublicGastroLocation>;
  listDiscounts(locationId: string, tenantId: string): Promise<{
    discounts: PublicGastroLocationDiscount[];
  }>;
  list(params: { tenantId: string; city?: string; limit?: number }): Promise<{
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
  }>;
  countPublishedDiscounts(tenantId: string): Promise<{ count: number }>;
  listPublishedDiscounts(params: {
    tenantId: string;
    subcategorySlug?: string;
    limit?: number;
  }): Promise<{ data: PublicGastroDiscountListItem[] }>;
  getPublishedDiscount(discountId: string, tenantId: string): Promise<PublicGastroDiscountDetail>;
  claimDiscount(
    discountId: string,
    body: { tenantId: string; email: string },
  ): Promise<PublicGastroDiscountClaimResult>;
  getDiscountClaim(
    claimId: string,
    params: { tenantId: string; accessToken: string },
  ): Promise<PublicGastroDiscountClaimView>;
}

export interface GastroRepo {
  listContent(eventId: string): Promise<GastroContent[]>;
  createContent(
    eventId: string,
    input: {
      type: GastroContent['type'];
      title?: string | null;
      body?: string | null;
      imageUrl?: string | null;
      sortOrder?: number;
      status?: GastroContentStatus;
    },
  ): Promise<GastroContent>;
  updateContent(id: string, patch: Partial<GastroContent>): Promise<GastroContent>;
  listDiscounts(eventId: string): Promise<GastroDiscount[]>;
  createDiscount(eventId: string, input: { code: string; type: string; value: number; validFrom?: string; validTo?: string }): Promise<GastroDiscount>;
  updateDiscount(id: string, patch: Partial<GastroDiscount>): Promise<GastroDiscount | null>;
  getDashboard(): Promise<GastroDashboardResponse>;
  listValidations(params?: GastroValidationListParams): Promise<GastroValidationListResponse>;
  recordValidation(discountId: string, userId?: string, orderId?: string): Promise<GastroDiscountValidation>;
  getMyLocal(): Promise<GastroLocal | null>;
  createMyLocal(payload: GastroLocalUpsertPayload): Promise<GastroLocal>;
  updateMyLocal(payload: Partial<GastroLocalUpsertPayload>): Promise<GastroLocal>;
  listMyDiscounts(): Promise<{ data: GastroPortalDiscount[] }>;
  getMyDiscount(id: string): Promise<GastroPortalDiscount>;
  createMyDiscount(payload: GastroDiscountCreatePayload): Promise<GastroPortalDiscount>;
  updateMyDiscount(id: string, payload: Partial<Omit<GastroDiscountCreatePayload, 'commissionCoordinationAccepted'>>): Promise<GastroPortalDiscount>;
}

export interface AdminGastroLocationListItem {
  id: string;
  displayName: string;
  status: string;
  city: string | null;
  province: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  publicEventId: string | null;
  owner: { userId: string | null; name: string | null; email: string | null };
  discountsCount: number;
  pendingDiscountsCount: number;
  activeDiscountsCount: number;
  createdAt: string;
}

export interface AdminGastroLocationDetail extends AdminGastroLocationListItem {
  tenantId: string;
  legalName: string | null;
  summary: string | null;
  detail: string | null;
  address: string | null;
  bannerUrl: string | null;
  galleryUrls: string[] | null;
  googlePlaceId?: string | null;
  geoLat?: number | null;
  geoLng?: number | null;
  openingHours: import('@yo-te-invito/shared').RentalOpeningHours | null;
  openingHoursNote: string | null;
  subcategoryId: string | null;
  subcategoryName: string | null;
  menuUrl: string | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  socialLinks: import('@yo-te-invito/shared').EntitySocialLinks | null;
  updatedAt: string;
}

export interface AdminGastroDiscountListItem {
  id: string;
  title: string | null;
  summary: string | null;
  status: GastroDiscountStatus;
  discountDate: string | null;
  validationCount: number;
  createdAt: string;
}

export interface AdminGastroDiscountDetail {
  id: string;
  profileId: string;
  eventId: string;
  title: string | null;
  summary: string | null;
  detail: string | null;
  discountDate: string | null;
  status: GastroDiscountStatus;
  submittedImageUrls: string[];
  displayImageUrls: string[];
  adminNotes: string | null;
  rejectionReason: string | null;
  qrToken: string | null;
  qrPayload?: string | null;
  emailSentAt: string | null;
  emailSendError: string | null;
  ownerEmail: string | null;
  ownerPhone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminGastroDiscountMetrics {
  validationCount: number;
  status: GastroDiscountStatus;
  discountDate: string | null;
  emailSentAt: string | null;
  lastValidationAt: string | null;
}

export interface AdminGastroPendingDiscountItem extends AdminGastroDiscountListItem {
  profileId: string;
  profileName: string;
}

export interface AdminGastroRepo {
  listPendingDiscounts(): Promise<{ data: AdminGastroPendingDiscountItem[] }>;
  listLocations(params?: {
    search?: string;
    status?: string;
    hasPendingDiscounts?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AdminGastroLocationListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  getLocation(profileId: string): Promise<AdminGastroLocationDetail>;
  listLocationDiscounts(profileId: string): Promise<{ data: AdminGastroDiscountListItem[] }>;
  getDiscount(profileId: string, discountId: string): Promise<AdminGastroDiscountDetail>;
  getDiscountMetrics(profileId: string, discountId: string): Promise<AdminGastroDiscountMetrics>;
  updatePublication(
    profileId: string,
    discountId: string,
    body: {
      title: string;
      summary: string;
      detail: string;
      displayImageUrls: string[];
    },
  ): Promise<AdminGastroDiscountDetail>;
  markCommissionNegotiation(
    profileId: string,
    discountId: string,
    note?: string | null,
  ): Promise<AdminGastroDiscountDetail>;
  approve(profileId: string, discountId: string): Promise<AdminGastroDiscountDetail>;
  reject(
    profileId: string,
    discountId: string,
    reason: string,
    note?: string | null,
  ): Promise<AdminGastroDiscountDetail>;
  cancel(
    profileId: string,
    discountId: string,
    reason: string,
    note?: string | null,
  ): Promise<AdminGastroDiscountDetail>;
  sendQrEmail(profileId: string, discountId: string): Promise<AdminGastroDiscountDetail>;
  updateLocationStatus(
    profileId: string,
    body: { status: string },
  ): Promise<AdminGastroLocationDetail>;
  createLocation(
    body: import('@yo-te-invito/shared').AdminGastroLocationCreateInput,
  ): Promise<AdminGastroLocationDetail>;
  updateLocation(
    profileId: string,
    body: import('@yo-te-invito/shared').AdminGastroLocationUpdateInput,
  ): Promise<AdminGastroLocationDetail>;
}

export interface PlatformConfig {
  contact: { email: string; phone: string; address: string };
  categories: Array<{ id: string; label: string }>;
}

export interface PlatformConfigRepo {
  get(tenantId: string): Promise<PlatformConfig>;
  update(tenantId: string, patch: { contact?: PlatformConfig['contact']; categories?: PlatformConfig['categories'] }): Promise<PlatformConfig>;
}

export type PublicPlatformConfig =
  import('@yo-te-invito/shared').PublicPlatformConfigResponse;

export interface PublicPlatformConfigRepo {
  get(tenantId: string): Promise<PublicPlatformConfig>;
}

export type HotelProfile = HotelProfileResponse;

export type PublicHotelLocation = HotelProfile & { publicEventId: string | null };

export interface PublicHotelLocationsRepo {
  getById(locationId: string, tenantId: string): Promise<PublicHotelLocation>;
  getByPublicEventId(eventId: string, tenantId: string): Promise<PublicHotelLocation>;
}

export interface HotelRepo {
  getMe(): Promise<{ profile: HotelProfile | null }>;
  updateMe(input: HotelProfileUpdateInput): Promise<{ profile: HotelProfile }>;
}

export interface AdminProducerListItem {
  id: string;
  displayName: string;
  status: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  city: string | null;
  owner: { userId: string | null; name: string | null; email: string | null };
  eventsCount: number;
  pendingEventsCount: number;
  approvedEventsCount: number;
  createdAt: string;
}

export interface AdminProducerDetail extends AdminProducerListItem {
  legalName: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  whatsapp: string | null;
  secondaryEmail: string | null;
  secondaryPhone: string | null;
  slug: string | null;
  updatedAt: string;
}

export interface AdminProducerEventListItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string | null;
  city: string | null;
  venueName: string | null;
  status: string;
  category: string | null;
  hasTicketing: boolean;
  isTicketingEnabled: boolean;
  isGeneralPublication?: boolean;
  eventMode?: 'PUBLICITY_ONLY' | 'TICKETED';
  ticketTypesCount: number;
  activeTicketTypesCount: number;
  ticketsSold?: number;
  revenue?: string;
  ratingAvg?: number | null;
  ratingCount?: number;
}

export interface AdminProducerEventMetrics {
  hasTicketing: boolean;
  isGeneralPublication?: boolean;
  ticketTypesCount: number;
  activeTicketTypesCount: number;
  ticketsSold: number;
  courtesyCount: number;
  revenue: string;
  currency: string;
  scanCount: number;
  ticketsAvailable: number;
  paidOrdersCount: number;
  pendingOrdersCount: number;
  expiredOrdersCount: number;
  attendanceRatePercent?: number;
  ratingAvg?: number | null;
  ratingCount?: number;
  referralPerformance?: Array<{
    referralLinkId: string;
    code: string;
    referrerProfileId: string;
    referrerDisplayName: string | null;
    paidOrdersCount: number;
    ticketsSoldCount: number;
    grossRevenueCents: number;
  }>;
}

export interface GeneralPublicationsRepo {
  list(params?: {
    status?: string;
    category?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    data: EventSummary[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  create(input: {
    category: string;
    title: string;
    summary?: string | null;
    description?: string | null;
    subcategoryId?: string | null;
    venueName?: string | null;
    city?: string | null;
    venueAddress?: string | null;
    province?: string | null;
    googlePlaceId?: string | null;
    geoLat?: number | null;
    geoLng?: number | null;
    startAt?: string;
    endAt?: string | null;
    capacityTotal?: number | null;
    coverImageUrl?: string | null;
    headerImageUrl?: string | null;
    galleryImages?: Array<{ url: string; type?: string }>;
    status?: string;
  }): Promise<{ id: string; title: string; category: string | null; status: string }>;
}

export interface AdminProducersRepo {
  listProducers(params?: {
    search?: string;
    status?: string;
    hasPendingEvents?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: AdminProducerListItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }>;
  getProducer(producerId: string): Promise<AdminProducerDetail>;
  listProducerEvents(producerId: string): Promise<{ data: AdminProducerEventListItem[] }>;
  getProducerEventMetrics(
    producerId: string,
    eventId: string,
  ): Promise<AdminProducerEventMetrics>;
  approveProducerEvent(
    producerId: string,
    eventId: string,
  ): Promise<{ id: string; status: string }>;
  rejectProducerEvent(
    producerId: string,
    eventId: string,
    reason: string,
  ): Promise<{ id: string; status: string }>;
  postponeProducerEvent(
    producerId: string,
    eventId: string,
    reason: string,
    newStartAt?: string,
  ): Promise<{ id: string; status: string }>;
  cancelProducerEvent(
    producerId: string,
    eventId: string,
    reason: string,
  ): Promise<{ id: string; status: string }>;
}

export interface PublicImageUploadInput {
  file: File;
  scope: import('@yo-te-invito/shared').UploadScope;
  purpose: import('@yo-te-invito/shared').UploadPurpose;
  entityId?: string;
}

export interface UploadsRepo {
  uploadPublicImage(
    input: PublicImageUploadInput,
  ): Promise<import('@yo-te-invito/shared').PublicImageUploadResponse>;
}

export interface Repositories {
  auth: AuthRepo;
  uploads: UploadsRepo;
  events: EventsRepo;
  generalPublications: GeneralPublicationsRepo;
  adminProducers: AdminProducersRepo;
  adminGastro: AdminGastroRepo;
  rentalLocations: RentalLocationsRepo;
  excursionOperators: ExcursionOperatorsRepo;
  categoryBanners: CategoryBannersRepo;
  categoryEditorialBanners: CategoryEditorialBannersRepo;
  subcategories: SubcategoriesRepo;
  contentTags: ContentTagsRepo;
  applications: ApplicationsRepo;
  profiles: ProfilesRepo;
  hotel: HotelRepo;
  inbox: InboxRepo;
  gastro: GastroRepo;
  publicGastro: PublicGastroLocationsRepo;
  publicHotel: PublicHotelLocationsRepo;
  ticketTypes: TicketTypesRepo;
  ticketTemplates: TicketTemplatesRepo;
  tickets: TicketsRepo;
  orders: OrdersRepo;
  users: UsersRepo;
  mePortal: MePortalRepo;
  reviews: ReviewsRepo;
  referrals: ReferralsRepo;
  courtesies: CourtesiesRepo;
  metrics: MetricsRepo;
  adminDashboard: AdminDashboardRepo;
  adminEvents: AdminEventsRepo;
  adminContentLifecycle: AdminContentLifecycleRepo;
  adminAudit: AdminAuditRepo;
  adminUsers: AdminUsersRepo;
  adminPayments: AdminPaymentsRepo;
  legalDocuments: LegalDocumentsRepo;
  producerDashboard: ProducerDashboardRepo;
  producers: ProducersRepo;
  commercialReviews: CommercialReviewsRepo;
  producerReviews: ProducerReviewsRepo;
  gastroReviews: ManagedVenueReviewsRepo;
  hotelReviews: ManagedVenueReviewsRepo;
  adminReviews: AdminReviewsRepo;
  adminReviewDisputes: AdminReviewDisputesRepo;
  scanner: ScannerRepo;
  payouts: PayoutsRepo;
  platformConfig: PlatformConfigRepo;
  publicPlatformConfig: PublicPlatformConfigRepo;
}
