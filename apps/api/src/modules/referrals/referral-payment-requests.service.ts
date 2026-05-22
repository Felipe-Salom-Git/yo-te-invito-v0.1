import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma, ReferralPaymentRequestStatus } from '@prisma/client';
import {
  ErrorCode,
  type CreateReferralPaymentRequestInput,
  type EligibleReferralCommissionsList,
  type ReferralPaymentRequestDto,
  type ReferralPaymentRequestList,
  type RejectReferralPaymentRequestInput,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  allCommissionsSameProducer,
  hasOpenRequestCommissionOverlap,
  OPEN_REFERRAL_PAYMENT_REQUEST_STATUSES,
  validateCommissionPaymentEligibility,
} from './referral-payment-requests.util';

const OPEN_REQUEST_STATUSES: ReferralPaymentRequestStatus[] = [
  ...OPEN_REFERRAL_PAYMENT_REQUEST_STATUSES,
];

const paymentRequestInclude = {
  referrerProfile: { select: { id: true, displayName: true, publicHandle: true } },
  producerProfile: { select: { id: true, displayName: true } },
  items: {
    include: {
      commission: {
        include: {
          event: { select: { id: true, title: true } },
          referralLink: { select: { id: true, code: true } },
        },
      },
    },
  },
} as const;

type PaymentRequestRow = Prisma.ReferralPaymentRequestGetPayload<{
  include: typeof paymentRequestInclude;
}>;

