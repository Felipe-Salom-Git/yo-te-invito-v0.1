import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import type { CreateOrderDto, OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

function generateQrPayload(): string {
  return randomBytes(24).toString('hex');
}

@Injectable()
export class PublicOrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: {
          id: dto.eventId,
          tenantId,
          status: 'APPROVED',
          deletedAt: null,
        },
      });

      if (!event) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Event not found',
        });
      }

      const ticketTypeIds = [...new Set(dto.items.map((i) => i.ticketTypeId))];
      const ticketTypes = await tx.ticketType.findMany({
        where: {
          id: { in: ticketTypeIds },
          eventId: dto.eventId,
          status: 'ACTIVE',
          deletedAt: null,
        },
      });

      if (ticketTypes.length !== ticketTypeIds.length) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'One or more ticket types not found or inactive',
        });
      }

      const typeMap = new Map(ticketTypes.map((t) => [t.id, t]));
      let totalAmount = 0;
      const orderItemsData: Array<{
        ticketTypeId: string;
        quantity: number;
        unitPrice: number;
        subtotal: number;
      }> = [];

      for (const item of dto.items) {
        const tt = typeMap.get(item.ticketTypeId);
        if (!tt) continue;
        if (item.quantity > tt.maxPerOrder) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            message: `Quantity exceeds maxPerOrder (${tt.maxPerOrder}) for ${tt.name}`,
          });
        }
        const unitPrice = Number(tt.price);
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;
        orderItemsData.push({
          ticketTypeId: tt.id,
          quantity: item.quantity,
          unitPrice,
          subtotal,
        });
      }

      for (const item of orderItemsData) {
        const tt = typeMap.get(item.ticketTypeId)!;
        const result = await tx.ticketType.updateMany({
          where: {
            id: tt.id,
            capacityAvailable: { gte: item.quantity },
          },
          data: { capacityAvailable: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new ConflictException({
            code: ErrorCode.CONFLICT,
            message: 'Insufficient availability',
          });
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          status: 'PAID',
          buyerEmail: dto.buyer.email,
          buyerFirstName: dto.buyer.firstName,
          buyerLastName: dto.buyer.lastName,
          buyerDocument: dto.buyer.document ?? null,
          totalAmount,
          currency: 'ARS',
        },
      });

      for (const item of orderItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
            tickets: {
              create: Array.from({ length: item.quantity }, () => ({
                orderId: createdOrder.id,
                eventId: dto.eventId,
                ticketTypeId: item.ticketTypeId,
                qrPayload: generateQrPayload(),
                status: 'VALID' as const,
              })),
            },
          },
        });
      }

      const order = await tx.order.findUniqueOrThrow({
        where: { id: createdOrder.id },
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

      const orderItems = order.orderItems.map((oi) => ({
        id: oi.id,
        ticketTypeId: oi.ticketTypeId,
        ticketTypeName: oi.ticketType.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice.toString(),
        subtotal: oi.subtotal.toString(),
        tickets: oi.tickets.map((t) => ({
          id: t.id,
          ticketTypeId: t.ticketTypeId,
          ticketTypeName: oi.ticketType.name,
          qrPayload: t.qrPayload,
          status: t.status,
        })),
      }));

      return {
        id: order.id,
        tenantId: order.tenantId,
        status: order.status,
        buyerEmail: order.buyerEmail,
        buyerFirstName: order.buyerFirstName,
        buyerLastName: order.buyerLastName,
        buyerDocument: order.buyerDocument,
        totalAmount: order.totalAmount.toString(),
        currency: order.currency,
        orderItems,
        tickets: order.tickets.map((t) => {
          const oi = order.orderItems.find((o) => o.id === t.orderItemId);
          return {
            id: t.id,
            ticketTypeId: t.ticketTypeId,
            ticketTypeName: oi?.ticketType.name ?? '',
            qrPayload: t.qrPayload,
            status: t.status,
          };
        }),
        createdAt: order.createdAt.toISOString(),
      };
    });
  }

  async getById(orderId: string, tenantId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        orderItems: { include: { ticketType: true, tickets: true } },
        tickets: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found',
      });
    }

    return {
      id: order.id,
      tenantId: order.tenantId,
      status: order.status,
      buyerEmail: order.buyerEmail,
      buyerFirstName: order.buyerFirstName,
      buyerLastName: order.buyerLastName,
      buyerDocument: order.buyerDocument,
      totalAmount: order.totalAmount.toString(),
      currency: order.currency,
      orderItems: order.orderItems.map((oi) => ({
        id: oi.id,
        ticketTypeId: oi.ticketTypeId,
        ticketTypeName: oi.ticketType.name,
        quantity: oi.quantity,
        unitPrice: oi.unitPrice.toString(),
        subtotal: oi.subtotal.toString(),
        tickets: oi.tickets.map((t) => ({
          id: t.id,
          ticketTypeId: t.ticketTypeId,
          ticketTypeName: oi.ticketType.name,
          qrPayload: t.qrPayload,
          status: t.status,
        })),
      })),
      tickets: order.tickets.map((t) => {
        const oi = order.orderItems.find((o) => o.id === t.orderItemId);
        return {
          id: t.id,
          ticketTypeId: t.ticketTypeId,
          ticketTypeName: oi?.ticketType.name ?? '',
          qrPayload: t.qrPayload,
          status: t.status,
        };
      }),
      createdAt: order.createdAt.toISOString(),
    };
  }
}
