import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { renderOrderConfirmationEmail } from '../../email/email-templates';
import { EventCapacityGuardService } from '../../common/event-capacity-guard.service';
import { randomBytes } from 'crypto';
import type { OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import type { PaymentProviderApi } from '@yo-te-invito/shared';
import { GetnetCheckoutService } from './providers/getnet/getnet-checkout.service';
import { mapGetnetStatusToLocal } from './providers/getnet/getnet.mapper';
import { loadGetnetConfig } from './providers/getnet/getnet.config';
import { TicketBatchService } from '../../ticketing/ticket-batch.service';
import { ReferralCommissionService } from '../referrals/referral-commission.service';
import { ReferralEmailsService } from '../referrals/referral-emails.service';

function generateQrPayload(): string {
  return 'yti:v1:' + randomBytes(24).toString('hex');
}

export interface CreatePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
  /** For Getnet: external checkout URL to redirect user */
  checkoutUrl?: string;
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
    private readonly capacityGuard: EventCapacityGuardService,
    private readonly emailQueue: EmailQueueService,
    private readonly getnetCheckout: GetnetCheckoutService,
    private readonly ticketBatches: TicketBatchService,
    private readonly referralCommissions: ReferralCommissionService,
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
        metadata: getnetResult.raw ? (getnetResult.raw as object) : undefined,
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

    if (payment.status === 'APPROVED') {
      return this.mapOrderToResponse(payment.order);
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
    if (
      payment.order.expiresAt &&
      payment.order.expiresAt < now
    ) {
      throw new ConflictException({
        code: ErrorCode.ORDER_EXPIRED,
        message: 'Order expired',
      });
    }

    const totalTickets = payment.order.orderItems.reduce(
      (s, oi) => s + oi.quantity,
      0,
    );

    let newCommissionId: string | null = null;

    const orderResult = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: payment.orderId,
          status: 'PENDING_PAYMENT',
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
        data: { status: 'PAID', paidAt: now },
      });
      if (orderUpdate.count === 0) {
        throw new ConflictException({
          code: ErrorCode.ORDER_EXPIRED,
          message: 'Order expired',
        });
      }

      await this.capacityGuard.assertEventCapacityAvailable(
        tx,
        tenantId,
        payment.order.eventId,
        totalTickets,
      );

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      });

      // Assign tickets: prefer Order.buyerUserId (checkout logged-in), else match by buyer email
      const ownerUser = await tx.user.findFirst({
        where: {
          tenantId: payment.order.tenantId,
          email: { equals: payment.order.buyerEmail, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { id: true },
      });
      const ownerUserId = payment.order.buyerUserId ?? ownerUser?.id ?? null;

      const seenPayloads = new Set<string>();
      for (const oi of payment.order.orderItems) {
        await this.ticketBatches.confirmReservedAsSold(
          tx,
          oi.ticketBatchId ?? null,
          oi.quantity,
        );
        for (let i = 0; i < oi.quantity; i++) {
          let qrPayload = generateQrPayload();
          while (seenPayloads.has(qrPayload)) {
            qrPayload = generateQrPayload();
          }
          seenPayloads.add(qrPayload);

          await tx.ticket.create({
            data: {
              orderId: payment.orderId,
              orderItemId: oi.id,
              ticketTypeId: oi.ticketTypeId,
              ticketBatchId: oi.ticketBatchId ?? null,
              eventId: payment.order.eventId,
              qrPayload,
              status: 'VALID',
              ownerUserId,
            },
          });
        }
      }

      const commissionResult = await this.referralCommissions.processOrderPaidInTransaction(
        tx,
        payment.orderId,
        tenantId,
      );
      if (commissionResult.created && commissionResult.commissionId) {
        newCommissionId = commissionResult.commissionId;
      }

      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: {
          event: { select: { title: true } },
          orderItems: {
            include: {
              ticketType: true,
              tickets: true,
            },
          },
          tickets: true,
        },
      });

      const result = this.mapOrderToResponse(updatedOrder);
      const eventTitle = (updatedOrder as { event?: { title: string } }).event?.title ?? 'Evento';
      const { html, text } = renderOrderConfirmationEmail(
        updatedOrder.buyerFirstName,
        updatedOrder.id,
        eventTitle,
      );
      this.emailQueue.enqueue({
        to: updatedOrder.buyerEmail,
        subject: 'Tu compra fue confirmada',
        html,
        text,
      });

      return result;
    });

    if (newCommissionId) {
      this.referralEmails.notifyCommissionGenerated(tenantId, newCommissionId);
    }

    return orderResult;
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

    try {
      const remote = await this.getnetCheckout.getOrderStatus(
        payment.externalReference,
      );
      const localStatus = mapGetnetStatusToLocal(remote.status);

      if (localStatus !== payment.status) {
        await this.prisma.payment.update({
          where: { id: paymentId },
          data: { status: localStatus },
        });
      }

      if (localStatus === 'APPROVED' && payment.order.status === 'PENDING_PAYMENT') {
        await this.completeOrderFromGetnet(payment.orderId, tenantId, paymentId);
      }

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

  private async completeOrderFromGetnet(
    orderId: string,
    tenantId: string,
    paymentId: string,
  ): Promise<void> {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      include: {
        order: {
          include: {
            orderItems: { include: { ticketType: true } },
          },
        },
      },
    });

    if (!payment || payment.order.status !== 'PENDING_PAYMENT') {
      return;
    }

    const now = new Date();
    const totalTickets = payment.order.orderItems.reduce(
      (s, oi) => s + oi.quantity,
      0,
    );

    let newCommissionId: string | null = null;

    await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: orderId,
          status: 'PENDING_PAYMENT',
          tenantId,
          OR: [
            { expiresAt: null },
            { expiresAt: { gte: now } },
          ],
        },
        data: { status: 'PAID', paidAt: now },
      });

      if (orderUpdate.count === 0) return;

      await this.capacityGuard.assertEventCapacityAvailable(
        tx,
        tenantId,
        payment.order.eventId,
        totalTickets,
      );

      const ownerUser = await tx.user.findFirst({
        where: {
          tenantId: payment.order.tenantId,
          email: { equals: payment.order.buyerEmail, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { id: true },
      });
      const ownerUserId = payment.order.buyerUserId ?? ownerUser?.id ?? null;
      const seenPayloads = new Set<string>();

      for (const oi of payment.order.orderItems) {
        await this.ticketBatches.confirmReservedAsSold(
          tx,
          oi.ticketBatchId ?? null,
          oi.quantity,
        );
        for (let i = 0; i < oi.quantity; i++) {
          let qrPayload = generateQrPayload();
          while (seenPayloads.has(qrPayload)) {
            qrPayload = generateQrPayload();
          }
          seenPayloads.add(qrPayload);

          await tx.ticket.create({
            data: {
              orderId: payment.orderId,
              orderItemId: oi.id,
              ticketTypeId: oi.ticketTypeId,
              ticketBatchId: oi.ticketBatchId ?? null,
              eventId: payment.order.eventId,
              qrPayload,
              status: 'VALID',
              ownerUserId,
            },
          });
        }
      }

      const commissionResult = await this.referralCommissions.processOrderPaidInTransaction(
        tx,
        orderId,
        tenantId,
      );
      if (commissionResult.created && commissionResult.commissionId) {
        newCommissionId = commissionResult.commissionId;
      }

      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { event: { select: { title: true } } },
      });
      const eventTitle = (updatedOrder as { event?: { title: string } }).event?.title ?? 'Evento';
      const { html, text } = renderOrderConfirmationEmail(
        payment.order.buyerFirstName,
        orderId,
        eventTitle,
      );
      this.emailQueue.enqueue({
        to: payment.order.buyerEmail,
        subject: 'Tu compra fue confirmada',
        html,
        text,
      });
    });

    if (newCommissionId) {
      this.referralEmails.notifyCommissionGenerated(tenantId, newCommissionId);
    }
  }

  private mapOrderToResponse(order: {
    id: string;
    tenantId: string;
    eventId: string;
    status: string;
    buyerEmail: string;
    buyerFirstName: string;
    buyerLastName: string;
    buyerDocument: string | null;
    totalAmount: { toString: () => string };
    currency: string;
    createdAt: Date;
    orderItems: Array<{
      id: string;
      ticketTypeId: string;
      ticketBatchId: string | null;
      ticketType: { name: string };
      quantity: number;
      unitPrice: { toString: () => string };
      subtotal: { toString: () => string };
      tickets: Array<{
        id: string;
        ticketTypeId: string | null;
        ticketBatchId: string | null;
        qrPayload: string;
        status: string;
      }>;
    }>;
    tickets: Array<{
      id: string;
      ticketTypeId: string | null;
      ticketBatchId: string | null;
      orderItemId: string | null;
      qrPayload: string;
      status: string;
    }>;
  }): OrderResponse {
    const orderItems = order.orderItems.map((oi) => ({
      id: oi.id,
      ticketTypeId: oi.ticketTypeId,
      ticketBatchId: oi.ticketBatchId ?? undefined,
      ticketTypeName: oi.ticketType.name,
      quantity: oi.quantity,
      unitPrice: oi.unitPrice.toString(),
      subtotal: oi.subtotal.toString(),
      tickets: oi.tickets.map((t) => ({
        id: t.id,
        ticketTypeId: t.ticketTypeId ?? oi.ticketTypeId,
        ticketBatchId: t.ticketBatchId ?? oi.ticketBatchId ?? undefined,
        ticketTypeName: oi.ticketType.name,
        qrPayload: t.qrPayload,
        status: t.status as 'VALID' | 'USED' | 'REVOKED',
      })),
    }));

    const tickets = order.tickets
      .filter((t) => t.orderItemId)
      .map((t) => {
        const oi = order.orderItems.find((o) => o.id === t.orderItemId!);
        return {
          id: t.id,
          ticketTypeId: t.ticketTypeId ?? oi?.ticketTypeId ?? null,
          ticketBatchId: t.ticketBatchId ?? oi?.ticketBatchId ?? undefined,
          ticketTypeName: oi?.ticketType.name ?? null,
          qrPayload: t.qrPayload,
          status: t.status as 'VALID' | 'USED' | 'REVOKED',
        };
      });

    return {
      id: order.id,
      tenantId: order.tenantId,
      eventId: order.eventId,
      status: order.status as OrderResponse['status'],
      buyerEmail: order.buyerEmail,
      buyerFirstName: order.buyerFirstName,
      buyerLastName: order.buyerLastName,
      buyerDocument: order.buyerDocument,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      orderItems,
      tickets,
      createdAt: order.createdAt.toISOString(),
    };
  }
}