@Injectable()
export class ReferralPaymentRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listEligibleCommissionsForReferrer(
    tenantId: string,
    referrerProfileId: string,
  ): Promise<EligibleReferralCommissionsList> {
    const blockedIds = await this.commissionIdsInOpenRequests(tenantId, referrerProfileId);

    const rows = await this.prisma.referralCommission.findMany({
      where: {
        tenantId,
        referrerProfileId,
        status: 'CONFIRMED',
        referralAttributionId: { not: null },
        producerProfileId: { not: null },
        ...(blockedIds.length > 0 ? { id: { notIn: blockedIds } } : {}),
      },
      include: {
        event: { select: { title: true } },
        referralLink: { select: { code: true } },
      },
      orderBy: { id: 'desc' },
    });

    const producerIds = [...new Set(rows.map((r) => r.producerProfileId!).filter(Boolean))];
    const producers =
      producerIds.length > 0
        ? await this.prisma.producerProfile.findMany({
            where: { id: { in: producerIds }, tenantId },
            select: { id: true, displayName: true },
          })
        : [];
    const producerNameById = new Map(producers.map((p) => [p.id, p.displayName]));

    return {
      commissions: rows.map((c) => this.mapEligibleCommission(c, producerNameById)),
    };
  }

  async listForReferrer(
    tenantId: string,
    referrerProfileId: string,
  ): Promise<ReferralPaymentRequestList> {
    const rows = await this.prisma.referralPaymentRequest.findMany({
      where: { tenantId, referrerProfileId },
      include: paymentRequestInclude,
      orderBy: { requestedAt: 'desc' },
    });
    return { paymentRequests: rows.map((r) => this.toDto(r)) };
  }

  async getForReferrer(
    tenantId: string,
    referrerProfileId: string,
    id: string,
  ): Promise<ReferralPaymentRequestDto> {
    const row = await this.findAuthorized(tenantId, id, { referrerProfileId });
    return this.toDto(row);
  }

  async createForReferrer(
    tenantId: string,
    referrerProfileId: string,
    actorId: string,
    actorRole: string,
    body: CreateReferralPaymentRequestInput,
  ): Promise<ReferralPaymentRequestDto> {
    const uniqueIds = [...new Set(body.commissionIds)];
    const commissions = await this.prisma.referralCommission.findMany({
      where: {
        id: { in: uniqueIds },
        tenantId,
        referrerProfileId,
      },
      include: {
        event: { select: { title: true } },
        referralLink: { select: { code: true } },
      },
    });

    if (commissions.length !== uniqueIds.length) {
      throw new NotFoundException({
        code: ErrorCode.REFERRAL_PAYMENT_COMMISSION_NOT_ELIGIBLE,
        message: 'Una o más comisiones no existen o no te pertenecen',
      });
    }

    this.assertCommissionsEligible(commissions);

    if (!allCommissionsSameProducer(commissions)) {
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PAYMENT_COMMISSION_NOT_ELIGIBLE,
        message: 'Todas las comisiones deben ser de la misma productora',
      });
    }

    const producerProfileId = commissions[0]!.producerProfileId!;

    const blockedIds = await this.commissionIdsInOpenRequests(tenantId, referrerProfileId);
    const overlap = hasOpenRequestCommissionOverlap(blockedIds, uniqueIds);
    if (overlap.length > 0) {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PAYMENT_COMMISSION_ALREADY_REQUESTED,
        message: 'Una o más comisiones ya están incluidas en otra solicitud abierta',
      });
    }

    const amountRequestedCents = commissions.reduce((s, c) => s + c.amountCents, 0);
    if (amountRequestedCents <= 0) {
      throw new BadRequestException({
        code: ErrorCode.REFERRAL_PAYMENT_COMMISSION_NOT_ELIGIBLE,
        message: 'El monto solicitado debe ser mayor a cero',
      });
    }

    const relationship = await this.prisma.producerReferrerRelationship.findFirst({
      where: {
        producerProfileId,
        referrerProfileId,
        status: 'ACTIVE',
        producerProfile: { tenantId },
        referrerProfile: { tenantId },
      },
    });
    if (!relationship) {
      throw new ForbiddenException({
        code: ErrorCode.ASSOCIATION_NOT_ACTIVE,
        message: 'Debés tener una asociación activa con la productora',
      });
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const request = await tx.referralPaymentRequest.create({
        data: {
          tenantId,
          referrerProfileId,
          producerProfileId,
          amountRequestedCents,
          message: body.message?.trim() || null,
          status: 'REQUESTED',
        },
      });
      await tx.referralPaymentRequestItem.createMany({
        data: uniqueIds.map((commissionId) => ({
          paymentRequestId: request.id,
          commissionId,
        })),
      });
      return tx.referralPaymentRequest.findUniqueOrThrow({
        where: { id: request.id },
        include: paymentRequestInclude,
      });
    });

    await this.audit.logAction({
      tenantId,
      actorId,
      actorRole,
      action: AuditAction.REFERRAL_PAYMENT_REQUEST_CREATED,
      entityType: 'ReferralPaymentRequest',
      entityId: created.id,
      after: { status: created.status, amountRequestedCents, commissionIds: uniqueIds },
    });

    return this.toDto(created);
  }

  async cancelForReferrer(
    tenantId: string,
    referrerProfileId: string,
    id: string,
    actorId: string,
    actorRole: string,
  ): Promise<ReferralPaymentRequestDto> {
    const existing = await this.findAuthorized(tenantId, id, { referrerProfileId });
    if (existing.status !== 'REQUESTED') {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PAYMENT_REQUEST_NOT_CANCELLABLE,
        message: 'Solo podés cancelar solicitudes en estado solicitado',
      });
    }

    const updated = await this.prisma.referralPaymentRequest.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: paymentRequestInclude,
    });

    await this.auditStatusChange(tenantId, actorId, actorRole, existing, updated);
    return this.toDto(updated);
  }

  async listForProducer(
    tenantId: string,
    producerProfileId: string,
  ): Promise<ReferralPaymentRequestList> {
    const rows = await this.prisma.referralPaymentRequest.findMany({
      where: { tenantId, producerProfileId },
      include: paymentRequestInclude,
      orderBy: { requestedAt: 'desc' },
    });
    return { paymentRequests: rows.map((r) => this.toDto(r)) };
  }

  async getForProducer(
    tenantId: string,
    producerProfileId: string,
    id: string,
  ): Promise<ReferralPaymentRequestDto> {
    const row = await this.findAuthorized(tenantId, id, { producerProfileId });
    return this.toDto(row);
  }

  async markInReviewForProducer(
    tenantId: string,
    producerProfileId: string,
    id: string,
    actorId: string,
    actorRole: string,
  ): Promise<ReferralPaymentRequestDto> {
    const existing = await this.findAuthorized(tenantId, id, { producerProfileId });
    if (existing.status !== 'REQUESTED') {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PAYMENT_INVALID_STATUS_TRANSITION,
        message: 'Solo podés marcar en revisión solicitudes recién enviadas',
      });
    }

    const updated = await this.prisma.referralPaymentRequest.update({
      where: { id },
      data: { status: 'IN_REVIEW', inReviewAt: new Date() },
      include: paymentRequestInclude,
    });

    await this.auditStatusChange(tenantId, actorId, actorRole, existing, updated);
    return this.toDto(updated);
  }

  async markPaidForProducer(
    tenantId: string,
    producerProfileId: string,
    id: string,
    actorId: string,
    actorRole: string,
  ): Promise<ReferralPaymentRequestDto> {
    const existing = await this.findAuthorized(tenantId, id, { producerProfileId });
    if (existing.status !== 'REQUESTED' && existing.status !== 'IN_REVIEW') {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PAYMENT_INVALID_STATUS_TRANSITION,
        message: 'No se puede marcar como pagada esta solicitud',
      });
    }

    const commissionIds = existing.items.map((i) => i.commissionId);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.referralCommission.updateMany({
        where: { id: { in: commissionIds } },
        data: { status: 'MARKED_AS_PAID', paidAt: now },
      });
      return tx.referralPaymentRequest.update({
        where: { id },
        data: { status: 'PAID', paidAt: now },
        include: paymentRequestInclude,
      });
    });

    await this.auditStatusChange(tenantId, actorId, actorRole, existing, updated, {
      commissionsMarkedPaid: commissionIds.length,
    });
    return this.toDto(updated);
  }

  async rejectForProducer(
    tenantId: string,
    producerProfileId: string,
    id: string,
    actorId: string,
    actorRole: string,
    body: RejectReferralPaymentRequestInput,
  ): Promise<ReferralPaymentRequestDto> {
    const existing = await this.findAuthorized(tenantId, id, { producerProfileId });
    if (existing.status !== 'REQUESTED' && existing.status !== 'IN_REVIEW') {
      throw new ConflictException({
        code: ErrorCode.REFERRAL_PAYMENT_INVALID_STATUS_TRANSITION,
        message: 'No se puede rechazar esta solicitud',
      });
    }

    const updated = await this.prisma.referralPaymentRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectReason: body.reason.trim(),
        rejectedAt: new Date(),
      },
      include: paymentRequestInclude,
    });

    await this.auditStatusChange(tenantId, actorId, actorRole, existing, updated, {
      rejectReason: body.reason.trim(),
    });
    return this.toDto(updated);
  }

  private async commissionIdsInOpenRequests(
    tenantId: string,
    referrerProfileId: string,
  ): Promise<string[]> {
    const items = await this.prisma.referralPaymentRequestItem.findMany({
      where: {
        paymentRequest: {
          tenantId,
          referrerProfileId,
          status: { in: OPEN_REQUEST_STATUSES },
        },
      },
      select: { commissionId: true },
    });
    return items.map((i) => i.commissionId);
  }

  private assertCommissionsEligible(
    commissions: Array<{
      status: string;
      referralAttributionId: string | null;
      producerProfileId: string | null;
    }>,
  ): void {
    const reason = validateCommissionPaymentEligibility(commissions);
    if (!reason) return;
    const messages: Record<string, string> = {
      not_confirmed: 'Solo podés incluir comisiones generadas confirmadas',
      no_attribution: 'Comisión no válida para solicitud V2',
      no_producer: 'Comisión sin productora asociada',
    };
    throw new BadRequestException({
      code: ErrorCode.REFERRAL_PAYMENT_COMMISSION_NOT_ELIGIBLE,
      message: messages[reason] ?? 'Comisión no elegible',
    });
  }

  private async findAuthorized(
    tenantId: string,
    id: string,
    scope: { referrerProfileId?: string; producerProfileId?: string },
  ): Promise<PaymentRequestRow> {
    const row = await this.prisma.referralPaymentRequest.findFirst({
      where: {
        id,
        tenantId,
        ...scope,
      },
      include: paymentRequestInclude,
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Solicitud de pago no encontrada',
      });
    }
    return row;
  }

  private async auditStatusChange(
    tenantId: string,
    actorId: string,
    actorRole: string,
    before: PaymentRequestRow,
    after: PaymentRequestRow,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.logAction({
      tenantId,
      actorId,
      actorRole,
      action: AuditAction.REFERRAL_PAYMENT_REQUEST_STATUS_CHANGED,
      entityType: 'ReferralPaymentRequest',
      entityId: after.id,
      before: { status: before.status },
      after: { status: after.status },
      metadata,
    });
  }

  private mapEligibleCommission(
    c: Prisma.ReferralCommissionGetPayload<{
      include: { event: { select: { title: true } }; referralLink: { select: { code: true } } };
    }>,
    producerNameById: Map<string, string>,
  ) {
    return {
      id: c.id,
      referrerId: c.referrerId,
      referralLinkId: c.referralLinkId,
      eventId: c.eventId,
      amountCents: c.amountCents,
      status: c.status,
      requestedAt: c.requestedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
      confirmedByUserId: c.confirmedByUserId,
      referralAttributionId: c.referralAttributionId,
      agreementId: c.agreementId,
      producerProfileId: c.producerProfileId,
      referrerProfileId: c.referrerProfileId,
      orderId: c.orderId,
      commissionType: c.commissionType,
      commissionValue: c.commissionValue != null ? Number(c.commissionValue) : null,
      attributedSubtotalCents: c.attributedSubtotalCents,
      ticketQuantity: c.ticketQuantity,
      eventTitle: c.event.title,
      referralCode: c.referralLink.code,
      producerDisplayName: c.producerProfileId
        ? producerNameById.get(c.producerProfileId)
        : undefined,
    };
  }

  private toDto(row: PaymentRequestRow): ReferralPaymentRequestDto {
    return {
      id: row.id,
      tenantId: row.tenantId,
      referrerProfileId: row.referrerProfileId,
      producerProfileId: row.producerProfileId,
      amountRequestedCents: row.amountRequestedCents,
      message: row.message,
      status: row.status,
      rejectReason: row.rejectReason,
      requestedAt: row.requestedAt.toISOString(),
      inReviewAt: row.inReviewAt?.toISOString() ?? null,
      paidAt: row.paidAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      referrerProfile: row.referrerProfile,
      producerProfile: row.producerProfile,
      commissions: row.items.map((item) => ({
        id: item.commission.id,
        referrerId: item.commission.referrerId,
        referralLinkId: item.commission.referralLinkId,
        eventId: item.commission.eventId,
        amountCents: item.commission.amountCents,
        status: item.commission.status,
        requestedAt: item.commission.requestedAt?.toISOString() ?? null,
        paidAt: item.commission.paidAt?.toISOString() ?? null,
        confirmedByUserId: item.commission.confirmedByUserId,
        referralAttributionId: item.commission.referralAttributionId,
        agreementId: item.commission.agreementId,
        producerProfileId: item.commission.producerProfileId,
        referrerProfileId: item.commission.referrerProfileId,
        orderId: item.commission.orderId,
        commissionType: item.commission.commissionType,
        commissionValue:
          item.commission.commissionValue != null
            ? Number(item.commission.commissionValue)
            : null,
        attributedSubtotalCents: item.commission.attributedSubtotalCents,
        ticketQuantity: item.commission.ticketQuantity,
        eventTitle: item.commission.event.title,
        referralCode: item.commission.referralLink.code,
      })),
    };
  }
}
