import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { randomBytes } from 'crypto';
import type { OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import type { PaymentProviderApi } from '@yo-te-invito/shared';

function generateQrPayload(): string {
  return 'yti:v1:' + randomBytes(24).toString('hex');
}

export interface CreatePaymentResult {
  paymentId: string;
  paymentUrl: string;
  status: string;
}

@Injectable()
export class PublicPaymentsService {
  constructor(private readonly prisma: PrismaService) {}

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
        const fullOrder = await tx.order.findUniqueOrThrow({
          where: { id: orderId },
          include: { orderItems: true },
        });
        await tx.order.update({
          where: { id: orderId },
          data: { status: 'EXPIRED' },
        });
        for (const oi of fullOrder.orderItems) {
          await tx.ticketType.updateMany({
            where: { id: oi.ticketTypeId },
            data: { capacityAvailable: { increment: oi.quantity } },
          });
        }
      });
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Order expired',
      });
    }

    const amountCents = Math.round(Number(order.totalAmount) * 100);
    const payment = await this.prisma.payment.create({
      data: {
        tenantId,
        orderId,
        provider: provider as 'DEMO' | 'MERCADOPAGO' | 'GETNET',
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
        code: ErrorCode.CONFLICT,
        message: `Order cannot be paid (status: ${payment.order.status})`,
      });
    }

    const now = new Date();
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'APPROVED' },
      });
      await tx.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID', paidAt: now },
      });

      const seenPayloads = new Set<string>();
      for (const oi of payment.order.orderItems) {
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
              eventId: payment.order.eventId,
              qrPayload,
              status: 'VALID',
            },
          });
        }
      }

      const updatedOrder = await tx.order.findUniqueOrThrow({
        where: { id: payment.orderId },
        include: {
          orderItems: {
            include: {
              ticketType: true,
              tickets: true,
            },
          },
          tickets: true,
        },
      });

      return this.mapOrderToResponse(updatedOrder);
    });
  }

  private mapOrderToResponse(order: {
    id: string;
    tenantId: string;
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
      ticketType: { name: string };
      quantity: number;
      unitPrice: { toString: () => string };
      subtotal: { toString: () => string };
      tickets: Array<{
        id: string;
        ticketTypeId: string | null;
        qrPayload: string;
        status: string;
      }>;
    }>;
    tickets: Array<{
      id: string;
      ticketTypeId: string | null;
      orderItemId: string | null;
      qrPayload: string;
      status: string;
    }>;
  }): OrderResponse {
    const orderItems = order.orderItems.map((oi) => ({
      id: oi.id,
      ticketTypeId: oi.ticketTypeId,
      ticketTypeName: oi.ticketType.name,
      quantity: oi.quantity,
      unitPrice: oi.unitPrice.toString(),
      subtotal: oi.subtotal.toString(),
      tickets: oi.tickets.map((t) => ({
        id: t.id,
        ticketTypeId: t.ticketTypeId ?? oi.ticketTypeId,
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
          ticketTypeName: oi?.ticketType.name ?? null,
          qrPayload: t.qrPayload,
          status: t.status as 'VALID' | 'USED' | 'REVOKED',
        };
      });

    return {
      id: order.id,
      tenantId: order.tenantId,
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
