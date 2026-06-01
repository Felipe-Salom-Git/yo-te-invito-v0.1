import { Injectable, NotFoundException } from '@nestjs/common';
import type { CheckoutPaymentStatusResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicPaymentsService } from './public-payments.service';
import { buildCheckoutReturnUrl, buildEventCheckoutUrl } from './getnet-return-url.util';
import {
  computeCheckoutCapabilities,
  computeCheckoutDisplayPhase,
} from './checkout-payment-status.util';
import { readPaymentReconciliationMetadata } from './getnet-reconciliation.metadata.util';

@Injectable()
export class CheckoutPaymentStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PublicPaymentsService,
  ) {}

  /**
   * Read-only snapshot for buyer UI (no Getnet remote call).
   * Use POST /public/payments/:id/refresh-status to sync Getnet.
   */
  async getCheckoutStatus(
    orderId: string,
    tenantId: string,
    options?: { urlCancelledHint?: boolean; paymentId?: string },
  ): Promise<CheckoutPaymentStatusResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: { orderItems: true },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found',
      });
    }

    const payment = await this.prisma.payment.findFirst({
      where: {
        orderId: order.id,
        tenantId,
        ...(options?.paymentId ? { id: options.paymentId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    const ticketCount = await this.prisma.ticket.count({
      where: { orderId: order.id, source: 'ORDER' },
    });

    const meta = readPaymentReconciliationMetadata(payment?.metadata);
    const displayPhase = computeCheckoutDisplayPhase({
      order,
      payment,
      paymentMetadata: payment?.metadata,
      ticketCount,
      urlCancelledHint: options?.urlCancelledHint,
    });

    const caps = computeCheckoutCapabilities({
      displayPhase,
      orderStatus: order.status,
      paymentProvider: payment?.provider ?? null,
      ticketCount,
      eventId: order.eventId,
      tenantId,
      orderId: order.id,
    });

    const returnUrl =
      payment?.id != null
        ? buildCheckoutReturnUrl({
            orderId: order.id,
            paymentId: payment.id,
            tenantId,
          })
        : undefined;

    return {
      orderId: order.id,
      eventId: order.eventId,
      orderStatus: order.status,
      paymentId: payment?.id ?? null,
      paymentProvider: payment?.provider ?? null,
      paymentStatus: payment?.status ?? null,
      displayPhase,
      requiresManualReview:
        displayPhase === 'manual_review' ||
        meta.reconciliationStatus === 'REQUIRES_MANUAL_REVIEW',
      reconciliationReason: meta.reconciliationReason,
      ticketsIssued: ticketCount > 0,
      ticketCount,
      canViewTickets: caps.canViewTickets,
      canRetryPayment: caps.canRetryPayment,
      canContactSupport: caps.canContactSupport,
      checkoutUrl: buildEventCheckoutUrl({
        eventId: order.eventId,
        orderId: order.id,
        tenantId,
      }),
      returnUrl,
    };
  }

  /** Sync Getnet (if applicable) then return fresh checkout status. */
  async refreshAndGetCheckoutStatus(
    paymentId: string,
    tenantId: string,
  ): Promise<CheckoutPaymentStatusResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
    });
    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    if (payment.provider === 'GETNET' && payment.externalReference) {
      await this.payments.refreshPaymentStatus(paymentId, tenantId);
    }

    return this.getCheckoutStatus(payment.orderId, tenantId, {
      paymentId,
    });
  }
}
