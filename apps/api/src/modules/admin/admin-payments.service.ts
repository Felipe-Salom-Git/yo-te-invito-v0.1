import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AdminPaymentDetail,
  AdminPaymentListItem,
  AdminPaymentMarkReviewedInput,
  AdminPaymentMarkReviewedResponse,
  AdminPaymentReconcileResponse,
  AdminPaymentsListQuery,
  AdminPaymentsListResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { GetnetReconciliationService } from '../public-payments/getnet-reconciliation.service';
import {
  asMetadataJson,
  mergeReconciliationMetadata,
  readPaymentReconciliationMetadata,
} from '../public-payments/getnet-reconciliation.metadata.util';
import { buildAdminPaymentsWhere } from './admin-payments-list.util';
import {
  extractOperationalMetadata,
  extractWebhookEventsForAdmin,
  paymentCanMarkReviewed,
  paymentRequiresManualReview,
} from './admin-payments-metadata.util';

@Injectable()
export class AdminPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reconciliation: GetnetReconciliationService,
    private readonly audit: AuditService,
  ) {}

  async list(
    tenantId: string,
    query: AdminPaymentsListQuery,
  ): Promise<AdminPaymentsListResponse> {
    const page = query.page ?? 1;
    const limit = query.pageSize ?? query.limit ?? 20;
    const where = buildAdminPaymentsWhere(tenantId, query);
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              event: { select: { id: true, title: true } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const data: AdminPaymentListItem[] = rows.map((p) => {
      const meta = readPaymentReconciliationMetadata(p.metadata);
      return {
        id: p.id,
        provider: p.provider,
        status: p.status,
        amount: p.amount,
        currency: p.currency,
        orderId: p.orderId,
        orderStatus: p.order?.status ?? null,
        buyerEmail: p.order?.buyerEmail ?? null,
        eventId: p.order?.eventId ?? null,
        eventTitle: p.order?.event?.title ?? null,
        externalReference: p.externalReference,
        externalPaymentId: p.externalPaymentId,
        requiresManualReview: paymentRequiresManualReview(meta),
        reconciliationStatus: meta.reconciliationStatus ?? null,
        reconciliationReason: meta.reconciliationReason ?? null,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getDetail(tenantId: string, paymentId: string): Promise<AdminPaymentDetail> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        order: {
          include: {
            event: { select: { id: true, title: true } },
            orderItems: { include: { ticketType: { select: { name: true } } } },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    const ticketCount = payment.orderId
      ? await this.prisma.ticket.count({
          where: { orderId: payment.orderId, source: 'ORDER' },
        })
      : 0;

    const meta = readPaymentReconciliationMetadata(payment.metadata);

    return {
      id: payment.id,
      tenantId: payment.tenantId,
      provider: payment.provider,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      orderId: payment.orderId,
      orderStatus: payment.order?.status ?? null,
      orderExpiresAt: payment.order?.expiresAt?.toISOString() ?? null,
      buyerEmail: payment.order?.buyerEmail ?? null,
      buyerUserId: payment.order?.buyerUserId ?? null,
      eventId: payment.order?.eventId ?? null,
      eventTitle: payment.order?.event?.title ?? null,
      externalReference: payment.externalReference,
      externalPaymentId: payment.externalPaymentId,
      paymentUrl: payment.paymentUrl,
      requiresManualReview: paymentRequiresManualReview(meta),
      canMarkReviewed: paymentCanMarkReviewed(meta),
      canReconcile: payment.provider === 'GETNET',
      reconciliationStatus: meta.reconciliationStatus ?? null,
      reconciliationReason: meta.reconciliationReason ?? null,
      reconciliationSource: meta.reconciliationSource ?? null,
      reconciliationUpdatedAt: meta.reconciliationUpdatedAt ?? null,
      reconciliationReviewedAt: meta.reconciliationReviewedAt ?? null,
      reconciliationReviewedByUserId: meta.reconciliationReviewedByUserId ?? null,
      reconciliationReviewedNote: meta.reconciliationReviewedNote ?? null,
      lastReconciliationOutcome: meta.lastReconciliationOutcome ?? null,
      lastReconciliationAt: meta.lastReconciliationAt ?? null,
      ticketCount,
      ticketsIssued: ticketCount > 0,
      orderItems:
        payment.order?.orderItems.map((oi) => ({
          id: oi.id,
          ticketTypeName: oi.ticketType.name,
          quantity: oi.quantity,
          unitPrice: String(oi.unitPrice),
        })) ?? [],
      webhookEvents: extractWebhookEventsForAdmin(payment.metadata),
      operationalMetadata: extractOperationalMetadata(payment.metadata),
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
    };
  }

  async reconcile(
    tenantId: string,
    paymentId: string,
    actor: { id: string; role: string },
  ): Promise<AdminPaymentReconcileResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found',
      });
    }
    if (payment.provider !== 'GETNET') {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'Only Getnet payments can be reconciled remotely',
      });
    }

    const result = await this.reconciliation.reconcilePayment(paymentId, {
      source: 'ADMIN_MANUAL',
      tenantId,
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'PAYMENT_ADMIN_RECONCILED',
      entityType: 'Payment',
      entityId: paymentId,
      metadata: {
        outcome: result.outcome,
        orderId: result.orderId,
        reconciliationReason: result.reconciliationReason,
      },
    });

    return {
      paymentId: result.paymentId,
      orderId: result.orderId,
      outcome: result.outcome,
      remoteStatus: result.remoteStatus,
      localPaymentStatus: result.localPaymentStatus,
      orderStatus: result.orderStatus,
      fulfillOutcome: result.fulfillOutcome,
      reconciliationReason: result.reconciliationReason,
      message: result.message,
    };
  }

  async markReviewed(
    tenantId: string,
    paymentId: string,
    actor: { id: string; role: string },
    input: AdminPaymentMarkReviewedInput,
  ): Promise<AdminPaymentMarkReviewedResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    const meta = readPaymentReconciliationMetadata(payment.metadata);
    if (!paymentCanMarkReviewed(meta)) {
      throw new BadRequestException({
        code: ErrorCode.CONFLICT,
        message: 'Payment is not pending manual review',
      });
    }

    const reviewedAt = new Date().toISOString();
    const nextMeta = mergeReconciliationMetadata(payment.metadata, {
      reconciliationStatus: 'MANUAL_REVIEWED',
      reconciliationReviewedAt: reviewedAt,
      reconciliationReviewedByUserId: actor.id,
      reconciliationReviewedNote: input.note?.trim() || undefined,
      reconciliationUpdatedAt: reviewedAt,
    });

    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { metadata: asMetadataJson(nextMeta) },
    });

    await this.audit.logAction({
      tenantId,
      actorId: actor.id,
      actorRole: actor.role,
      action: 'PAYMENT_MANUAL_REVIEWED',
      entityType: 'Payment',
      entityId: paymentId,
      metadata: {
        note: input.note?.trim() || null,
        previousReason: meta.reconciliationReason ?? null,
      },
    });

    return {
      paymentId,
      reconciliationStatus: 'MANUAL_REVIEWED',
      reconciliationReviewedAt: reviewedAt,
      reconciliationReviewedByUserId: actor.id,
      reconciliationReviewedNote: input.note?.trim() || null,
    };
  }
}
