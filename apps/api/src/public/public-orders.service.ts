import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventCapacityGuardService } from '../common/event-capacity-guard.service';
import type { CreateOrderDto, OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

const ORDER_EXPIRY_MINUTES = 15;

function getExpiresAt(): Date {
  const d = new Date();
  d.setMinutes(d.getMinutes() + ORDER_EXPIRY_MINUTES);
  return d;
}

@Injectable()
export class PublicOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacityGuard: EventCapacityGuardService,
  ) {}

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

      const totalSeats = orderItemsData.reduce((s, i) => s + i.quantity, 0);
      await this.capacityGuard.assertEventCapacityAvailable(
        tx,
        tenantId,
        dto.eventId,
        totalSeats,
      );

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

      let referralLinkId: string | null = null;
      if (dto.referralCode?.trim()) {
        const link = await tx.referralLink.findUnique({
          where: { code: dto.referralCode.trim() },
        });
        if (link && link.eventId === dto.eventId && link.tenantId === tenantId) {
          referralLinkId = link.id;
        }
      }

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          eventId: dto.eventId,
          status: 'PENDING_PAYMENT',
          buyerEmail: dto.buyer.email,
          buyerFirstName: dto.buyer.firstName,
          buyerLastName: dto.buyer.lastName,
          buyerDocument: dto.buyer.document ?? null,
          totalAmount,
          currency: 'ARS',
          expiresAt: getExpiresAt(),
          referralLinkId,
        },
      });

      if (referralLinkId) {
        await tx.referralAttribution.create({
          data: {
            tenantId,
            eventId: dto.eventId,
            referralLinkId,
            orderId: createdOrder.id,
          },
        });
      }

      for (const item of orderItemsData) {
        await tx.orderItem.create({
          data: {
            orderId: createdOrder.id,
            ticketTypeId: item.ticketTypeId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
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

      return this.mapOrderToResponse(order);
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

    return this.mapOrderToResponse(order);
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
