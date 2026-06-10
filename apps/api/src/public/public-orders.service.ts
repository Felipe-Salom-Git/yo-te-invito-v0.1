import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../prisma/prisma.service';
import { EventCapacityGuardService } from '../common/event-capacity-guard.service';
import { TicketBatchService } from '../ticketing/ticket-batch.service';
import type { CreateOrderDto, OrderResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../common/utils/event-public-visibility.util';
import { assertOrderOccurrenceValid } from '../common/utils/event-occurrence-order.util';

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
    private readonly ticketBatches: TicketBatchService,
  ) {}

  async create(tenantId: string, dto: CreateOrderDto): Promise<OrderResponse> {
    return this.prisma.$transaction(async (tx) => {
      const event = await tx.event.findFirst({
        where: mergePublicEventVisibility({
          id: dto.eventId,
          tenantId,
          status: 'APPROVED',
          deletedAt: null,
        }),
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
      const resolvedOccurrenceId = await assertOrderOccurrenceValid(
        tx,
        tenantId,
        dto.eventId,
        dto.occurrenceId,
        ticketTypes,
      );
      const now = new Date();
      let totalAmount = 0;
      const orderItemsData: Array<{
        ticketTypeId: string;
        ticketBatchId: string;
        occurrenceId: string | null;
        quantity: number;
        unitPrice: Decimal;
        subtotal: Decimal;
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
        let batchReserve: { batchId: string; unitPrice: Decimal; currency: string };
        try {
          batchReserve = await this.ticketBatches.reserveForPurchase(
            tx,
            { ticketTypeId: tt.id, quantity: item.quantity },
            now,
          );
        } catch (e: unknown) {
          const code = e && typeof e === 'object' && 'code' in e ? (e as { code?: string }).code : '';
          if (code === 'NO_ACTIVE_BATCH' || code === 'INSUFFICIENT_BATCH_STOCK') {
            throw new ConflictException({
              code: ErrorCode.CONFLICT,
              message: 'Insufficient availability',
            });
          }
          throw e;
        }
        const unitPrice = batchReserve.unitPrice;
        const subtotal = unitPrice.mul(item.quantity);
        totalAmount += Number(subtotal);
        orderItemsData.push({
          ticketTypeId: tt.id,
          ticketBatchId: batchReserve.batchId,
          occurrenceId: resolvedOccurrenceId,
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

      const buyerUserId = await this.resolveOrderBuyerUserId(tx, tenantId, dto);

      const createdOrder = await tx.order.create({
        data: {
          tenantId,
          eventId: dto.eventId,
          occurrenceId: resolvedOccurrenceId,
          status: 'PENDING_PAYMENT',
          buyerEmail: dto.buyer.email,
          buyerFirstName: dto.buyer.firstName,
          buyerLastName: dto.buyer.lastName,
          buyerDocument: dto.buyer.document ?? null,
          buyerUserId,
          totalAmount: new Decimal(totalAmount.toFixed(2)),
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
            ticketBatchId: item.ticketBatchId,
            occurrenceId: item.occurrenceId,
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
              occurrence: true,
            },
          },
          tickets: true,
          occurrence: true,
        },
      });

      return this.mapOrderToResponse(order);
    });
  }

  async getById(orderId: string, tenantId: string): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, tenantId },
      include: {
        orderItems: { include: { ticketType: true, tickets: true, occurrence: true } },
        tickets: true,
        occurrence: true,
      },
    });

    if (!order) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Order not found',
      });
    }

    const ticketIds = order.tickets.map((t) => t.id);
    const appliedChanges =
      ticketIds.length > 0
        ? await this.prisma.ticketDateChangeRequest.findMany({
            where: { ticketId: { in: ticketIds }, status: 'APPLIED' },
            select: { ticketId: true },
          })
        : [];
    const dateChangedTicketIds = new Set(appliedChanges.map((r) => r.ticketId));

    return this.mapOrderToResponse(order, dateChangedTicketIds);
  }

  private mapOrderToResponse(
    order: {
    id: string;
    eventId: string;
    occurrenceId?: string | null;
    occurrence?: { startAt: Date } | null;
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
      ticketBatchId: string | null;
      occurrenceId?: string | null;
      occurrence?: { startAt: Date } | null;
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
  },
    dateChangedTicketIds: Set<string> = new Set(),
  ): OrderResponse {
    const orderItems = order.orderItems.map((oi) => ({
      id: oi.id,
      ticketTypeId: oi.ticketTypeId,
      ticketBatchId: oi.ticketBatchId ?? undefined,
      occurrenceId: oi.occurrenceId ?? undefined,
      occurrenceStartAt: oi.occurrence?.startAt.toISOString() ?? order.occurrence?.startAt.toISOString() ?? null,
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
        hasDateChangeApplied: dateChangedTicketIds.has(t.id),
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
          hasDateChangeApplied: dateChangedTicketIds.has(t.id),
        };
      });

    return {
      id: order.id,
      eventId: order.eventId,
      occurrenceId: order.occurrenceId ?? undefined,
      occurrenceStartAt: order.occurrence?.startAt.toISOString() ?? null,
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

  /**
   * Links order to a registered user when email matches.
   * Ignores stale/wrong buyerUserId from the client (e.g. NextAuth token.sub).
   */
  private async resolveOrderBuyerUserId(
    tx: Prisma.TransactionClient,
    tenantId: string,
    dto: CreateOrderDto,
  ): Promise<string | null> {
    const emailNorm = dto.buyer.email.trim().toLowerCase();

    if (dto.buyerUserId?.trim()) {
      const byId = await tx.user.findFirst({
        where: {
          id: dto.buyerUserId.trim(),
          tenantId,
          deletedAt: null,
          status: 'ACTIVE',
        },
        select: { id: true, email: true },
      });
      if (byId) {
        if (byId.email.trim().toLowerCase() !== emailNorm) {
          throw new BadRequestException({
            code: ErrorCode.VALIDATION_FAILED,
            message: 'buyer email must match the logged-in user',
          });
        }
        return byId.id;
      }
    }

    const byEmail = await tx.user.findFirst({
      where: {
        tenantId,
        deletedAt: null,
        status: 'ACTIVE',
        email: { equals: emailNorm, mode: 'insensitive' },
      },
      select: { id: true },
    });
    return byEmail?.id ?? null;
  }
}
