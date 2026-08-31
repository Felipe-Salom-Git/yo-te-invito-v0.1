import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { AuditAction } from '@prisma/client';
import {
  applyDiscountUpdateToSnapshot,
  buildGastroDiscountQrPayload,
  buildPendingUpdatePayload,
  canArchiveGastroDiscount,
  canUnarchiveGastroDiscount,
  ErrorCode,
  hasMaterialDiscountChanges,
  parsePendingUpdate,
  shouldSubmitDiscountPendingEdit,
  snapshotFromPublishedRow,
  type GastroDiscountCreateInput,
  type GastroDiscountResponse,
  type GastroDiscountUpdateInput,
  type GastroWeekday,
  isGastroDiscountDateRangeOrderValid,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { GastroOwnershipService } from './gastro-ownership.service';
import { GastroDiscountMetricsService } from './gastro-discount-metrics.service';
import { GastroLifecycleNotificationsService } from '../notifications/gastro-lifecycle-notifications.service';
import type {
  GastroDiscountArchiveAction,
  GastroDiscountStatusUpdate,
  GastroDiscountSummaryResponse,
} from '@yo-te-invito/shared';

function pendingCode(): string {
  return `PND-${randomBytes(4).toString('hex').toUpperCase()}`;
}

@Injectable()
export class GastroPortalDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly ownership: GastroOwnershipService,
    private readonly discountMetrics: GastroDiscountMetricsService,
    private readonly audit: AuditService,
    private readonly lifecycleNotifications: GastroLifecycleNotificationsService,
  ) {}

  mapDiscount(row: {
    id: string;
    tenantId: string;
    eventId: string;
    gastroProfileId: string | null;
    code: string;
    type: string;
    value: number;
    displayTitle: string | null;
    summary: string | null;
    detail: string | null;
    discountDate: Date | null;
    validFrom: Date | null;
    validTo: Date | null;
    validityMode?: string;
    validWeekday?: string | null;
    status: string;
    adminNotes: string | null;
    rejectionReason: string | null;
    qrToken: string | null;
    emailSentAt: Date | null;
    emailSendError: string | null;
    lastEmailAttemptAt: Date | null;
    displayImageUrls?: unknown;
    submittedImageUrls?: unknown;
    createdAt: Date;
    updatedAt: Date;
    createdByOrigin?: string | null;
    archivedAt?: Date | null;
    pendingUpdate?: unknown;
    pendingUpdateSubmittedAt?: Date | null;
  }): GastroDiscountResponse {
    const readUrls = (v: unknown) =>
      v && Array.isArray(v) ? (v as string[]).filter(Boolean) : [];
    const submitted = readUrls(row.submittedImageUrls);
    const display = readUrls(row.displayImageUrls);
    const headerImageUrl = display[0] ?? submitted[0] ?? null;
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventId: row.eventId,
      gastroProfileId: row.gastroProfileId,
      code: row.code,
      type: row.type as 'PERCENT' | 'FIXED',
      value: row.value,
      title: row.displayTitle,
      summary: row.summary,
      detail: row.detail,
      discountDate: row.discountDate?.toISOString() ?? null,
      validityMode: (row.validityMode ?? 'DATE_RANGE') as GastroDiscountResponse['validityMode'],
      validWeekday: (row.validWeekday ?? null) as GastroDiscountResponse['validWeekday'],
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      status: row.status as GastroDiscountResponse['status'],
      adminNotes: row.adminNotes,
      rejectionReason: row.rejectionReason,
      qrToken: row.qrToken,
      qrPayload:
        row.qrToken && ['APPROVED', 'ACTIVE'].includes(row.status)
          ? buildGastroDiscountQrPayload(row.id, row.qrToken)
          : null,
      emailSentAt: row.emailSentAt?.toISOString() ?? null,
      emailSendError: row.emailSendError,
      lastEmailAttemptAt: row.lastEmailAttemptAt?.toISOString() ?? null,
      headerImageUrl,
      imageUrls: submitted,
      submittedImageUrls: submitted,
      displayImageUrls: display,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdByOrigin: row.createdByOrigin === 'ADMIN' ? 'ADMIN' : 'GASTRO',
      archivedAt: row.archivedAt?.toISOString() ?? null,
      hasPendingUpdate: parsePendingUpdate(row.pendingUpdate) != null,
      pendingUpdate: parsePendingUpdate(row.pendingUpdate),
      pendingUpdateSubmittedAt: row.pendingUpdateSubmittedAt?.toISOString() ?? null,
    };
  }

  private urlsJson(urls: string[]): Prisma.InputJsonValue {
    return urls as Prisma.InputJsonValue;
  }

  private normalizeDateRangeFields(body: {
    validFrom?: string;
    validTo?: string;
    discountDate?: string;
  }): { validFrom: Date; validTo: Date; discountDate: Date } {
    if (body.validFrom && body.validTo) {
      if (!isGastroDiscountDateRangeOrderValid(body.validFrom, body.validTo)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'La fecha de cierre debe ser igual o posterior a la fecha de inicio.',
        });
      }
      const validFrom = normalizeGastroDiscountValidFromDate(body.validFrom);
      const validTo = normalizeGastroDiscountExpiryDate(body.validTo);
      return { validFrom, validTo, discountDate: validTo };
    }
    if (body.discountDate) {
      const validTo = normalizeGastroDiscountExpiryDate(body.discountDate);
      const validFrom = normalizeGastroDiscountValidFromDate(body.discountDate);
      return { validFrom, validTo, discountDate: validTo };
    }
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message:
        'Para descuentos por fecha/rango, indicá una fecha de inicio y una fecha de cierre válida.',
    });
  }

  private async assertGastroUser(tenantId: string, userId: string, _userRole: string) {
    const has = await this.profiles.hasGastroAccess(tenantId, userId);
    if (!has) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Necesitás un perfil gastronómico activo para gestionar tickets de descuento',
      });
    }
  }

  private async getOwnedProfile(
    tenantId: string,
    userId: string,
    profileId?: string,
  ) {
    const profile = await this.ownership.getOperationalProfileById(
      tenantId,
      userId,
      profileId,
    );
    if (!profile.publicEventId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Configurá tu local gastronómico antes de crear tickets de descuento',
      });
    }
    return profile;
  }

  private async assertOwnDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id, tenantId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    if (!row.gastroProfileId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para gestionar este descuento',
      });
    }

    const profile = await this.ownership.assertCanOperateProfile(
      tenantId,
      userId,
      row.gastroProfileId,
    );
    return { row, profile };
  }

  private assertEditableStatus(status: string) {
    if (
      !['PENDING_REVIEW', 'COMMISSION_NEGOTIATION', 'ACTIVE', 'APPROVED', 'CANCELLED'].includes(
        status,
      )
    ) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este ticket no puede editarse en su estado actual',
      });
    }
  }

  async listMyDiscounts(
    tenantId: string,
    userId: string,
    userRole: string,
    profileId?: string,
  ) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const profile = await this.getOwnedProfile(tenantId, userId, profileId);
    const or: Prisma.GastroDiscountWhereInput[] = [{ gastroProfileId: profile.id }];
    if (profile.publicEventId) {
      or.push({ eventId: profile.publicEventId });
    }
    const rows = await this.prisma.gastroDiscount.findMany({
      where: { tenantId, OR: or },
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map((r) => this.mapDiscount(r)) };
  }

  async getMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ) {
    const { row } = await this.assertOwnDiscount(tenantId, userId, userRole, id);
    return this.mapDiscount(row);
  }

  async createMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    body: GastroDiscountCreateInput,
    profileId?: string,
  ) {
    await this.assertGastroUser(tenantId, userId, userRole);
    const operational = await this.ownership.listOperationalProfiles(tenantId, userId);
    let resolvedProfileId: string;
    try {
      resolvedProfileId = GastroOwnershipService.resolveCreateProfileId(
        operational,
        profileId,
      );
    } catch (e) {
      if (e instanceof Error && e.message === 'GASTRO_PROFILE_REQUIRED') {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Seleccioná el local al que pertenece este descuento',
        });
      }
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Configurá un local gastronómico activo antes de crear tickets de descuento',
      });
    }
    const profile = await this.getOwnedProfile(tenantId, userId, resolvedProfileId);
    const validityMode = body.validityMode ?? 'DATE_RANGE';
    const isWeekly = validityMode === 'WEEKLY_RECURRING';

    const created = await this.prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId: profile.publicEventId!,
        gastroProfileId: profile.id,
        code: pendingCode(),
        type: 'PERCENT',
        value: 0,
        displayTitle: body.title.trim(),
        summary: body.summary.trim(),
        detail: body.detail.trim(),
        displayDescription: body.summary.trim(),
        validityMode,
        ...(isWeekly
          ? {
              validWeekday: body.validWeekday!,
              discountDate: null,
              validFrom: null,
              validTo: null,
            }
          : this.normalizeDateRangeFields({
              validFrom: body.validFrom,
              validTo: body.validTo,
              discountDate: body.discountDate,
            })),
        status: 'PENDING_REVIEW',
        createdByOrigin: 'GASTRO',
        createdByUserId: userId,
        commissionCoordinationAcceptedAt: new Date(),
        submittedImageUrls: this.urlsJson(body.imageUrls),
      },
    });
    this.lifecycleNotifications.notifyDiscountPending(
      tenantId,
      created.id,
      created.displayTitle ?? body.title,
      'create',
    );
    return this.mapDiscount(created);
  }

  async updateMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    body: GastroDiscountUpdateInput,
  ) {
    const { row: existing } = await this.assertOwnDiscount(
      tenantId,
      userId,
      userRole,
      id,
    );
    this.assertEditableStatus(existing.status);
    if (existing.archivedAt) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Restaurá el descuento del archivo antes de editarlo',
      });
    }

    const nextValidityMode = body.validityMode ?? existing.validityMode;
    const switchingToWeekly = nextValidityMode === 'WEEKLY_RECURRING';
    const switchingToDateRange = nextValidityMode === 'DATE_RANGE';
    const shouldUpdateDateRange =
      switchingToDateRange &&
      (body.validFrom !== undefined ||
        body.validTo !== undefined ||
        body.discountDate !== undefined ||
        body.validityMode === 'DATE_RANGE');

    let dateRangePatch:
      | { discountDate: Date; validFrom: Date; validTo: Date; validWeekday: null }
      | undefined;
    if (shouldUpdateDateRange) {
      const fromSrc =
        body.validFrom ??
        body.discountDate ??
        existing.validFrom?.toISOString() ??
        existing.discountDate?.toISOString();
      const toSrc =
        body.validTo ??
        body.discountDate ??
        existing.validTo?.toISOString() ??
        existing.discountDate?.toISOString();
      const range = this.normalizeDateRangeFields({
        validFrom: fromSrc,
        validTo: toSrc,
      });
      dateRangePatch = { ...range, validWeekday: null };
    }

    if (shouldSubmitDiscountPendingEdit(existing.status)) {
      const published = snapshotFromPublishedRow(existing);
      const proposed = applyDiscountUpdateToSnapshot(published, body, {
        validityMode: nextValidityMode,
        validWeekday: switchingToWeekly
          ? ((body.validWeekday ?? existing.validWeekday) as GastroWeekday | null)
          : null,
        validFrom: dateRangePatch?.validFrom ?? existing.validFrom,
        validTo: dateRangePatch?.validTo ?? existing.validTo,
        discountDate: dateRangePatch?.discountDate ?? existing.discountDate,
      });
      const material = hasMaterialDiscountChanges(published, proposed);
      if (!material) {
        if (existing.pendingUpdate == null) {
          return this.mapDiscount(existing);
        }
        const cleared = await this.prisma.gastroDiscount.update({
          where: { id },
          data: {
            pendingUpdate: Prisma.DbNull,
            pendingUpdateSubmittedAt: null,
            pendingUpdateSubmittedByUserId: null,
          },
        });
        return this.mapDiscount(cleared);
      }

      const pending = buildPendingUpdatePayload(proposed);
      const updated = await this.prisma.gastroDiscount.update({
        where: { id },
        data: {
          pendingUpdate: pending as Prisma.InputJsonValue,
          pendingUpdateSubmittedAt: new Date(),
          pendingUpdateSubmittedByUserId: userId,
        },
      });
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: userRole,
        action: AuditAction.GASTRO_DISCOUNT_EDIT_SUBMITTED,
        entityType: 'GastroDiscount',
        entityId: id,
        before: published,
        after: pending,
      });
      this.lifecycleNotifications.notifyDiscountPending(
        tenantId,
        id,
        updated.displayTitle ?? existing.displayTitle ?? body.title ?? 'tu descuento',
        'edit',
      );
      return this.mapDiscount(updated);
    }

    const updated = await this.prisma.gastroDiscount.update({
      where: { id },
      data: {
        ...(body.title !== undefined && { displayTitle: body.title.trim() }),
        ...(body.summary !== undefined && {
          summary: body.summary.trim(),
          displayDescription: body.summary.trim(),
        }),
        ...(body.detail !== undefined && { detail: body.detail.trim() }),
        ...(body.validityMode !== undefined && { validityMode: body.validityMode }),
        ...(switchingToWeekly && {
          validWeekday: body.validWeekday ?? existing.validWeekday,
          discountDate: null,
          validFrom: null,
          validTo: null,
        }),
        ...(dateRangePatch ?? {}),
        ...(nextValidityMode === 'WEEKLY_RECURRING' &&
          body.validWeekday !== undefined && { validWeekday: body.validWeekday }),
        ...(body.imageUrls !== undefined && {
          submittedImageUrls: this.urlsJson(body.imageUrls),
        }),
      },
    });
    return this.mapDiscount(updated);
  }

  async getDiscountSummary(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
  ): Promise<GastroDiscountSummaryResponse> {
    await this.assertOwnDiscount(tenantId, userId, userRole, id);
    return this.discountMetrics.buildSummaryForDiscount(tenantId, id, false);
  }

  async updateDiscountStatus(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    body: GastroDiscountStatusUpdate,
  ): Promise<GastroDiscountSummaryResponse> {
    const { profile } = await this.assertOwnDiscount(tenantId, userId, userRole, id);
    return this.discountMetrics.updateDiscountStatus(tenantId, id, body, {
      id: userId,
      role: userRole,
    }, { profileId: profile.id });
  }

  async archiveMyDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    id: string,
    body: GastroDiscountArchiveAction,
  ) {
    const { row } = await this.assertOwnDiscount(tenantId, userId, userRole, id);
    const input = {
      status: row.status,
      archivedAt: row.archivedAt,
      validityMode: row.validityMode,
      validTo: row.validTo,
      discountDate: row.discountDate,
    };
    if (body.archived) {
      if (!canArchiveGastroDiscount(input)) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message:
            'Solo se pueden archivar descuentos vencidos, cancelados o rechazados. Desactivá uno activo antes.',
        });
      }
      const updated = await this.prisma.gastroDiscount.update({
        where: { id },
        data: { archivedAt: new Date() },
      });
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: userRole,
        action: AuditAction.GASTRO_DISCOUNT_ARCHIVED,
        entityType: 'GastroDiscount',
        entityId: id,
        before: { archivedAt: null, status: row.status },
        after: { archivedAt: updated.archivedAt?.toISOString(), status: row.status },
      });
      return this.mapDiscount(updated);
    }
    if (!canUnarchiveGastroDiscount(input)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento no está archivado',
      });
    }
    const updated = await this.prisma.gastroDiscount.update({
      where: { id },
      data: { archivedAt: null },
    });
    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: AuditAction.GASTRO_DISCOUNT_UNARCHIVED,
      entityType: 'GastroDiscount',
      entityId: id,
      before: { archivedAt: row.archivedAt?.toISOString(), status: row.status },
      after: { archivedAt: null, status: row.status },
    });
    return this.mapDiscount(updated);
  }
}
