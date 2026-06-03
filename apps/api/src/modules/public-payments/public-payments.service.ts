import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import type { PaymentProviderApi } from '@yo-te-invito/shared';
import { GetnetCheckoutService } from './providers/getnet/getnet-checkout.service';
import { loadGetnetConfig } from './providers/getnet/getnet.config';
import {
  loadGetnetWebCheckoutConfig,
  isWebCheckoutPaymentMetadata,
} from './providers/getnet/webcheckout/getnet-webcheckout.config';
import { GetnetWebCheckoutClientService } from './providers/getnet/webcheckout/getnet-webcheckout-client.service';
import { TicketBatchService } from '../../ticketing/ticket-batch.service';
import { OrderFulfillmentService } from './order-fulfillment.service';
import { GetnetReconciliationService } from './getnet-reconciliation.service';
import { ReferralEmailsService } from '../referrals/referral-emails.service';
import { mapOrderToResponse } from './order-response.mapper';
import { buildCheckoutReturnUrl } from './getnet-return-url.util';

export interface CreatePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
  /** For Getnet: external checkout URL to redirect user */
  checkoutUrl?: string;
  /** Web Checkout Redirect URL (same as checkoutUrl when using Web Checkout) */
  redirectUrl?: string;
  provider?: string;
}

export interface RefreshPaymentStatusResult {
  paymentId: string;
  orderId: string;
  status: string;
  orderStatus: string;
}

@Injectable()
export class PublicPaymentsService {
  private readonly logger = new Logger(PublicPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly getnetCheckout: GetnetCheckoutService,
    private readonly getnetWebCheckout: GetnetWebCheckoutClientService,
    private readonly ticketBatches: TicketBatchService,
    private readonly orderFulfillment: OrderFulfillmentService,
    private readonly getnetReconciliation: GetnetReconciliationService,
    private readonly referralEmails: ReferralEmailsService,
  ) {}

