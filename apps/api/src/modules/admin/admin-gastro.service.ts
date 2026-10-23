import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProfileStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  buildGastroDiscountQrPayload,
  canIssueMasterQr,
  ErrorCode,
  GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
  GASTRO_COURTESY_EXPIRED_AT_APPROVAL_MESSAGE,
  COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES,
  isCourtesyOnlyVisibility,
  isGastroDiscountExpired,
  parsePendingUpdate,
  pendingUpdateToPublishedFields,
  parseRentalOpeningHours,
  snapshotFromPublishedRow,
  canArchiveGastroDiscount,
  canUnarchiveGastroDiscount,
  initialStatusForDiscountOrigin,
  isGastroDiscountDateRangeOrderValid,
  isGastroProfileEligibleForAdminDiscountCreate,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
  type GastroDiscountCreateInput,
  type GastroWeekday,
  type AdminGastroDiscountMetrics,
  type AdminGastroDiscountPublication,
  type AdminGastroLocationsListQuery,
} from '@yo-te-invito/shared';
import {
  readGastroGallery,
  readGastroOpeningHoursFields,
} from '../gastro/gastro-profile-fields.util';
import { readEntitySocialLinks } from '../../common/entity-social-links.util';
import { parseRelatedLinks } from '../../common/related-links.util';
import { loadEventTagsPublic } from '../../common/event-tags.util';
import { loadEventSubcategoriesPublic } from '../../common/event-subcategories.util';
import { resolveGastroPrimarySubcategoryName } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { GastroFollowDiscountAlertsService } from '../notifications/gastro-follow-discount-alerts.service';
import { GastroLifecycleNotificationsService } from '../notifications/gastro-lifecycle-notifications.service';
import { BenefitCommercialAgreementsService } from '../benefit-agreements/benefit-commercial-agreements.service';
import { adminDiscountMatchesRouteProfile } from './admin-gastro-discount-scope.util';
import { cancelCourtesyClaimsForDiscount } from '../gastro/gastro-courtesy-lifecycle.util';
import { GastroCourtesyDeliveryService } from '../gastro/gastro-courtesy-delivery.service';

function readUrls(value: unknown): string[] {
  if (value == null) return [];
  let parsed: unknown = value;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed) as unknown;
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return (parsed as string[]).filter((u) => typeof u === 'string' && u.trim());
}

function urlsJson(urls: string[]): Prisma.InputJsonValue {
  return urls as Prisma.InputJsonValue;
}

const PENDING_DISCOUNT_STATUSES = [
  'PENDING_REVIEW',
  'COMMISSION_NEGOTIATION',
  'APPROVED',
] as const;

type GastroProfileRef = {
  id: string;
  publicEventId: string | null;
};

