import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type ActivityCoupon, type GastroWeekday } from '@prisma/client';
import { randomBytes } from 'crypto';
import {
  canArchiveActivityCoupon,
  canUnarchiveActivityCoupon,
  ErrorCode,
  formatCouponVisualBenefit,
  initialStatusForActivityCouponOrigin,
  activityCouponBelongsToOperator,
  isEventCategoryEligibleForActivityCoupon,
  isGastroDiscountDateRangeOrderValid,
  normalizeGastroDiscountExpiryDate,
  normalizeGastroDiscountValidFromDate,
  type ActivityCouponCreateInput,
  type ActivityCouponResponse,
  type ActivityCouponUpdateInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
}