  async createPayment(
    orderId: string,
    tenantId: string,
    provider: PaymentProviderApi,
  ): Promise<CreatePaymentResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
        totalAmount: true,
        currency: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found',
      });
    }

    if (order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Order cannot create payment (status: ${order.status})`,
      });
    }

    const now = new Date();
    if (order.expiresAt && order.expiresAt < now) {
      await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const updateResult = await tx.order.updateMany({
          where: {
            id: orderId,
            status: 'PENDING_PAYMENT',
            expiresAt: { lt: now },
          },
          data: { status: 'EXPIRED', expiredAt: now },
        });
        if (updateResult.count > 0) {
          const fullOrder = await tx.order.findUniqueOrThrow({
            where: { id: orderId },
            include: { orderItems: true },
          });
          for (const oi of fullOrder.orderItems) {
            await this.ticketBatches.releaseReservation(
              tx,
              oi.ticketBatchId ?? null,
              oi.quantity,
            );
            await tx.ticketType.updateMany({
              where: { id: oi.ticketTypeId },
              data: { capacityAvailable: { increment: oi.quantity } },
            });
          }
        }
      });
      throw new ConflictException({
        code: ErrorCode.ORDER_EXPIRED,
        message: 'Order expired',
      });
    }

    const amountCents = Math.round(Number(order.totalAmount) * 100);
    const providerTyped = provider as 'DEMO' | 'MERCADOPAGO' | 'GETNET';

    if (providerTyped === 'GETNET') {
      return this.createGetnetPayment(orderId, tenantId, order, amountCents, providerTyped);
    }

    return this.createDemoPayment(orderId, tenantId, order, amountCents, providerTyped);
  }

  private async createDemoPayment(
    orderId: string,
    tenantId: string,
    order: { id: string; totalAmount: unknown; currency: string },
    amountCents: number,
    providerTyped: 'DEMO' | 'MERCADOPAGO',
  ): Promise<CreatePaymentResult> {
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId,
        provider: providerTyped,
        status: 'CREATED',
        amount: amountCents,
        currency: order.currency,
        paymentUrl: null,
      },
    });

    const paymentUrl = `/demo/payments/${payment.id}`;
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { paymentUrl },
    });

    return {
      paymentId: payment.id,
      paymentUrl,
      status: payment.status,
      provider: providerTyped,
    };
  }

  private async createGetnetPayment(
    orderId: string,
    tenantId: string,
    order: { id: string; totalAmount: unknown; currency: string },
    amountCents: number,
    providerTyped: 'GETNET',
  ): Promise<CreatePaymentResult> {
    const webCheckoutConfig = loadGetnetWebCheckoutConfig();
    if (webCheckoutConfig.enabled) {
      return this.createGetnetWebCheckoutPayment(
        orderId,
        tenantId,
        order,
        amountCents,
        providerTyped,
      );
    }

    const config = loadGetnetConfig();
    if (!config.enabled) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Getnet is not configured',
      });
    }

    const fullOrder = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: { include: { ticketType: true } } },
    });

    const items = fullOrder.orderItems.map((oi, idx) => ({
      id: idx + 1,
      name: oi.ticketType.name,
      unitPrice: {
        currency: 'ARS',
        amount: Math.round(Number(oi.unitPrice) * 100),
      },
      quantity: oi.quantity,
    }));

    let getnetResult;
    try {
      getnetResult = await this.getnetCheckout.createOrder({
        currency: order.currency,
        items,
        reference: orderId,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Getnet order creation failed: ${msg}`);
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Payment provider error: ${msg}`,
      });
    }

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId,
        provider: providerTyped,
        status: 'PENDING',
        amount: amountCents,
        currency: order.currency,
        externalReference: getnetResult.uuid,
        paymentUrl: getnetResult.checkoutUrl,
        metadata: {
          ...(getnetResult.raw && typeof getnetResult.raw === 'object'
            ? (getnetResult.raw as object)
            : {}),
        },
      },
    });

    const returnUrl = buildCheckoutReturnUrl({
      orderId,
      paymentId: payment.id,
      tenantId,
    });
    const cancelUrl = buildCheckoutReturnUrl({
      orderId,
      paymentId: payment.id,
      tenantId,
      cancelled: true,
    });
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...(getnetResult.raw && typeof getnetResult.raw === 'object'
            ? (getnetResult.raw as object)
            : {}),
          returnUrl,
          cancelUrl,
          getnetReturnConfiguredAt: new Date().toISOString(),
        },
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: getnetResult.checkoutUrl,
      status: payment.status,
      checkoutUrl: getnetResult.checkoutUrl,
      provider: providerTyped,
    };
  }

  private async createGetnetWebCheckoutPayment(
    orderId: string,
    tenantId: string,
    order: { id: string; totalAmount: unknown; currency: string },
    amountCents: number,
    providerTyped: 'GETNET',
  ): Promise<CreatePaymentResult> {
    const config = loadGetnetWebCheckoutConfig();
    if (!config.enabled) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Getnet Web Checkout is not configured',
      });
    }

    const fullOrder = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { orderItems: { include: { ticketType: true } } },
    });

    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId,
        provider: providerTyped,
        status: 'PENDING',
        amount: amountCents,
        currency: order.currency,
      },
    });

    const returnUrl = buildCheckoutReturnUrl({
      orderId,
      paymentId: payment.id,
      tenantId,
    });
    const errorUrl = buildCheckoutReturnUrl({
      orderId,
      paymentId: payment.id,
      tenantId,
      cancelled: true,
    });

    const products = fullOrder.orderItems.map((oi) => ({
      productType: 'service',
      title: oi.ticketType.name,
      description: 'Entrada Yo Te Invito',
      valueMinor: Math.round(Number(oi.unitPrice) * 100),
      quantity: oi.quantity,
    }));

    let intentResult;
    try {
      intentResult = await this.getnetWebCheckout.createPaymentIntent({
        orderId,
        currency: order.currency,
        amountMinor: amountCents,
        successUrl: returnUrl,
        errorUrl,
        products,
        expiresAt: '15m',
      });
    } catch (e) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REJECTED' },
      });
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`Getnet Web Checkout payment-intent failed: ${msg}`);
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: `Payment provider error: ${msg}`,
      });
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        externalReference: intentResult.paymentIntentId,
        paymentUrl: intentResult.redirectUrl,
        metadata: {
          getnetIntegration: 'webcheckout',
          webCheckoutEnv: config.env,
          paymentIntentId: intentResult.paymentIntentId,
          redirectUrl: intentResult.redirectUrl,
          getnetOrderId: orderId,
          returnUrl,
          errorUrl,
          webCheckoutResponse: intentResult.raw,
          getnetReturnConfiguredAt: new Date().toISOString(),
        } as Prisma.InputJsonValue,
      },
    });

    return {
      paymentId: payment.id,
      paymentUrl: intentResult.redirectUrl,
      status: 'PENDING',
      checkoutUrl: intentResult.redirectUrl,
      redirectUrl: intentResult.redirectUrl,
      provider: providerTyped,
    };
  }

  async confirmDemoPayment(
    paymentId: string,
    tenantId: string,
  ): Promise<OrderResponse> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        order: {
          include: {
            orderItems: { include: { ticketType: true, tickets: true } },
            tickets: true,
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

    if (payment.provider !== 'DEMO' && payment.provider !== 'MERCADOPAGO') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Payment is not a demo payment',
      });
    }

    if (payment.status === 'APPROVED') {
      const fulfillResult = await this.orderFulfillment.fulfillPaidOrder({
        tenantId,
        orderId: payment.orderId,
        paymentId,
        source: 'DEMO_CONFIRM',
      });
      return fulfillResult.order ?? mapOrderToResponse(payment.order);
    }

    if (payment.order.status !== 'PENDING_PAYMENT') {
      throw new ConflictException({
        code:
          payment.order.status === 'EXPIRED'
            ? ErrorCode.ORDER_EXPIRED
            : ErrorCode.CONFLICT,
        message:
          payment.order.status === 'EXPIRED'
            ? 'Order expired'
            : `Order cannot be paid (status: ${payment.order.status})`,
      });
    }

    const now = new Date();
    if (payment.order.expiresAt && payment.order.expiresAt < now) {
      throw new ConflictException({
        code: ErrorCode.ORDER_EXPIRED,
        message: 'Order expired',
      });
    }

    const fulfillResult = await this.orderFulfillment.fulfillPaidOrder({
      tenantId,
      orderId: payment.orderId,
      paymentId,
      source: 'DEMO_CONFIRM',
      rejectIfExpired: true,
    });

    if (fulfillResult.outcome === 'skipped') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Order cannot be fulfilled',
      });
    }

    if (fulfillResult.newCommissionId) {
      this.referralEmails.notifyCommissionGenerated(
        tenantId,
        fulfillResult.newCommissionId,
      );
    }

    if (!fulfillResult.order) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Order fulfillment did not return order',
      });
    }

    return fulfillResult.order;
  }

  async getOrderPaymentStatus(
    orderId: string,
    tenantId: string,
  ): Promise<RefreshPaymentStatusResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { orderId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found for order',
      });
    }
    return this.refreshPaymentStatus(payment.id, tenantId);
  }

  async refreshPaymentStatus(
    paymentId: string,
    tenantId: string,
  ): Promise<RefreshPaymentStatusResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        order: {
          include: {
            orderItems: { include: { ticketType: true, tickets: true } },
            tickets: true,
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

    if (payment.provider !== 'GETNET' || !payment.externalReference) {
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        orderStatus: payment.order.status,
      };
    }

    if (isWebCheckoutPaymentMetadata(payment.metadata)) {
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        orderStatus: payment.order.status,
      };
    }

    try {
      const remote = await this.getnetCheckout.getOrderStatus(
        payment.externalReference,
      );

      await this.getnetReconciliation.reconcilePayment(paymentId, {
        source: 'GETNET_POLL',
        tenantId,
        remoteStatusOverride: remote.status,
      });

      const updated = await this.prisma.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { order: true },
      });

      return {
        paymentId: updated.id,
        orderId: updated.orderId,
        status: updated.status,
        orderStatus: updated.order.status,
      };
    } catch (e) {
      this.logger.warn(
        `Getnet status sync failed for payment ${paymentId}: ${e instanceof Error ? e.message : String(e)}`,
      );
      return {
        paymentId: payment.id,
        orderId: payment.orderId,
        status: payment.status,
        orderStatus: payment.order.status,
      };
    }
  }
}
