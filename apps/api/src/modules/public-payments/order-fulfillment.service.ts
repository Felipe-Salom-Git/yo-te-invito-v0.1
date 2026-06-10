import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { renderOrderConfirmationEmail } from '../../email/email-templates';
import { EventCapacityGuardService } from '../../common/event-capacity-guard.service';
import { TicketBatchService } from '../../ticketing/ticket-batch.service';
import { ReferralCommissionService } from '../referrals/referral-commission.service';
import { ErrorCode } from '@yo-te-invito/shared';
import { mapOrderToResponse } from './order-response.mapper';
import type {
  FulfillPaidOrderInput,
  FulfillPaidOrderResult,
} from './order-fulfillment.types';
import {
  expectedTicketCountFromItems,
  isOrderTicketFulfillmentComplete,
  paymentMetadataHasConfirmationEmailSent,
} from './order-fulfillment.util';

function generateQrPayload(): string {
  return 'yti:v1:' + randomBytes(24).toString('hex');
}

const orderIncludeForResponse = {
  event: { select: { title: true } },
  orderItems: {
    include: {
      ticketType: true,
      tickets: true,
    },
  },
  tickets: true,
} as const;

@Injectable()
export class OrderFulfillmentService {
  private readonly logger = new Logger(OrderFulfillmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly capacityGuard: EventCapacityGuardService,
    private readonly emailQueue: EmailQueueService,
    private readonly ticketBatches: TicketBatchService,
    private readonly referralCommissions: ReferralCommissionService,
  ) {}

