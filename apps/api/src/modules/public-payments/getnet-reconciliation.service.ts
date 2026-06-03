import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { PaymentStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OperationalAlertsEmailService } from '../../email/operational-alerts-email.service';
import { GetnetCheckoutService } from './providers/getnet/getnet-checkout.service';
import { mapGetnetWebhookStatusToLocal } from './providers/getnet/getnet-webhook.util';
import { shouldApplyPaymentStatusUpdate } from './providers/getnet/getnet-webhook.util';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { ReferralEmailsService } from '../referrals/referral-emails.service';
import { expectedTicketCountFromItems } from './order-fulfillment.util';
import {
  asMetadataJson,
  mergeReconciliationMetadata,
  readPaymentReconciliationMetadata,
  shouldSendReconciliationAlert,
} from './getnet-reconciliation.metadata.util';
import {
  decideApprovedPaymentAction,
  isOrderExpiredForReconciliation,
  mapRemoteMappingToOutcome,
  outcomeFromApprovedDecision,
} from './getnet-reconciliation.policy.util';
import type {
  ReconcileBatchSummary,
  ReconcilePaymentOptions,
  ReconcilePaymentResult,
  ReconcilePendingPaymentsOptions,
} from './getnet-reconciliation.types';
import { toFulfillSource } from './getnet-reconciliation.types';
import { shouldSkipRemoteStatusFetch } from './getnet-reconciliation.remote.util';
import { isWebCheckoutPaymentMetadata } from './providers/getnet/webcheckout/getnet-webcheckout.config';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class GetnetReconciliationService {
  private readonly logger = new Logger(GetnetReconciliationService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(GetnetCheckoutService)
    private readonly getnetCheckout: GetnetCheckoutService,
    @Inject(OrderFulfillmentService)
    private readonly orderFulfillment: OrderFulfillmentService,
    @Inject(ReferralEmailsService)
    private readonly referralEmails: ReferralEmailsService,
    @Inject(OperationalAlertsEmailService)
    private readonly operationalAlerts: OperationalAlertsEmailService,
  ) {}

  /** Used by CLI scripts to fail fast when Nest DI did not wire Prisma. */
  assertDatabaseReady(): void {
    if (!this.prisma?.payment?.findMany) {
      throw new Error(
        'GetnetReconciliationService: PrismaService is not injected. ' +
          'Run payments:reconcile-getnet via Nest ApplicationContext (see scripts/payments-reconcile-getnet.ts).',
      );
    }
  }

  async reconcilePayment(
    paymentId: string,
    options: ReconcilePaymentOptions,
  ): Promise<ReconcilePaymentResult> {
    const dryRun = options.dryRun ?? false;

    const payment = await this.prisma.payment.findFirst({
      where: {
        id: paymentId,
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
      },
      include: {
        order: {
          include: { orderItems: true },
        },
      },
    });

    if (!payment || payment.provider !== 'GETNET') {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Getnet payment not found',
      });
    }

    const order = payment.order;
    if (!order) {
      return {
        paymentId,
        orderId: payment.orderId,
        outcome: 'PAYMENT_NOT_FOUND',
        message: 'Order missing',
        dryRun,
      };
    }

    let remoteStatus = options.remoteStatusOverride?.trim().toUpperCase() ?? '';
    if (!remoteStatus) {
      if (!payment.externalReference) {
        return {
          paymentId: payment.id,
          orderId: order.id,
          outcome: 'REMOTE_STATUS_UNAVAILABLE',
          orderStatus: order.status,
          localPaymentStatus: payment.status,
          dryRun,
          message: 'No externalReference',
        };
      }
      if (shouldSkipRemoteStatusFetch(options.remoteStatusOverride)) {
        return {
          paymentId: payment.id,
          orderId: order.id,
          outcome: 'REMOTE_STATUS_UNAVAILABLE',
          orderStatus: order.status,
          localPaymentStatus: payment.status,
          dryRun,
          message:
            'Getnet credentials not configured; remote status checks skipped',
        };
      }
      if (isWebCheckoutPaymentMetadata(payment.metadata)) {
        return {
          paymentId: payment.id,
          orderId: order.id,
          outcome: 'REMOTE_STATUS_UNAVAILABLE',
          orderStatus: order.status,
          localPaymentStatus: payment.status,
          dryRun,
          message:
            'Web Checkout remote poll not implemented; rely on webhook or manual reconcile with status override',
        };
      }
      try {
        const remote = await this.getnetCheckout.getOrderStatus(
          payment.externalReference,
        );
        remoteStatus = remote.status?.toUpperCase?.() ?? 'UNKNOWN';
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.warn(`Getnet status fetch failed for ${paymentId}: ${msg}`);
        this.maybeAlertFetchError(payment.id, order.id, msg, payment.metadata, dryRun);
        return {
          paymentId: payment.id,
          orderId: order.id,
          outcome: 'REMOTE_STATUS_UNAVAILABLE',
          orderStatus: order.status,
          localPaymentStatus: payment.status,
          dryRun,
          message: msg,
        };
      }
    }

    const statusMapping = mapGetnetWebhookStatusToLocal(remoteStatus);
    const expectedTickets = expectedTicketCountFromItems(order.orderItems);
    const existingTickets = await this.prisma.ticket.count({
      where: { orderId: order.id, source: 'ORDER' },
    });

    const otherApproved = await this.prisma.payment.findMany({
      where: {
        orderId: order.id,
        provider: 'GETNET',
        status: 'APPROVED',
        id: { not: payment.id },
      },
      select: { id: true },
    });

    let outcome = mapRemoteMappingToOutcome(statusMapping, remoteStatus);
    let reconciliationReason: ReconcilePaymentResult['reconciliationReason'];
    let fulfillOutcome: ReconcilePaymentResult['fulfillOutcome'];
    let message: string | undefined;

    if (statusMapping.kind === 'unknown') {
      reconciliationReason = 'REMOTE_UNKNOWN';
      outcome = 'UNKNOWN_REMOTE';
      if (!dryRun) {
        await this.persistReconciliation(payment.id, payment.metadata, {
          outcome,
          source: options.source,
          reconciliationReason,
          remoteStatus,
        });
        this.maybeAlert(
          payment.id,
          order.id,
          'REMOTE_UNKNOWN',
          `Estado Getnet desconocido: ${remoteStatus}`,
          payment.metadata,
        );
      }
      return this.result(payment, order.status, remoteStatus, outcome, {
        reconciliationReason,
        dryRun,
        message,
      });
    }

    if (statusMapping.kind === 'ignored') {
      outcome = 'IGNORED_REMOTE';
      reconciliationReason = 'REMOTE_REFUNDED';
      if (!dryRun) {
        await this.persistReconciliation(payment.id, payment.metadata, {
          outcome,
          source: options.source,
          reconciliationReason,
          remoteStatus,
          extra: { remoteRefundNote: statusMapping.reason },
        });
      }
      return this.result(payment, order.status, remoteStatus, outcome, {
        reconciliationReason,
        dryRun,
        message: statusMapping.reason,
      });
    }

    const localStatus = statusMapping.localStatus;

    if (!dryRun && shouldApplyPaymentStatusUpdate(payment.status, localStatus)) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: localStatus },
      });
      payment.status = localStatus;
    }

    if (localStatus === 'APPROVED') {
      const decision = decideApprovedPaymentAction({
        order: {
          id: order.id,
          status: order.status,
          expiresAt: order.expiresAt,
        },
        payment: { id: payment.id, status: payment.status, orderId: order.id },
        existingTicketCount: existingTickets,
        expectedTicketCount: expectedTickets,
        otherApprovedPaymentIds: otherApproved.map((p) => p.id),
      });

      outcome = outcomeFromApprovedDecision(decision);
      reconciliationReason =
        decision.kind === 'MANUAL_REVIEW' || decision.kind === 'SKIPPED'
          ? decision.reason
          : undefined;
      message = decision.kind;

      if (decision.kind === 'MANUAL_REVIEW') {
        if (!dryRun) {
          await this.prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'APPROVED' },
          });
          await this.persistReconciliation(payment.id, payment.metadata, {
            outcome,
            source: options.source,
            reconciliationReason: decision.reason,
            remoteStatus,
            reconciliationStatus: 'REQUIRES_MANUAL_REVIEW',
          });
          this.maybeAlertManualReview(
            payment.id,
            order.id,
            decision.reason,
            remoteStatus,
            payment.metadata,
          );
        }
        return this.result(payment, order.status, remoteStatus, outcome, {
          reconciliationReason: decision.reason,
          dryRun,
          message,
        });
      }

      if (decision.kind === 'ALREADY_FULFILLED') {
        if (!dryRun) {
          await this.persistReconciliation(payment.id, payment.metadata, {
            outcome,
            source: options.source,
            remoteStatus,
            reconciliationStatus: 'AUTO_OK',
          });
        }
        return this.result(payment, order.status, remoteStatus, outcome, {
          dryRun,
          fulfillOutcome: 'alreadyFulfilled',
        });
      }

      if (decision.kind === 'SKIPPED') {
        if (!dryRun) {
          await this.persistReconciliation(payment.id, payment.metadata, {
            outcome,
            source: options.source,
            reconciliationReason: decision.reason,
            remoteStatus,
          });
        }
        return this.result(payment, order.status, remoteStatus, outcome, {
          reconciliationReason: decision.reason,
          dryRun,
          fulfillOutcome: 'skipped',
          message,
        });
      }

      // FULFILL
      if (dryRun) {
        return this.result(payment, order.status, remoteStatus, 'FULFILLED', {
          dryRun: true,
          message: 'would_fulfill',
        });
      }

      const fulfillResult = await this.orderFulfillment.fulfillPaidOrder({
        tenantId: order.tenantId,
        orderId: order.id,
        paymentId: payment.id,
        source: toFulfillSource(options.source),
        rejectIfExpired: false,
      });

      fulfillOutcome =
        fulfillResult.outcome === 'fulfilled' ||
        fulfillResult.outcome === 'alreadyFulfilled' ||
        fulfillResult.outcome === 'skipped'
          ? fulfillResult.outcome
          : undefined;

      outcome =
        fulfillResult.outcome === 'fulfilled'
          ? 'FULFILLED'
          : fulfillResult.outcome === 'alreadyFulfilled'
            ? 'ALREADY_FULFILLED'
            : 'SKIPPED';

      if (fulfillResult.newCommissionId) {
        this.referralEmails.notifyCommissionGenerated(
          order.tenantId,
          fulfillResult.newCommissionId,
        );
      }

      const refreshedOrder = await this.prisma.order.findUnique({
        where: { id: order.id },
        select: { status: true },
      });

      await this.persistReconciliation(payment.id, payment.metadata, {
        outcome,
        source: options.source,
        remoteStatus,
        reconciliationStatus: 'AUTO_OK',
      });

      return this.result(
        payment,
        refreshedOrder?.status ?? order.status,
        remoteStatus,
        outcome,
        { fulfillOutcome, dryRun },
      );
    }

    // Non-approved terminal states
    if (!dryRun) {
      await this.persistReconciliation(payment.id, payment.metadata, {
        outcome,
        source: options.source,
        remoteStatus,
      });
    }

    return this.result(payment, order.status, remoteStatus, outcome, { dryRun });
  }

  async reconcilePendingPayments(
    options: ReconcilePendingPaymentsOptions = {},
  ): Promise<ReconcileBatchSummary> {
    this.assertDatabaseReady();

    const dryRun = options.dryRun ?? true;
    const limit = options.limit ?? 50;
    const olderThanMinutes = options.olderThanMinutes ?? 10;
    const source = options.source ?? 'GETNET_SCRIPT';
    const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: {
        provider: 'GETNET',
        status: { in: ['PENDING', 'CREATED'] },
        externalReference: { not: null },
        ...(options.tenantId ? { tenantId: options.tenantId } : {}),
        createdAt: { lt: cutoff },
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    const summary: ReconcileBatchSummary = {
      reviewed: 0,
      fulfilled: 0,
      alreadyFulfilled: 0,
      pending: 0,
      rejected: 0,
      requiresManualReview: 0,
      skipped: 0,
      errors: 0,
      dryRun,
      results: [],
    };

    for (const row of payments) {
      summary.reviewed += 1;
      try {
        const result = await this.reconcilePayment(row.id, {
          source,
          dryRun,
          tenantId: options.tenantId,
        });
        summary.results.push(result);
        this.accumulateSummary(summary, result);
      } catch (e) {
        summary.errors += 1;
        const msg = e instanceof Error ? e.message : String(e);
        summary.results.push({
          paymentId: row.id,
          orderId: '',
          outcome: 'SKIPPED',
          message: msg,
          dryRun,
        });
      }
    }

    return summary;
  }

  private accumulateSummary(
    summary: ReconcileBatchSummary,
    result: ReconcilePaymentResult,
  ): void {
    switch (result.outcome) {
      case 'FULFILLED':
        summary.fulfilled += 1;
        break;
      case 'ALREADY_FULFILLED':
        summary.alreadyFulfilled += 1;
        break;
      case 'PENDING_REMOTE':
        summary.pending += 1;
        break;
      case 'REJECTED_REMOTE':
      case 'EXPIRED_REMOTE':
      case 'CANCELLED_REMOTE':
        summary.rejected += 1;
        break;
      case 'REQUIRES_MANUAL_REVIEW':
        summary.requiresManualReview += 1;
        break;
      default:
        summary.skipped += 1;
    }
  }

  private async persistReconciliation(
    paymentId: string,
    existingMetadata: unknown,
    patch: {
      outcome: string;
      source: string;
      remoteStatus: string;
      reconciliationReason?: string;
      reconciliationStatus?: 'REQUIRES_MANUAL_REVIEW' | 'AUTO_OK' | 'RESOLVED';
      extra?: Record<string, unknown>;
    },
  ): Promise<void> {
    const now = new Date().toISOString();
    const meta = mergeReconciliationMetadata(existingMetadata, {
      lastReconciliationOutcome: patch.outcome,
      lastReconciliationAt: now,
      reconciliationUpdatedAt: now,
      reconciliationSource: patch.source,
      ...(patch.reconciliationReason
        ? {
            reconciliationReason: patch.reconciliationReason,
            reconciliationStatus:
              patch.reconciliationStatus ?? 'REQUIRES_MANUAL_REVIEW',
          }
        : {
            reconciliationStatus: patch.reconciliationStatus ?? 'AUTO_OK',
          }),
      ...patch.extra,
    });
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { metadata: asMetadataJson(meta) },
    });
  }

  private maybeAlertManualReview(
    paymentId: string,
    orderId: string,
    reason: string,
    remoteStatus: string,
    metadata: unknown,
  ): void {
    const meta = readPaymentReconciliationMetadata(metadata);
    if (!shouldSendReconciliationAlert(meta, reason)) return;

    const titles: Record<string, string> = {
      ORDER_EXPIRED_PAYMENT_APPROVED:
        'Getnet aprobado — orden expirada (revisión manual)',
      ORDER_ALREADY_PAID_BY_ANOTHER_PAYMENT:
        'Getnet aprobado — orden ya pagada por otro pago',
    };

    this.operationalAlerts.enqueueCriticalAlert({
      alertTitle: titles[reason] ?? 'Getnet requiere revisión manual',
      alertMessage: `Payment ${paymentId}, Order ${orderId}. Razón: ${reason}. Remoto: ${remoteStatus}.`,
      severity: 'critical',
      context: `getnet-reconciliation:${reason}`,
    });

    void this.markAlertSent(paymentId, metadata, reason);
  }

  private maybeAlert(
    paymentId: string,
    orderId: string,
    reason: string,
    message: string,
    metadata: unknown,
  ): void {
    const meta = readPaymentReconciliationMetadata(metadata);
    if (!shouldSendReconciliationAlert(meta, reason)) return;

    this.operationalAlerts.enqueueCriticalAlert({
      alertTitle: 'Getnet reconciliación',
      alertMessage: `${message} (payment ${paymentId}, order ${orderId})`,
      severity: 'high',
      context: reason,
    });
    void this.markAlertSent(paymentId, metadata, reason);
  }

  private maybeAlertFetchError(
    paymentId: string,
    orderId: string,
    msg: string,
    metadata: unknown,
    dryRun: boolean,
  ): void {
    if (dryRun) return;
    const reason = 'REMOTE_FETCH_ERROR';
    const meta = readPaymentReconciliationMetadata(metadata);
    if (!shouldSendReconciliationAlert(meta, reason)) return;
    this.operationalAlerts.enqueueOperationalError({
      errorTitle: 'Error consultando estado Getnet',
      errorMessage: msg,
      moduleName: 'GetnetReconciliationService',
      context: `paymentId=${paymentId} orderId=${orderId}`,
    });
    void this.markAlertSent(paymentId, metadata, reason);
  }

  private async markAlertSent(
    paymentId: string,
    metadata: unknown,
    reason: string,
  ): Promise<void> {
    const meta = mergeReconciliationMetadata(metadata, {
      reconciliationAlertSentAt: new Date().toISOString(),
      reconciliationAlertReason: reason,
    });
    await this.prisma.payment.update({
      where: { id: paymentId },
      data: { metadata: asMetadataJson(meta) },
    });
  }

  private result(
    payment: { id: string; orderId: string; status: PaymentStatus },
    orderStatus: string,
    remoteStatus: string,
    outcome: ReconcilePaymentResult['outcome'],
    extra: Partial<ReconcilePaymentResult> = {},
  ): ReconcilePaymentResult {
    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      outcome,
      remoteStatus,
      localPaymentStatus: payment.status,
      orderStatus,
      ...extra,
    };
  }
}