@Injectable()
export class AdminGastroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly gastroFollowAlerts: GastroFollowDiscountAlertsService,
    private readonly lifecycleNotifications: GastroLifecycleNotificationsService,
    private readonly benefitAgreements: BenefitCommercialAgreementsService,
    private readonly courtesyDelivery: GastroCourtesyDeliveryService,
  ) {}

  private toProfileStatus(status: ProfileStatus) {
    return status.toLowerCase() as
      | 'draft'
      | 'pending'
      | 'active'
      | 'rejected'
      | 'suspended';
  }

  private discountsWhereForProfile(
    tenantId: string,
    profile: GastroProfileRef,
  ): Prisma.GastroDiscountWhereInput {
    const or: Prisma.GastroDiscountWhereInput[] = [{ gastroProfileId: profile.id }];
    if (profile.publicEventId) {
      or.push({ eventId: profile.publicEventId });
    }
    return { tenantId, OR: or };
  }

  private isPendingDiscountStatus(status: string) {
    return (PENDING_DISCOUNT_STATUSES as readonly string[]).includes(status);
  }

  private tallyDiscountCounts(
    profiles: GastroProfileRef[],
    discounts: Array<{
      gastroProfileId: string | null;
      eventId: string;
      status: string;
      pendingUpdateSubmittedAt?: Date | null;
    }>,
  ) {
    const eventToProfileId = new Map<string, string>();
    for (const p of profiles) {
      if (p.publicEventId) eventToProfileId.set(p.publicEventId, p.id);
    }

    const countMap = new Map<
      string,
      { total: number; pending: number; active: number }
    >();
    for (const p of profiles) {
      countMap.set(p.id, { total: 0, pending: 0, active: 0 });
    }

    for (const d of discounts) {
      const profileId =
        d.gastroProfileId ?? eventToProfileId.get(d.eventId) ?? null;
      if (!profileId) continue;
      const cur = countMap.get(profileId);
      if (!cur) continue;
      cur.total += 1;
      if (this.isPendingDiscountStatus(d.status) || d.pendingUpdateSubmittedAt) {
        cur.pending += 1;
      }
      if (d.status === 'ACTIVE') cur.active += 1;
    }

    return countMap;
  }

  private async resolveDiscountProfileId(
    tenantId: string,
    row: { gastroProfileId: string | null; eventId: string },
  ): Promise<string | null> {
    if (row.gastroProfileId) return row.gastroProfileId;
    if (!row.eventId) return null;
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, publicEventId: row.eventId },
      select: { id: true },
    });
    return profile?.id ?? null;
  }

  private mapDiscountListItem(r: {
    id: string;
    displayTitle: string | null;
    summary: string | null;
    status: string;
    discountDate: Date | null;
    validFrom?: Date | null;
    validTo?: Date | null;
    validityMode?: string;
    validWeekday?: string | null;
    createdAt: Date;
    createdByOrigin?: string | null;
    archivedAt?: Date | null;
    pendingUpdate?: unknown;
    pendingUpdateSubmittedAt?: Date | null;
    visibility?: string | null;
    courtesyCampaign?: {
      id: string;
      title: string;
      discountLabel: string | null;
      description?: string | null;
      validFrom?: Date | null;
      validTo?: Date | null;
      _count?: { claims: number };
    } | null;
    _count: { validations: number };
  }) {
    const pending = parsePendingUpdate(r.pendingUpdate);
    const hasPendingUpdate = pending != null || r.pendingUpdateSubmittedAt != null;
    return {
      id: r.id,
      title: r.displayTitle,
      summary: r.summary,
      status: r.status,
      discountDate: r.discountDate?.toISOString() ?? null,
      validFrom: r.validFrom?.toISOString() ?? null,
      validTo: r.validTo?.toISOString() ?? null,
      validityMode: (r.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
      validWeekday: r.validWeekday ?? null,
      validationCount: r._count.validations,
      createdAt: r.createdAt.toISOString(),
      hasPendingUpdate,
      reviewKind: hasPendingUpdate
        ? ('EDIT' as const)
        : ['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(r.status)
          ? ('NEW' as const)
          : undefined,
      createdByOrigin: r.createdByOrigin === 'ADMIN' ? ('ADMIN' as const) : ('GASTRO' as const),
      archivedAt: r.archivedAt?.toISOString() ?? null,
      visibility: isCourtesyOnlyVisibility(r.visibility)
        ? ('COURTESY_ONLY' as const)
        : ('PUBLIC' as const),
      courtesy:
        isCourtesyOnlyVisibility(r.visibility) && r.courtesyCampaign
          ? {
              campaignId: r.courtesyCampaign.id,
              title: r.courtesyCampaign.title,
              discountLabel: r.courtesyCampaign.discountLabel,
              description: r.courtesyCampaign.description ?? null,
              recipientCount: r.courtesyCampaign._count?.claims ?? 0,
              validFrom: r.courtesyCampaign.validFrom?.toISOString() ?? null,
              validTo: r.courtesyCampaign.validTo?.toISOString() ?? null,
            }
          : null,
    };
  }

  async resolveProfileIdForDiscount(tenantId: string, discountId: string) {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      select: { gastroProfileId: true, eventId: true },
    });
    if (!row) return null;
    return this.resolveDiscountProfileId(tenantId, row);
  }

  async listPendingDiscounts(tenantId: string) {
    const rows = await this.prisma.gastroDiscount.findMany({
      where: {
        tenantId,
        OR: [
          { status: { in: [...PENDING_DISCOUNT_STATUSES] } },
          { pendingUpdateSubmittedAt: { not: null } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        gastroProfile: { select: { id: true, displayName: true } },
        courtesyCampaign: { include: { _count: { select: { claims: true } } } },
        _count: { select: { validations: true } },
      },
    });

    const data: Array<{
      id: string;
      title: string | null;
      summary: string | null;
      status: string;
      discountDate: string | null;
      validationCount: number;
      createdAt: string;
      profileId: string;
      profileName: string;
    }> = [];

    for (const r of rows) {
      const profileId = await this.resolveDiscountProfileId(tenantId, r);
      if (!profileId) continue;
      const profileName =
        r.gastroProfile?.displayName ??
        (
          await this.prisma.gastroProfile.findUnique({
            where: { id: profileId },
            select: { displayName: true },
          })
        )?.displayName ??
        'Local';
      data.push({
        ...this.mapDiscountListItem(r),
        profileId,
        profileName,
      });
    }

    return { data };
  }

  async listLocations(tenantId: string, query: AdminGastroLocationsListQuery) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const search = query.search?.trim();
    const statusFilter = query.status
      ? (query.status.toUpperCase() as ProfileStatus)
      : undefined;

    const where: Prisma.GastroProfileWhereInput = {
      tenantId,
      ...(statusFilter && { status: statusFilter }),
      ...(search && {
        OR: [
          { displayName: { contains: search, mode: 'insensitive' } },
          { contactEmail: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          {
            memberships: {
              some: {
                user: { email: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      }),
    };

    const [profiles, total] = await Promise.all([
      this.prisma.gastroProfile.findMany({
        where,
        orderBy: { displayName: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          memberships: {
            where: { membershipRole: 'OWNER' },
            take: 1,
            include: {
              user: { select: { id: true, email: true, firstName: true, lastName: true } },
            },
          },
        },
      }),
      this.prisma.gastroProfile.count({ where }),
    ]);

    const profileRefs: GastroProfileRef[] = profiles.map((p) => ({
      id: p.id,
      publicEventId: p.publicEventId,
    }));
    const profileIds = profileRefs.map((p) => p.id);
    const publicEventIds = profileRefs
      .map((p) => p.publicEventId)
      .filter((id): id is string => Boolean(id));

    const discounts =
      profileIds.length > 0
        ? await this.prisma.gastroDiscount.findMany({
            where: {
              tenantId,
              OR: [
                { gastroProfileId: { in: profileIds } },
                ...(publicEventIds.length > 0
                  ? [{ eventId: { in: publicEventIds } }]
                  : []),
              ],
            },
            select: {
              gastroProfileId: true,
              eventId: true,
              status: true,
              pendingUpdateSubmittedAt: true,
            },
          })
        : [];

    const countMap = this.tallyDiscountCounts(profileRefs, discounts);

    let items = profiles.map((p) => {
      const owner = p.memberships[0]?.user;
      const counts = countMap.get(p.id) ?? { total: 0, pending: 0, active: 0 };
      return {
        id: p.id,
        displayName: p.displayName,
        status: this.toProfileStatus(p.status),
        city: p.city,
        province: p.province,
        contactEmail: p.contactEmail,
        contactPhone: p.contactPhone,
        publicEventId: p.publicEventId,
        owner: {
          userId: owner?.id ?? null,
          email: owner?.email ?? null,
          name:
            [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || null,
        },
        discountsCount: counts.total,
        pendingDiscountsCount: counts.pending,
        activeDiscountsCount: counts.active,
        createdAt: p.createdAt.toISOString(),
      };
    });

    if (query.hasPendingDiscounts) {
      items = items.filter((i) => i.pendingDiscountsCount > 0);
    }

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  private async assertProfile(tenantId: string, profileId: string) {
    const profile = await this.prisma.gastroProfile.findFirst({
      where: { id: profileId, tenantId },
      include: {
        subcategory: { select: { name: true } },
        memberships: {
          where: { membershipRole: 'OWNER' },
          take: 1,
          include: {
            user: { select: { id: true, email: true, firstName: true, lastName: true } },
          },
        },
      },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Gastro location not found',
      });
    }
    return profile;
  }

  async getLocation(tenantId: string, profileId: string) {
    const p = await this.assertProfile(tenantId, profileId);
    const profileRef: GastroProfileRef = { id: p.id, publicEventId: p.publicEventId };
    const discountRows = await this.prisma.gastroDiscount.findMany({
      where: this.discountsWhereForProfile(tenantId, profileRef),
      select: { gastroProfileId: true, eventId: true, status: true, pendingUpdateSubmittedAt: true },
    });
    const counts = this.tallyDiscountCounts([profileRef], discountRows).get(p.id) ?? {
      total: 0,
      pending: 0,
      active: 0,
    };
    const discountsCount = counts.total;
    const pendingDiscountsCount = counts.pending;
    const activeDiscountsCount = counts.active;
    const owner = p.memberships[0]?.user;
    const tags = await loadEventTagsPublic(this.prisma, p.publicEventId);
    const subcategories = await loadEventSubcategoriesPublic(this.prisma, p.publicEventId);
    const legacySubcategoryName = p.subcategory?.name ?? null;
    return {
      id: p.id,
      tenantId: p.tenantId,
      displayName: p.displayName,
      status: this.toProfileStatus(p.status),
      city: p.city,
      province: p.province,
      contactEmail: p.contactEmail,
      contactPhone: p.contactPhone,
      publicEventId: p.publicEventId,
      tags,
      legalName: p.legalName,
      summary: p.summary,
      detail: p.detail,
      address: p.address,
      bannerUrl: p.bannerUrl,
      galleryUrls: readGastroGallery(p),
      googlePlaceId: p.googlePlaceId,
      geoLat: p.geoLat,
      geoLng: p.geoLng,
      openingHours: parseRentalOpeningHours(p.openingHours),
      openingHoursNote: p.openingHoursNote,
      ...readGastroOpeningHoursFields(p),
      subcategoryId: p.subcategoryId,
      subcategoryName: resolveGastroPrimarySubcategoryName({
        subcategoryName: legacySubcategoryName,
        subcategories,
      }),
      subcategories,
      menuUrl: p.menuUrl,
      websiteUrl: p.websiteUrl,
      bookingUrl: p.bookingUrl,
      socialLinks: readEntitySocialLinks(p.socialLinks),
      relatedLinks: parseRelatedLinks(p.relatedLinks),
      owner: {
        userId: owner?.id ?? null,
        email: owner?.email ?? null,
        name: [owner?.firstName, owner?.lastName].filter(Boolean).join(' ') || null,
      },
      discountsCount,
      pendingDiscountsCount,
      activeDiscountsCount,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  async listLocationDiscounts(tenantId: string, profileId: string) {
    const profile = await this.assertProfile(tenantId, profileId);
    const rows = await this.prisma.gastroDiscount.findMany({
      where: this.discountsWhereForProfile(tenantId, {
        id: profile.id,
        publicEventId: profile.publicEventId,
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        courtesyCampaign: { include: { _count: { select: { claims: true } } } },
        _count: { select: { validations: true } },
      },
    });

    const orphanIds = rows
      .filter((r) => !r.gastroProfileId)
      .map((r) => r.id);
    if (orphanIds.length > 0) {
      await this.prisma.gastroDiscount.updateMany({
        where: { id: { in: orphanIds } },
        data: { gastroProfileId: profile.id },
      });
    }

    return {
      data: rows.map((r) => this.mapDiscountListItem(r)),
    };
  }

  private async loadDiscount(tenantId: string, profileId: string, discountId: string) {
    const routeProfileId = profileId?.trim();
    if (!routeProfileId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const routeProfile = await this.prisma.gastroProfile.findFirst({
      where: { id: routeProfileId, tenantId },
      select: { id: true },
    });
    if (!routeProfile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: { gastroProfile: true },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    const canonicalProfileId = await this.resolveDiscountProfileId(tenantId, row);
    if (!adminDiscountMatchesRouteProfile(routeProfileId, canonicalProfileId)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }

    if (canonicalProfileId && row.gastroProfileId !== canonicalProfileId) {
      await this.prisma.gastroDiscount.update({
        where: { id: row.id },
        data: { gastroProfileId: canonicalProfileId },
      });
      row.gastroProfileId = canonicalProfileId;
      if (!row.gastroProfile) {
        row.gastroProfile = await this.prisma.gastroProfile.findUnique({
          where: { id: canonicalProfileId },
        });
      }
    }

    return row;
  }

  /** G8.3: campaign context + recipient counts shown to ADMIN while reviewing a courtesy. */
  private async loadCourtesySummary(tenantId: string, discountId: string) {
    const campaign = await this.prisma.gastroCourtesyCampaign.findFirst({
      where: { tenantId, discountId },
    });
    if (!campaign) return null;
    const claimScope = { tenantId, discountId, type: 'COURTESY' as const };
    const [recipientCount, usedCount, pendingDeliveryCount, deliveredCount] = await Promise.all([
      this.prisma.gastroDiscountClaim.count({ where: claimScope }),
      this.prisma.gastroDiscountClaim.count({
        where: { ...claimScope, OR: [{ status: 'USED' }, { usedAt: { not: null } }] },
      }),
      this.prisma.gastroDiscountClaim.count({
        where: { ...claimScope, status: 'ACTIVE', emailSentAt: null },
      }),
      this.prisma.gastroDiscountClaim.count({
        where: { ...claimScope, emailSentAt: { not: null } },
      }),
    ]);
    return {
      campaignId: campaign.id,
      title: campaign.title,
      discountLabel: campaign.discountLabel,
      description: campaign.description,
      message: campaign.message,
      recipientCount,
      usedCount,
      pendingDeliveryCount,
      deliveredCount,
      validFrom: campaign.validFrom?.toISOString() ?? null,
      validTo: campaign.validTo?.toISOString() ?? null,
    };
  }

  async getDiscountDetail(tenantId: string, profileId: string, discountId: string) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const submitted = readUrls(row.submittedImageUrls);
    const display = readUrls(row.displayImageUrls);
    const gastroProfile =
      row.gastroProfile ??
      (row.gastroProfileId
        ? await this.prisma.gastroProfile.findUnique({
            where: { id: row.gastroProfileId },
          })
        : null);
    const courtesy = isCourtesyOnlyVisibility(row.visibility)
      ? await this.loadCourtesySummary(tenantId, row.id)
      : null;
    return {
      id: row.id,
      profileId: row.gastroProfileId!,
      profileName: gastroProfile?.displayName ?? null,
      visibility: isCourtesyOnlyVisibility(row.visibility)
        ? ('COURTESY_ONLY' as const)
        : ('PUBLIC' as const),
      courtesy,
      eventId: row.eventId,
      title: row.displayTitle,
      summary: row.summary,
      detail: row.detail,
      type: row.type === 'FIXED' ? ('FIXED' as const) : ('PERCENT' as const),
      value: row.value,
      discountDate: row.discountDate?.toISOString() ?? null,
      validityMode: row.validityMode ?? 'DATE_RANGE',
      validWeekday: row.validWeekday ?? null,
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      status: row.status,
      submittedImageUrls: submitted,
      displayImageUrls: display.length > 0 ? display : submitted,
      adminNotes: row.adminNotes,
      rejectionReason: row.rejectionReason,
      qrToken: row.qrToken,
      qrPayload:
        row.qrToken && ['APPROVED', 'ACTIVE'].includes(row.status)
          ? buildGastroDiscountQrPayload(row.id, row.qrToken)
          : null,
      emailSentAt: row.emailSentAt?.toISOString() ?? null,
      emailSendError: row.emailSendError,
      ownerEmail: gastroProfile?.contactEmail ?? null,
      ownerPhone: gastroProfile?.contactPhone ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdByOrigin: row.createdByOrigin === 'ADMIN' ? 'ADMIN' : 'GASTRO',
      archivedAt: row.archivedAt?.toISOString() ?? null,
      hasPendingUpdate: parsePendingUpdate(row.pendingUpdate) != null,
      pendingUpdate: parsePendingUpdate(row.pendingUpdate),
      pendingUpdateSubmittedAt: row.pendingUpdateSubmittedAt?.toISOString() ?? null,
    };
  }

  async getDiscountMetrics(
    tenantId: string,
    profileId: string,
    discountId: string,
  ): Promise<AdminGastroDiscountMetrics> {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const [validationCount, redeemedClaimsCount, totalClaimsCount, lastValidation] =
      await Promise.all([
      this.prisma.gastroDiscountValidation.count({ where: { discountId } }),
      this.prisma.gastroDiscountClaim.count({
        where: {
          discountId,
          OR: [{ status: 'USED' }, { usedAt: { not: null } }],
        },
      }),
      this.prisma.gastroDiscountClaim.count({ where: { discountId } }),
      this.prisma.gastroDiscountValidation.findFirst({
        where: { discountId },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true },
      }),
    ]);
    return {
      validationCount,
      redeemedClaimsCount,
      totalClaimsCount,
      availableClaimsCount: Math.max(0, totalClaimsCount - redeemedClaimsCount),
      status: row.status,
      discountDate: row.discountDate?.toISOString() ?? null,
      emailSentAt: row.emailSentAt?.toISOString() ?? null,
      lastValidationAt: lastValidation?.validatedAt.toISOString() ?? null,
    };
  }

  async updatePublication(
    tenantId: string,
    profileId: string,
    discountId: string,
    body: AdminGastroDiscountPublication,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No se puede editar una publicación cerrada',
      });
    }
    const updated = await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        displayTitle: body.title.trim(),
        summary: body.summary.trim(),
        detail: body.detail.trim(),
        displayDescription: body.summary.trim(),
        displayImageUrls: urlsJson(body.displayImageUrls),
      },
    });
    // G8.2: keep the campaign title (used by /me and the claim email) aligned with the discount.
    if (isCourtesyOnlyVisibility(row.visibility)) {
      await this.prisma.gastroCourtesyCampaign.updateMany({
        where: { discountId, tenantId },
        data: { title: body.title.trim() },
      });
    }
    return this.getDiscountDetail(tenantId, profileId, updated.id);
  }

  private async audit(
    tenantId: string,
    actorId: string,
    actorRole: string,
    action:
      | 'GASTRO_DISCOUNT_COMMISSION_NEGOTIATION'
      | 'GASTRO_DISCOUNT_APPROVED'
      | 'GASTRO_DISCOUNT_REJECTED'
      | 'GASTRO_DISCOUNT_CANCELLED'
      | 'GASTRO_DISCOUNT_ACTIVATED'
      | 'GASTRO_DISCOUNT_QR_EMAIL_SENT'
      | 'GASTRO_DISCOUNT_EDIT_APPROVED'
      | 'GASTRO_DISCOUNT_EDIT_REJECTED'
      | 'ADMIN_GASTRO_DISCOUNT_CREATED'
      | 'GASTRO_DISCOUNT_ARCHIVED'
      | 'GASTRO_DISCOUNT_UNARCHIVED',
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorRole,
        action,
        entityType: 'GastroDiscount',
        entityId,
        before: before as object,
        after: after as object,
      },
    });
  }

  async markCommissionNegotiation(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
    note?: string | null,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (row.status !== 'PENDING_REVIEW') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo tickets en revisión pueden pasar a coordinación de comisión',
      });
    }
    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        status: 'COMMISSION_NEGOTIATION',
        adminNotes: note?.trim() || row.adminNotes,
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_COMMISSION_NEGOTIATION',
      discountId,
      { status: row.status },
      { status: 'COMMISSION_NEGOTIATION' },
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async approve(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (!['PENDING_REVIEW', 'COMMISSION_NEGOTIATION'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket no puede aprobarse en su estado actual',
      });
    }
    // G8.3/G8.4: a courtesy is approved through its own branch (no images, no master QR,
    // no follower alert; claims are released and delivered).
    if (isCourtesyOnlyVisibility(row.visibility)) {
      return this.approveCourtesy(tenantId, adminUserId, adminRole, profileId, row);
    }
    const display = readUrls(row.displayImageUrls);
    if (display.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Guardá la publicación con al menos una imagen antes de aprobar',
      });
    }
    const resolvedProfileId = row.gastroProfileId ?? profileId;
    const agreementCtx = await this.benefitAgreements.resolveApplicable(tenantId, {
      vertical: 'GASTRO',
      gastroProfileId: resolvedProfileId,
    });
    if (!agreementCtx.agreement) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND,
        message:
          'El local no tiene acuerdo comercial vigente. Creá o activá la tarifa del partner antes de aprobar el descuento.',
      });
    }
    const qrToken = randomBytes(24).toString('hex');
    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        status: 'ACTIVE',
        qrToken,
        qrGeneratedAt: new Date(),
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_APPROVED',
      discountId,
      { status: row.status },
      { status: 'ACTIVE' },
    );
    void this.gastroFollowAlerts.notifyFollowersOfNewActiveDiscount(tenantId, discountId);
    this.lifecycleNotifications.notifyDiscountApproved(
      tenantId,
      discountId,
      row.displayTitle ?? 'tu descuento',
      'create',
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  /**
   * G8.3 + G8.4 — Approve a PENDING courtesy (created by a GASTRO OWNER).
   *
   * Gate: CURRENT BenefitCommercialAgreement for tenant + gastroProfileId (commercial gate
   * only; nothing from the agreement is copied to the campaign/coupon). Then
   * PENDING_REVIEW/COMMISSION_NEGOTIATION → ACTIVE atomically (single winner; a repeated
   * approve fails and cannot re-deliver). The pre-created (retained) claims become usable;
   * they are NOT recreated and the audience is NOT recalculated. Delivery runs after the
   * status change and can never revert the approval. No master QR is generated and
   * followers are not alerted.
   */
  private async approveCourtesy(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    row: {
      id: string;
      status: string;
      gastroProfileId: string | null;
      displayTitle: string | null;
      validTo: Date | null;
    },
  ) {
    const discountId = row.id;
    const resolvedProfileId = row.gastroProfileId ?? profileId;
    const agreementCtx = await this.benefitAgreements.resolveApplicable(tenantId, {
      vertical: 'GASTRO',
      gastroProfileId: resolvedProfileId,
    });
    if (!agreementCtx.agreement) {
      throw new BadRequestException({
        code: ErrorCode.BENEFIT_AGREEMENT_NOT_FOUND,
        message: GASTRO_COURTESY_AGREEMENT_REQUIRED_MESSAGE,
      });
    }
    if (row.validTo && isGastroDiscountExpired(row.validTo)) {
      throw new BadRequestException({
        code: ErrorCode.GASTRO_COURTESY_EXPIRED_AT_APPROVAL,
        message: GASTRO_COURTESY_EXPIRED_AT_APPROVAL_MESSAGE,
      });
    }

    const activated = await this.prisma.gastroDiscount.updateMany({
      where: {
        id: discountId,
        tenantId,
        visibility: 'COURTESY_ONLY',
        status: { in: [...COURTESY_PRE_APPROVAL_DISCOUNT_STATUSES] },
      },
      // Courtesies never get a discount-level (master) QR: qrToken is intentionally untouched.
      data: { status: 'ACTIVE' },
    });
    if (activated.count === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Esta cortesía ya fue procesada',
      });
    }

    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_APPROVED',
      discountId,
      { status: row.status },
      { status: 'ACTIVE', courtesy: true, agreementId: agreementCtx.agreement.id },
    );

    // Delivery is best-effort and isolated: it never throws and never undoes the approval.
    const courtesyDelivery = await this.courtesyDelivery.deliverCampaign(tenantId, discountId, {
      actorId: adminUserId,
      actorRole: adminRole,
      trigger: 'APPROVAL',
      webBaseUrl: process.env.WEB_BASE_URL,
    });

    this.lifecycleNotifications.notifyDiscountApproved(
      tenantId,
      discountId,
      row.displayTitle ?? 'tu cortesía',
      'create',
    );

    const detail = await this.getDiscountDetail(tenantId, profileId, discountId);
    return { ...detail, courtesyDelivery };
  }

  /** G8.4: retry delivery of an APPROVED courtesy; only claims that never got an email. */
  async redeliverCourtesy(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (!isCourtesyOnlyVisibility(row.visibility)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo las cortesías tienen entrega por claim',
      });
    }
    if (!['ACTIVE', 'APPROVED'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo una cortesía aprobada puede entregarse',
      });
    }
    const courtesyDelivery = await this.courtesyDelivery.deliverCampaign(tenantId, discountId, {
      actorId: adminUserId,
      actorRole: adminRole,
      trigger: 'REDELIVER',
      webBaseUrl: process.env.WEB_BASE_URL,
    });
    const detail = await this.getDiscountDetail(tenantId, profileId, discountId);
    return { ...detail, courtesyDelivery };
  }

  async reject(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
    reason: string,
    note?: string | null,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket ya está cerrado',
      });
    }
    // G8.3.7: rejecting a courtesy makes every claim (retained or live) unusable in the same
    // transaction. REJECTED is terminal (updateDiscountStatus refuses it), so there is no
    // shortcut to re-activate it without a new request + review.
    const isCourtesy = isCourtesyOnlyVisibility(row.visibility);
    const cancelledClaims = await this.prisma.$transaction(async (tx) => {
      await tx.gastroDiscount.update({
        where: { id: discountId },
        data: {
          status: 'REJECTED',
          rejectionReason: reason.trim(),
          adminNotes: note?.trim() || row.adminNotes,
        },
      });
      return isCourtesy ? cancelCourtesyClaimsForDiscount(tx, tenantId, discountId) : 0;
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_REJECTED',
      discountId,
      { status: row.status },
      isCourtesy
        ? { status: 'REJECTED', courtesy: true, cancelledClaims }
        : { status: 'REJECTED' },
    );
    this.lifecycleNotifications.notifyDiscountRejected(
      tenantId,
      discountId,
      row.displayTitle ?? 'tu descuento',
      'create',
      reason,
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async approvePendingEdit(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const pending = parsePendingUpdate(row.pendingUpdate);
    if (!pending) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento no tiene una edición pendiente',
      });
    }
    const published = snapshotFromPublishedRow(row);
    const fields = pendingUpdateToPublishedFields(pending);
    // G8.2: a pending edit queued BEFORE courtesies became immutable must never change a
    // courtesy's nature (type/value/validity), and its text is mirrored to the campaign.
    const isCourtesy = isCourtesyOnlyVisibility(row.visibility);
    await this.prisma.$transaction(async (tx) => {
      await tx.gastroDiscount.update({
        where: { id: discountId },
        data: {
          displayTitle: fields.displayTitle,
          summary: fields.summary,
          detail: fields.detail,
          displayDescription: fields.displayDescription,
          submittedImageUrls: urlsJson(fields.submittedImageUrls),
          displayImageUrls: urlsJson(fields.submittedImageUrls),
          ...(isCourtesy
            ? {}
            : {
                type: fields.type,
                value: fields.value,
                validityMode: fields.validityMode,
                validWeekday: fields.validWeekday,
                validFrom: fields.validFrom,
                validTo: fields.validTo,
                discountDate: fields.discountDate,
              }),
          pendingUpdate: Prisma.DbNull,
          pendingUpdateSubmittedAt: null,
          pendingUpdateSubmittedByUserId: null,
        },
      });
      if (isCourtesy && fields.displayTitle?.trim()) {
        await tx.gastroCourtesyCampaign.updateMany({
          where: { discountId, tenantId },
          data: { title: fields.displayTitle.trim() },
        });
      }
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_EDIT_APPROVED',
      discountId,
      published,
      pending,
    );
    this.lifecycleNotifications.notifyDiscountApproved(
      tenantId,
      discountId,
      fields.displayTitle ?? row.displayTitle ?? 'tu descuento',
      'edit',
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async rejectPendingEdit(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
    note?: string | null,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const pending = parsePendingUpdate(row.pendingUpdate);
    if (!pending) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento no tiene una edición pendiente',
      });
    }
    const published = snapshotFromPublishedRow(row);
    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        pendingUpdate: Prisma.DbNull,
        pendingUpdateSubmittedAt: null,
        pendingUpdateSubmittedByUserId: null,
        adminNotes: note?.trim() || row.adminNotes,
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_EDIT_REJECTED',
      discountId,
      published,
      pending,
    );
    this.lifecycleNotifications.notifyDiscountRejected(
      tenantId,
      discountId,
      row.displayTitle ?? 'tu descuento',
      'edit',
      note ?? undefined,
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async archiveDiscount(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
    archived: boolean,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const input = {
      status: row.status,
      archivedAt: row.archivedAt,
      validityMode: row.validityMode,
      validTo: row.validTo,
      discountDate: row.discountDate,
    };
    if (archived) {
      if (!canArchiveGastroDiscount(input)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message:
            'Solo se pueden archivar descuentos vencidos, cancelados o rechazados',
        });
      }
      await this.prisma.gastroDiscount.update({
        where: { id: discountId },
        data: { archivedAt: new Date() },
      });
      await this.audit(
        tenantId,
        adminUserId,
        adminRole,
        'GASTRO_DISCOUNT_ARCHIVED',
        discountId,
        { archivedAt: null },
        { archivedAt: true },
      );
    } else {
      if (!canUnarchiveGastroDiscount(input)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Este descuento no está archivado',
        });
      }
      await this.prisma.gastroDiscount.update({
        where: { id: discountId },
        data: { archivedAt: null },
      });
      await this.audit(
        tenantId,
        adminUserId,
        adminRole,
        'GASTRO_DISCOUNT_UNARCHIVED',
        discountId,
        { archivedAt: row.archivedAt?.toISOString() },
        { archivedAt: null },
      );
    }
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async cancel(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
    reason: string,
    note?: string | null,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket ya está cerrado',
      });
    }
    // G8.2: cancelling a courtesy campaign also makes its ACTIVE claims unusable (same tx).
    const cancelledClaims = await this.prisma.$transaction(async (tx) => {
      await tx.gastroDiscount.update({
        where: { id: discountId },
        data: {
          status: 'CANCELLED',
          rejectionReason: reason.trim(),
          adminNotes: note?.trim() || row.adminNotes,
        },
      });
      return isCourtesyOnlyVisibility(row.visibility)
        ? cancelCourtesyClaimsForDiscount(tx, tenantId, discountId)
        : 0;
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_CANCELLED',
      discountId,
      { status: row.status },
      isCourtesyOnlyVisibility(row.visibility)
        ? { status: 'CANCELLED', courtesy: true, cancelledClaims }
        : { status: 'CANCELLED' },
    );
    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async sendQrEmail(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    discountId: string,
  ) {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    if (!canIssueMasterQr(row.visibility)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          'Las cortesías se entregan con un QR individual por destinatario; no tienen un QR general.',
      });
    }
    if (!['APPROVED', 'ACTIVE'].includes(row.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El QR solo puede enviarse después de aprobar el ticket',
      });
    }
    if (!row.qrToken) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El ticket no tiene QR generado',
      });
    }
    const to = row.gastroProfile?.contactEmail;
    if (!to) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El local no tiene email de contacto configurado',
      });
    }

    const payload = buildGastroDiscountQrPayload(row.id, row.qrToken);
    const now = new Date();
    let emailSendError: string | null = null;
    let emailSentAt: Date | null = null;

    if (!this.email.isConfigured()) {
      emailSendError = 'Email service not configured';
    } else {
      const ok = await this.email.send({
        to,
        subject: `QR descuento — ${row.displayTitle ?? 'Yo Te Invito'}`,
        html: `<p>Tu ticket de descuento fue activado.</p><p>Código QR:</p><pre>${payload}</pre>`,
        text: `Tu ticket de descuento fue activado.\n\nQR: ${payload}`,
      });
      if (ok) emailSentAt = now;
      else emailSendError = 'Failed to send email';
    }

    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        status: 'ACTIVE',
        emailSentAt,
        emailSendError,
        lastEmailAttemptAt: now,
      },
    });

    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      emailSentAt ? 'GASTRO_DISCOUNT_QR_EMAIL_SENT' : 'GASTRO_DISCOUNT_ACTIVATED',
      discountId,
      { status: row.status },
      { status: 'ACTIVE', emailSentAt: emailSentAt?.toISOString() ?? null },
    );

    if (row.status !== 'ACTIVE') {
      void this.gastroFollowAlerts.notifyFollowersOfNewActiveDiscount(tenantId, discountId);
    }

    return this.getDiscountDetail(tenantId, profileId, discountId);
  }

  async createDiscountOnBehalf(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    profileId: string,
    body: GastroDiscountCreateInput,
  ) {
    const profile = await this.assertProfile(tenantId, profileId);
    if (!isGastroProfileEligibleForAdminDiscountCreate(profile.status)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se pueden crear descuentos para un local ACTIVE',
      });
    }
    if (!profile.publicEventId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El local no tiene publicación pública',
      });
    }
    const validityMode = body.validityMode ?? 'DATE_RANGE';
    const isWeekly = validityMode === 'WEEKLY_RECURRING';
    const images = urlsJson(body.imageUrls);
    const qrToken = randomBytes(24).toString('hex');
    let dateFields: {
      validFrom: Date | null;
      validTo: Date | null;
      discountDate: Date | null;
      validWeekday: GastroWeekday | null;
    };
    if (isWeekly) {
      dateFields = {
        validFrom: null,
        validTo: null,
        discountDate: null,
        validWeekday: body.validWeekday ?? null,
      };
    } else {
      const from = body.validFrom ?? body.discountDate;
      const to = body.validTo ?? body.discountDate;
      if (!from || !to || !isGastroDiscountDateRangeOrderValid(from, to)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Indicá una vigencia de inicio y cierre válida',
        });
      }
      const validFrom = normalizeGastroDiscountValidFromDate(from);
      const validTo = normalizeGastroDiscountExpiryDate(to);
      dateFields = {
        validFrom,
        validTo,
        discountDate: validTo,
        validWeekday: null,
      };
    }
    const created = await this.prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId: profile.publicEventId,
        gastroProfileId: profile.id,
        code: `ADM-${randomBytes(4).toString('hex').toUpperCase()}`,
        type: 'PERCENT',
        value: 0,
        displayTitle: body.title.trim(),
        summary: body.summary.trim(),
        detail: body.detail.trim(),
        displayDescription: body.summary.trim(),
        validityMode,
        ...dateFields,
        status: initialStatusForDiscountOrigin('ADMIN'),
        createdByOrigin: 'ADMIN',
        createdByUserId: adminUserId,
        qrToken,
        qrGeneratedAt: new Date(),
        submittedImageUrls: images,
        displayImageUrls: images,
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'ADMIN_GASTRO_DISCOUNT_CREATED',
      created.id,
      {},
      { status: created.status, gastroProfileId: profile.id, origin: 'ADMIN' },
    );
    void this.gastroFollowAlerts.notifyFollowersOfNewActiveDiscount(tenantId, created.id);
    this.lifecycleNotifications.notifyDiscountApproved(
      tenantId,
      created.id,
      created.displayTitle ?? body.title,
      'create',
    );
    return this.getDiscountDetail(tenantId, profileId, created.id);
  }
}
