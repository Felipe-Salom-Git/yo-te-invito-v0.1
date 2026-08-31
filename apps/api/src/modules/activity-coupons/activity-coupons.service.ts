import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { NotificationKind, Prisma, type ActivityCoupon, type GastroWeekday } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  canArchiveActivityCoupon,
  canUnarchiveActivityCoupon,
  ErrorCode,
  computeActivityCouponMetrics,
  formatCouponVisualBenefit,
  formatManualShortCodeDisplay,
  getGastroWeekdayLabelEs,
  initialStatusForActivityCouponOrigin,
  activityCouponBelongsToOperator,
  buildActivityCouponQrPayload,
  isActivityCouponClaimActive,
  isEventCategoryEligibleForActivityCoupon,
  isGastroDiscountDateRangeOrderValid,
  isGastroDiscountValidToday,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
  type ActivityCouponClaimView,
  type ActivityCouponCreateInput,
  type ActivityCouponResponse,
  type ActivityCouponUpdateInput,
  type GastroWeekday as SharedWeekday,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UserNotificationsService } from '../notifications/user-notifications.service';
import { allocateActivityCouponClaimShortCode } from '../../common/activity-claim-short-code.util';
import { ActivityCouponClaimEmailService } from './activity-coupon-claim-email.service';

const couponInclude = {
  event: { select: { id: true, title: true, category: true, deletedAt: true } },
  excursionOperator: { select: { id: true, name: true, deletedAt: true, isActive: true } },
} as const;

type CouponRow = Prisma.ActivityCouponGetPayload<{ include: typeof couponInclude }>;