  /**
   * Single entry point: mark order paid, approve payment, emit tickets, email, referral commission.
   * Safe to call repeatedly (demo re-confirm, Getnet poll, future webhook).
   */
  async fulfillPaidOrder(input: FulfillPaidOrderInput): Promise<FulfillPaidOrderResult> {
    const { tenantId, orderId, paymentId, source } = input;
    const rejectIfExpired = input.rejectIfExpired ?? true;

    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, tenantId },
      select: {
        id: true,
        orderId: true,
        status: true,
        metadata: true,
      },
    });

    if (!payment || payment.orderId !== orderId) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Payment not found',
      });
    }

    let newCommissionId: string | null = null;

    const txResult = await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.$queryRaw`
        SELECT 1 FROM "Order" WHERE id = ${orderId} AND "tenantId" = ${tenantId} FOR UPDATE
      `;

      const order = await tx.order.findFirst({
        where: { id: orderId, tenantId },
        include: {
          orderItems: { include: { ticketType: true } },
        },
      });

      if (!order) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Order not found',
        });
      }

      const expectedCount = expectedTicketCountFromItems(order.orderItems);
      const existingCount = await tx.ticket.count({
        where: { orderId, source: 'ORDER' },
      });

      const loadMappedOrder = async () => {
        const full = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: orderIncludeForResponse,
        });
        return mapOrderToResponse(full);
      };

      if (isOrderTicketFulfillmentComplete(existingCount, expectedCount)) {
        await this.syncPaidOrderAndApprovedPayment(tx, orderId, paymentId, order.status);

        await this.enqueueOrderConfirmationEmailIfNeeded(
          tx,
          paymentId,
          payment.metadata,
          {
            buyerEmail: order.buyerEmail,
            buyerFirstName: order.buyerFirstName,
            orderId: order.id,
            eventTitle: await this.resolveEventTitle(tx, order.eventId),
          },
          false,
        );

        return {
          outcome: 'alreadyFulfilled' as const,
          order: await loadMappedOrder(),
          ticketsCreated: 0,
        };
      }

      const now = new Date();
      const isExpiredPending =
        order.status === 'EXPIRED' ||
        (order.status === 'PENDING_PAYMENT' &&
          order.expiresAt != null &&
          order.expiresAt < now);

      if (isExpiredPending) {
        if (rejectIfExpired) {
          throw new ConflictException({
            code: ErrorCode.ORDER_EXPIRED,
            message: 'Order expired',
          });
        }
        this.logger.warn(
          `fulfillPaidOrder skipped expired order ${orderId} (source=${source})`,
        );
        return { outcome: 'skipped' as const, ticketsCreated: 0 };
      }

      if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAID') {
        this.logger.warn(
          `fulfillPaidOrder skipped order ${orderId} status=${order.status} (source=${source})`,
        );
        return { outcome: 'skipped' as const, ticketsCreated: 0 };
      }

      let transitionedToPaid = false;
      if (order.status === 'PENDING_PAYMENT') {
        const orderUpdate = await tx.order.updateMany({
          where: {
            id: orderId,
            tenantId,
            status: 'PENDING_PAYMENT',
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
          },
          data: { status: 'PAID', paidAt: now },
        });
        if (orderUpdate.count === 0) {
          if (rejectIfExpired) {
            throw new ConflictException({
              code: ErrorCode.ORDER_EXPIRED,
              message: 'Order expired',
            });
          }
          return { outcome: 'skipped' as const, ticketsCreated: 0 };
        }
        transitionedToPaid = true;
      }

      const ticketsToCreate = expectedCount - existingCount;
      await this.capacityGuard.assertEventCapacityAvailable(
        tx,
        tenantId,
        order.eventId,
        ticketsToCreate,
      );

      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      });

      const ownerUser = await tx.user.findFirst({
        where: {
          tenantId: order.tenantId,
          email: { equals: order.buyerEmail, mode: 'insensitive' },
          deletedAt: null,
        },
        select: { id: true },
      });
      const ownerUserId = order.buyerUserId ?? ownerUser?.id ?? null;

      const seenPayloads = new Set(
        (
          await tx.ticket.findMany({
            where: { orderId },
            select: { qrPayload: true },
          })
        ).map((t) => t.qrPayload),
      );

      let ticketsCreated = 0;
      for (const oi of order.orderItems) {
        const itemExisting = await tx.ticket.count({
          where: { orderItemId: oi.id, source: 'ORDER' },
        });
        const toCreate = oi.quantity - itemExisting;
        if (toCreate <= 0) continue;

        await this.ticketBatches.confirmReservedAsSold(
          tx,
          oi.ticketBatchId ?? null,
          toCreate,
        );

        for (let i = 0; i < toCreate; i++) {
          let qrPayload = generateQrPayload();
          while (seenPayloads.has(qrPayload)) {
            qrPayload = generateQrPayload();
          }
          seenPayloads.add(qrPayload);

          await tx.ticket.create({
            data: {
              orderId,
              orderItemId: oi.id,
              ticketTypeId: oi.ticketTypeId,
              ticketBatchId: oi.ticketBatchId ?? null,
              occurrenceId: oi.occurrenceId ?? order.occurrenceId ?? null,
              eventId: order.eventId,
              qrPayload,
              status: 'VALID',
              ownerUserId,
              source: 'ORDER',
            },
          });
          ticketsCreated += 1;
        }
      }

      if (transitionedToPaid || ticketsCreated > 0) {
        const commissionResult =
          await this.referralCommissions.processOrderPaidInTransaction(
            tx,
            orderId,
            tenantId,
          );
        if (commissionResult.created && commissionResult.commissionId) {
          newCommissionId = commissionResult.commissionId;
        }
      }

      const eventTitle = await this.resolveEventTitle(tx, order.eventId);
      await this.enqueueOrderConfirmationEmailIfNeeded(
        tx,
        paymentId,
        payment.metadata,
        {
          buyerEmail: order.buyerEmail,
          buyerFirstName: order.buyerFirstName,
          orderId: order.id,
          eventTitle,
        },
        ticketsCreated > 0,
      );

      return {
        outcome: 'fulfilled' as const,
        order: await loadMappedOrder(),
        ticketsCreated,
      };
    });

    return {
      ...txResult,
      newCommissionId,
    };
  }

  private async syncPaidOrderAndApprovedPayment(
    tx: Prisma.TransactionClient,
    orderId: string,
    paymentId: string,
    currentStatus: string,
  ): Promise<void> {
    if (currentStatus !== 'PAID') {
      await tx.order.updateMany({
        where: { id: orderId, status: { not: 'PAID' } },
        data: { status: 'PAID', paidAt: new Date() },
      });
    }
    await tx.payment.updateMany({
      where: { id: paymentId, status: { not: 'APPROVED' } },
      data: { status: 'APPROVED' },
    });
  }

  private async resolveEventTitle(
    tx: Prisma.TransactionClient,
    eventId: string,
  ): Promise<string> {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { title: true },
    });
    return event?.title ?? 'Evento';
  }

  /**
   * Sends checkout confirmation email at most once per payment (`metadata.orderConfirmationEmailSent`).
   * @param forceWhenTicketsCreated — enqueue when this fulfill call created tickets (even if flag was set incorrectly).
   */
  private async enqueueOrderConfirmationEmailIfNeeded(
    tx: Prisma.TransactionClient,
    paymentId: string,
    metadata: unknown,
    buyer: {
      buyerEmail: string;
      buyerFirstName: string;
      orderId: string;
      eventTitle: string;
    },
    forceWhenTicketsCreated: boolean,
  ): Promise<void> {
    if (
      paymentMetadataHasConfirmationEmailSent(metadata) &&
      !forceWhenTicketsCreated
    ) {
      return;
    }

    const { html, text } = renderOrderConfirmationEmail(
      buyer.buyerFirstName,
      buyer.orderId,
      buyer.eventTitle,
    );
    this.emailQueue.enqueue({
      to: buyer.buyerEmail,
      subject: 'Tu compra fue confirmada',
      html,
      text,
    });

    const base =
      metadata && typeof metadata === 'object' && !Array.isArray(metadata)
        ? (metadata as Record<string, unknown>)
        : {};
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        metadata: {
          ...base,
          orderConfirmationEmailSent: true,
        } as Prisma.InputJsonValue,
      },
    });
  }
}
