import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ProfileStatus, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  buildGastroDiscountQrPayload,
  ErrorCode,
  parseRentalOpeningHours,
  type AdminGastroDiscountMetrics,
  type AdminGastroDiscountPublication,
  type AdminGastroLocationsListQuery,
} from '@yo-te-invito/shared';
import {
  readGastroGallery,
  readGastroOpeningHoursFields,
} from '../gastro/gastro-profile-fields.util';
import { readEntitySocialLinks } from '../../common/entity-social-links.util';
import { loadEventTagsPublic } from '../../common/event-tags.util';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { GastroFollowDiscountAlertsService } from '../notifications/gastro-follow-discount-alerts.service';

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
    discounts: Array<{ gastroProfileId: string | null; eventId: string; status: string }>,
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
      if (this.isPendingDiscountStatus(d.status)) cur.pending += 1;
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
    createdAt: Date;
    _count: { validations: number };
  }) {
    return {
      id: r.id,
      title: r.displayTitle,
      summary: r.summary,
      status: r.status,
      discountDate: r.discountDate?.toISOString() ?? null,
      validationCount: r._count.validations,
      createdAt: r.createdAt.toISOString(),
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
        status: { in: [...PENDING_DISCOUNT_STATUSES] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        gastroProfile: { select: { id: true, displayName: true } },
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
      select: { gastroProfileId: true, eventId: true, status: true },
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
      subcategoryName: p.subcategory?.name ?? null,
      menuUrl: p.menuUrl,
      websiteUrl: p.websiteUrl,
      bookingUrl: p.bookingUrl,
      socialLinks: readEntitySocialLinks(p.socialLinks),
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
      include: { _count: { select: { validations: true } } },
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

  private async loadDiscount(tenantId: string, _profileId: string, discountId: string) {
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
    return {
      id: row.id,
      profileId: row.gastroProfileId!,
      eventId: row.eventId,
      title: row.displayTitle,
      summary: row.summary,
      detail: row.detail,
      discountDate: row.discountDate?.toISOString() ?? null,
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
    };
  }

  async getDiscountMetrics(
    tenantId: string,
    profileId: string,
    discountId: string,
  ): Promise<AdminGastroDiscountMetrics> {
    const row = await this.loadDiscount(tenantId, profileId, discountId);
    const [validationCount, lastValidation] = await Promise.all([
      this.prisma.gastroDiscountValidation.count({ where: { discountId } }),
      this.prisma.gastroDiscountValidation.findFirst({
        where: { discountId },
        orderBy: { validatedAt: 'desc' },
        select: { validatedAt: true },
      }),
    ]);
    return {
      validationCount,
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
      | 'GASTRO_DISCOUNT_QR_EMAIL_SENT',
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
    const display = readUrls(row.displayImageUrls);
    if (display.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Guardá la publicación con al menos una imagen antes de aprobar',
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
    return this.getDiscountDetail(tenantId, profileId, discountId);
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
    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        status: 'REJECTED',
        rejectionReason: reason.trim(),
        adminNotes: note?.trim() || row.adminNotes,
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_REJECTED',
      discountId,
      { status: row.status },
      { status: 'REJECTED' },
    );
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
    await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        status: 'CANCELLED',
        rejectionReason: reason.trim(),
        adminNotes: note?.trim() || row.adminNotes,
      },
    });
    await this.audit(
      tenantId,
      adminUserId,
      adminRole,
      'GASTRO_DISCOUNT_CANCELLED',
      discountId,
      { status: row.status },
      { status: 'CANCELLED' },
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
}