function readImageUrls(value: Prisma.JsonValue | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

@Injectable()
export class ActivityCouponsService {
  private readonly logger = new Logger(ActivityCouponsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly claimEmail: ActivityCouponClaimEmailService,
    private readonly notifications: UserNotificationsService,
  ) {}

  async assertOperator(tenantId: string, operatorId: string) {
    const operator = await this.prisma.excursionOperator.findFirst({
      where: { id: operatorId, tenantId, deletedAt: null },
    });
    if (!operator) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Operador de actividades no encontrado',
      });
    }
    if (!operator.isActive) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El operador no está activo',
      });
    }
    return operator;
  }

  async assertExcursionEvent(tenantId: string, eventId: string, operatorId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        title: true,
        category: true,
        excursionOperatorId: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Actividad no encontrada',
      });
    }
    if (!isEventCategoryEligibleForActivityCoupon(event.category)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El cupón solo puede asociarse a una Actividad (category=excursion)',
      });
    }
    if (!activityCouponBelongsToOperator(event.excursionOperatorId, operatorId)) {
      throw new BadRequestException({
        code: ErrorCode.FORBIDDEN,
        message: 'La actividad no pertenece a este operador',
      });
    }
    return event;
  }

  private dateFields(body: {
    validityMode: 'DATE_RANGE' | 'WEEKLY_RECURRING';
    validFrom?: string;
    validTo?: string;
    validWeekday?: GastroWeekday | null;
  }) {
    const isWeekly = body.validityMode === 'WEEKLY_RECURRING';
    if (isWeekly) {
      return {
        validFrom: null as Date | null,
        validTo: null as Date | null,
        couponDate: null as Date | null,
        validWeekday: body.validWeekday ?? null,
      };
    }
    const from = body.validFrom;
    const to = body.validTo;
    if (!from || !to || !isGastroDiscountDateRangeOrderValid(from, to)) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Indicá una vigencia de inicio y cierre válida',
      });
    }
    const validFrom = normalizeGastroDiscountValidFromDate(from);
    const validTo = normalizeGastroDiscountExpiryDate(to);
    return {
      validFrom,
      validTo,
      couponDate: validTo,
      validWeekday: null as GastroWeekday | null,
    };
  }

  toResponse(row: CouponRow | ActivityCoupon & {
    event?: { title: string } | null;
    excursionOperator?: { name: string } | null;
  }): ActivityCouponResponse {
    const imageUrls = readImageUrls('imageUrls' in row ? row.imageUrls : null);
    return {
      id: row.id,
      tenantId: row.tenantId,
      eventId: row.eventId,
      eventTitle: row.event?.title ?? null,
      excursionOperatorId: row.excursionOperatorId,
      operatorName: row.excursionOperator?.name ?? null,
      code: row.code,
      title: row.title,
      summary: row.summary,
      detail: row.detail,
      type: row.type,
      value: row.value,
      benefitLabel: formatCouponVisualBenefit(row.type, row.value),
      validityMode: row.validityMode,
      validWeekday: row.validWeekday,
      validFrom: row.validFrom?.toISOString() ?? null,
      validTo: row.validTo?.toISOString() ?? null,
      couponDate: row.couponDate?.toISOString() ?? null,
      imageUrls,
      status: row.status,
      rejectionReason: row.rejectionReason,
      archivedAt: row.archivedAt?.toISOString() ?? null,
      createdByOrigin: row.createdByOrigin,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listByOperator(tenantId: string, operatorId: string) {
    await this.assertOperator(tenantId, operatorId);
    const rows = await this.prisma.activityCoupon.findMany({
      where: { tenantId, excursionOperatorId: operatorId },
      include: couponInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map((r) => this.toResponse(r)) };
  }

  async getForOperator(tenantId: string, operatorId: string, couponId: string) {
    await this.assertOperator(tenantId, operatorId);
    const row = await this.prisma.activityCoupon.findFirst({
      where: { id: couponId, tenantId, excursionOperatorId: operatorId },
      include: couponInclude,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cupón no encontrado',
      });
    }
    return this.toResponse(row);
  }

  async createForAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    body: ActivityCouponCreateInput,
  ) {
    await this.assertOperator(tenantId, operatorId);
    await this.assertExcursionEvent(tenantId, body.eventId, operatorId);
    const validityMode = body.validityMode ?? 'DATE_RANGE';
    const dates = this.dateFields({
      validityMode,
      validFrom: body.validFrom,
      validTo: body.validTo,
      validWeekday: body.validWeekday,
    });
    const created = await this.prisma.activityCoupon.create({
      data: {
        tenantId,
        eventId: body.eventId,
        excursionOperatorId: operatorId,
        code: `AC-${randomBytes(4).toString('hex').toUpperCase()}`,
        title: body.title.trim(),
        summary: body.summary.trim(),
        detail: body.detail.trim(),
        type: body.type,
        value: body.value,
        validityMode,
        ...dates,
        imageUrls: (body.imageUrls ?? []) as Prisma.InputJsonValue,
        status: initialStatusForActivityCouponOrigin('ADMIN'),
        createdByOrigin: 'ADMIN',
        createdByUserId: adminUserId,
      },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_CREATED',
      entityType: 'ActivityCoupon',
      entityId: created.id,
      after: { status: created.status, eventId: created.eventId, origin: 'ADMIN' },
    });
    return this.toResponse(created);
  }

  async updateForAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
    body: ActivityCouponUpdateInput,
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (current.archivedAt) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No se puede editar un cupón archivado',
      });
    }
    const validityMode = body.validityMode ?? current.validityMode;
    let dates: ReturnType<ActivityCouponsService['dateFields']> | undefined;
    if (
      body.validityMode != null ||
      body.validFrom != null ||
      body.validTo != null ||
      body.validWeekday !== undefined
    ) {
      dates = this.dateFields({
        validityMode,
        validFrom: body.validFrom ?? current.validFrom?.toISOString(),
        validTo: body.validTo ?? current.validTo?.toISOString(),
        validWeekday:
          body.validWeekday === undefined
            ? current.validWeekday
            : body.validWeekday,
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: {
        ...(body.title != null ? { title: body.title.trim() } : {}),
        ...(body.summary != null ? { summary: body.summary.trim() } : {}),
        ...(body.detail != null ? { detail: body.detail.trim() } : {}),
        ...(body.type != null ? { type: body.type } : {}),
        ...(body.value != null ? { value: body.value } : {}),
        ...(body.imageUrls != null
          ? { imageUrls: body.imageUrls as Prisma.InputJsonValue }
          : {}),
        ...(body.validityMode != null ? { validityMode: body.validityMode } : {}),
        ...(dates ?? {}),
      },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_UPDATED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
      after: { title: updated.title, type: updated.type, value: updated.value },
    });
    return this.toResponse(updated);
  }

  async archiveForAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (
      !canArchiveActivityCoupon({
        status: current.status,
        archivedAt: current.archivedAt,
        validityMode: current.validityMode,
        validTo: current.validTo,
        couponDate: current.couponDate,
      })
    ) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este cupón no se puede archivar todavía',
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: { archivedAt: new Date() },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_ARCHIVED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
    });
    return this.toResponse(updated);
  }

  async unarchiveForAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (!canUnarchiveActivityCoupon({ status: current.status, archivedAt: current.archivedAt })) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El cupón no está archivado',
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: { archivedAt: null },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_UNARCHIVED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
    });
    return this.toResponse(updated);
  }

  async patchStatusForAdmin(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
    status: 'ACTIVE' | 'CANCELLED',
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (['REJECTED', 'EXPIRED', 'PENDING_REVIEW'].includes(current.status) && status === 'ACTIVE') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No se puede reactivar este cupón',
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: { status },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: status === 'CANCELLED' ? 'ACTIVITY_COUPON_CANCELLED' : 'ACTIVITY_COUPON_APPROVED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
      after: { status },
    });
    return this.toResponse(updated);
  }

  async approvePending(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (current.status !== 'PENDING_REVIEW') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se pueden aprobar cupones en revisión',
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: { status: 'ACTIVE', rejectionReason: null },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_APPROVED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
      after: { status: 'ACTIVE' },
    });
    return this.toResponse(updated);
  }

  async rejectPending(
    tenantId: string,
    adminUserId: string,
    adminRole: string,
    operatorId: string,
    couponId: string,
    reason: string,
  ) {
    const current = await this.getRow(tenantId, operatorId, couponId);
    if (current.status !== 'PENDING_REVIEW') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Solo se pueden rechazar cupones en revisión',
      });
    }
    const updated = await this.prisma.activityCoupon.update({
      where: { id: current.id },
      data: { status: 'REJECTED', rejectionReason: reason.trim() },
      include: couponInclude,
    });
    await this.audit.logAction({
      tenantId,
      actorId: adminUserId,
      actorRole: adminRole,
      action: 'ACTIVITY_COUPON_REJECTED',
      entityType: 'ActivityCoupon',
      entityId: updated.id,
      after: { status: 'REJECTED', reason: reason.trim() },
    });
    return this.toResponse(updated);
  }

  async getMetrics(tenantId: string, operatorId: string, couponId: string) {
    await this.getRow(tenantId, operatorId, couponId);
    const [issued, used, unused, validations] = await Promise.all([
      this.prisma.activityCouponClaim.count({ where: { tenantId, couponId } }),
      this.prisma.activityCouponClaim.count({
        where: { tenantId, couponId, status: 'USED' },
      }),
      this.prisma.activityCouponClaim.count({
        where: { tenantId, couponId, status: 'ACTIVE' },
      }),
      this.prisma.activityCouponValidation.count({ where: { couponId } }),
    ]);
    return computeActivityCouponMetrics({
      claimsIssued: issued,
      claimsUsed: used,
      claimsUnused: unused,
      validations,
    });
  }

  async listPublicByEvent(tenantId: string, eventId: string) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, category: true },
    });
    if (!event || !isEventCategoryEligibleForActivityCoupon(event.category)) {
      return { data: [] as ActivityCouponResponse[] };
    }
    const rows = await this.prisma.activityCoupon.findMany({
      where: {
        tenantId,
        eventId,
        archivedAt: null,
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
      include: couponInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { data: rows.map((r) => this.toResponse(r)) };
  }

  async getPublic(tenantId: string, couponId: string) {
    const row = await this.prisma.activityCoupon.findFirst({
      where: {
        id: couponId,
        tenantId,
        archivedAt: null,
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
      include: couponInclude,
    });
    if (!row || !isEventCategoryEligibleForActivityCoupon(row.event.category)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cupón no encontrado',
      });
    }
    return this.toResponse(row);
  }

  private async getRow(tenantId: string, operatorId: string, couponId: string) {
    await this.assertOperator(tenantId, operatorId);
    const row = await this.prisma.activityCoupon.findFirst({
      where: { id: couponId, tenantId, excursionOperatorId: operatorId },
      include: couponInclude,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cupón no encontrado',
      });
    }
    return row;
  }

  private toClaimView(claim: {
    id: string;
    accessToken: string;
    email: string;
    qrToken: string;
    shortCode: string;
    status: string;
    expiresAt: Date | null;
    coupon: CouponRow;
  }): ActivityCouponClaimView {
    const coupon = this.toResponse(claim.coupon);
    return {
      claimId: claim.id,
      accessToken: claim.accessToken,
      email: claim.email,
      qrPayload: buildActivityCouponQrPayload(claim.coupon.id, claim.qrToken),
      shortCode: claim.shortCode,
      shortCodeDisplay: formatManualShortCodeDisplay(claim.shortCode),
      status: claim.status as ActivityCouponClaimView['status'],
      coupon,
      eventTitle: coupon.eventTitle ?? null,
      operatorName: coupon.operatorName ?? null,
      validTo: claim.expiresAt?.toISOString() ?? coupon.validTo,
    };
  }

  async claimPublic(
    tenantId: string,
    couponId: string,
    email: string,
    userId?: string | null,
    actorRole = 'GUEST',
    actorId?: string,
  ): Promise<ActivityCouponClaimView & { emailSent: boolean; message: string }> {
    let normalizedEmail = email.trim().toLowerCase();
    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { email: true },
      });
      if (user?.email) normalizedEmail = user.email.trim().toLowerCase();
    }
    if (!normalizedEmail) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Necesitamos un email para emitir el cupón',
      });
    }

    const coupon = await this.prisma.activityCoupon.findFirst({
      where: {
        id: couponId,
        tenantId,
        archivedAt: null,
        status: { in: ['ACTIVE', 'APPROVED'] },
      },
      include: couponInclude,
    });
    if (!coupon || !isEventCategoryEligibleForActivityCoupon(coupon.event.category)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Cupón no encontrado',
      });
    }

    const todayCheck = isGastroDiscountValidToday({
      validityMode: coupon.validityMode,
      validWeekday: coupon.validWeekday as SharedWeekday | null,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      discountDate: coupon.couponDate,
      status: coupon.status,
    });
    if (!todayCheck.valid) {
      if (todayCheck.reason === 'EXPIRED') {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'La vigencia de este cupón ya finalizó.',
        });
      }
      if (todayCheck.reason === 'NOT_VALID_TODAY' && coupon.validWeekday) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Este cupón solo es válido los ${getGastroWeekdayLabelEs(coupon.validWeekday as SharedWeekday)}.`,
        });
      }
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este cupón aún no está disponible para reclamar.',
      });
    }

    const existing = await this.prisma.activityCouponClaim.findUnique({
      where: { couponId_email: { couponId, email: normalizedEmail } },
    });
    const rawExpires = coupon.validTo ?? coupon.couponDate ?? null;
    const expiresAt = rawExpires ? normalizeGastroDiscountExpiryDate(rawExpires) : null;

    if (existing && isActivityCouponClaimActive(existing.status)) {
      const view = this.toClaimView({ ...existing, coupon });
      const emailSent = await this.notifyClaim(tenantId, userId, view);
      return {
        ...view,
        emailSent,
        message: 'Ya tenés este cupón. Podés verlo en Mi cuenta.',
      };
    }
    if (existing) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ya tenés un QR para este cupón que no está activo',
      });
    }

    const claim = await this.prisma.activityCouponClaim.create({
      data: {
        tenantId,
        couponId,
        email: normalizedEmail,
        userId: userId ?? null,
        qrToken: randomBytes(24).toString('hex'),
        accessToken: randomBytes(32).toString('hex'),
        shortCode: await allocateActivityCouponClaimShortCode(this.prisma),
        status: 'ACTIVE',
        expiresAt,
      },
    });
    await this.audit.logAction({
      tenantId,
      actorId: actorId ?? userId ?? 'anonymous',
      actorRole,
      action: 'ACTIVITY_COUPON_CLAIMED',
      entityType: 'ActivityCouponClaim',
      entityId: claim.id,
      metadata: { couponId, email: normalizedEmail },
    });
    const view = this.toClaimView({ ...claim, coupon });
    const emailSent = await this.notifyClaim(tenantId, userId, view);
    return {
      ...view,
      emailSent,
      message: emailSent
        ? 'Cupón reclamado. Te enviamos el QR por email. También está en Mi cuenta.'
        : 'Cupón reclamado. Guardalo en Mi cuenta y presentá el QR o el código corto.',
    };
  }

  private async notifyClaim(
    tenantId: string,
    userId: string | null | undefined,
    view: ActivityCouponClaimView,
  ): Promise<boolean> {
    const sendResult = await this.claimEmail.sendClaimEmail({
      claimId: view.claimId,
      accessToken: view.accessToken,
      to: view.email,
      recipientUserId: userId ?? null,
      operatorName: view.operatorName ?? 'Actividad',
      eventTitle: view.eventTitle ?? 'Actividad',
      couponTitle: view.coupon.title,
      benefitLabel: view.coupon.benefitLabel,
      qrPayload: view.qrPayload,
      shortCodeDisplay: view.shortCodeDisplay,
      validTo: view.validTo,
    });

    if (userId) {
      void this.notifications
        .deliver({
          tenantId,
          userId,
          userEmail: view.email?.trim() || null,
          kind: NotificationKind.ACTIVITY_COUPON_CLAIMED,
          referenceKey: `activity-coupon-claim:${view.claimId}`,
          title: 'Tu cupón de Actividades está listo',
          body: `«${view.coupon.title}» ya está en Mi cuenta. Presentá el QR o el código corto.`,
          href: '/me/descuentos',
          sendInApp: true,
          sendEmail: false,
          sendPush: true,
        })
        .catch((err) => {
          this.logger.error(`activity coupon IN_APP failed claim=${view.claimId}`, err);
        });
    }

    return sendResult.sent;
  }

  async getPublicClaim(
    tenantId: string,
    claimId: string,
    accessToken?: string,
  ): Promise<ActivityCouponClaimView> {
    const claim = await this.prisma.activityCouponClaim.findFirst({
      where: { id: claimId, tenantId },
      include: { coupon: { include: couponInclude } },
    });
    if (!claim || (accessToken && claim.accessToken !== accessToken)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Reclamo no encontrado',
      });
    }
    if (!isEventCategoryEligibleForActivityCoupon(claim.coupon.event.category)) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Reclamo no encontrado',
      });
    }
    return this.toClaimView(claim);
  }

  async listMine(tenantId: string, userId: string): Promise<{ data: ActivityCouponClaimView[] }> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });
    if (!user) return { data: [] };
    const normalizedEmail = user.email?.trim().toLowerCase();
    const claimOr: Array<{ userId: string } | { email: string }> = [{ userId }];
    if (normalizedEmail) claimOr.push({ email: normalizedEmail });
    const claims = await this.prisma.activityCouponClaim.findMany({
      where: { tenantId, OR: claimOr },
      include: { coupon: { include: couponInclude } },
      orderBy: { createdAt: 'desc' },
    });
    return {
      data: claims
        .filter((c) => isEventCategoryEligibleForActivityCoupon(c.coupon.event.category))
        .map((c) => this.toClaimView(c)),
    };
  }
}
