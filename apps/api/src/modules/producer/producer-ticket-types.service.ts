import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { TicketBatchStatus, type TicketBatch } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketBatchService, pickActiveBatch } from '../../ticketing/ticket-batch.service';
import type {
  CreateTicketTypeDto,
  UpdateTicketTypeDto,
  TicketTypeResponse,
  TicketBatchResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { Decimal } from '@prisma/client/runtime/library';

function deriveBatchStatus(start: Date, end: Date, now: Date): TicketBatchStatus {
  if (now.getTime() < start.getTime()) return 'SCHEDULED';
  if (now.getTime() > end.getTime()) return 'CLOSED';
  return 'ACTIVE';
}

@Injectable()
export class ProducerTicketTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketBatches: TicketBatchService,
  ) {}

  private async assertEventOwnedByUser(
    eventId: string,
    tenantId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: {
        id: true,
        producerId: true,
        isTicketingEnabled: true,
        isGeneralPublication: true,
        tenantId: true,
      },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === 'ADMIN';
    const isOwner = event.producerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'Not allowed to modify this event',
      });
    }
    return event;
  }

  private batchToResponse(b: {
    id: string;
    ticketTypeId: string;
    orderIndex: number;
    name: string;
    startAt: Date;
    endAt: Date;
    baseQuantity: number;
    rolloverQuantity: number;
    effectiveQuantity: number;
    reservedQuantity: number;
    soldCount: number;
    price: Decimal;
    currency: string;
    status: TicketBatchStatus;
  }): TicketBatchResponse {
    return {
      id: b.id,
      ticketTypeId: b.ticketTypeId,
      orderIndex: b.orderIndex,
      name: b.name,
      startAt: b.startAt.toISOString(),
      endAt: b.endAt.toISOString(),
      baseQuantity: b.baseQuantity,
      rolloverQuantity: b.rolloverQuantity,
      effectiveQuantity: b.effectiveQuantity,
      reservedQuantity: b.reservedQuantity,
      soldCount: b.soldCount,
      price: b.price.toString(),
      currency: b.currency,
      status: b.status,
    };
  }

  private toResponse(
    t: {
      id: string;
      eventId: string;
      name: string;
      description: string | null;
      price: Decimal;
      currency: string;
      capacityTotal: number;
      capacityAvailable: number;
      maxPerOrder: number;
      salesStartAt: Date | null;
      salesEndAt: Date | null;
      status: string;
      ticketTemplateId?: string | null;
    },
    batches?: Array<Parameters<ProducerTicketTypesService['batchToResponse']>[0]>,
    now = new Date(),
  ): TicketTypeResponse {
    const base: TicketTypeResponse = {
      id: t.id,
      eventId: t.eventId,
      name: t.name,
      description: t.description,
      price: t.price.toString(),
      currency: t.currency,
      capacityTotal: t.capacityTotal,
      capacityAvailable: t.capacityAvailable,
      maxPerOrder: t.maxPerOrder,
      salesStartAt: t.salesStartAt?.toISOString() ?? null,
      salesEndAt: t.salesEndAt?.toISOString() ?? null,
      status: t.status as 'ACTIVE' | 'PAUSED',
      ticketTemplateId: t.ticketTemplateId ?? null,
    };
    if (!batches?.length) return base;
    const active = pickActiveBatch(batches as TicketBatch[], now);
    const batchViews = batches.map((b) => this.batchToResponse(b));
    return {
      ...base,
      batches: batchViews,
      activeTicketBatchId: active?.id ?? null,
    };
  }

  async listForProducer(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<TicketTypeResponse[]> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);
    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const types = await tx.ticketType.findMany({
        where: { eventId, deletedAt: null },
        select: { id: true },
      });
      for (const tt of types) {
        await this.ticketBatches.reconcileTicketType(tx, tt.id, now);
      }
    });
    const types = await this.prisma.ticketType.findMany({
      where: { eventId, deletedAt: null },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { name: 'asc' },
    });
    return types.map((row) => this.toResponse(row, row.batches, now));
  }

  private assertTicketedEvent(event: { isGeneralPublication: boolean }): void {
    if (event.isGeneralPublication) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message:
          'Este evento fue creado como Solo Publicidad y no permite cargar entradas.',
      });
    }
  }

  async create(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    body: CreateTicketTypeDto,
  ): Promise<TicketTypeResponse> {
    const event = await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);
    this.assertTicketedEvent(event);
    const now = new Date();

    if (body.batches?.length) {
      const sorted = [...body.batches].sort((a, b) => a.orderIndex - b.orderIndex);
      const firstPrice = sorted[0]!.price;
      const typePrice = body.price ?? firstPrice;
      const minStart = sorted.reduce(
        (m, b) => (new Date(b.startAt) < m ? new Date(b.startAt) : m),
        new Date(sorted[0]!.startAt),
      );
      const maxEnd = sorted.reduce(
        (m, b) => (new Date(b.endAt) > m ? new Date(b.endAt) : m),
        new Date(sorted[0]!.endAt),
      );

      const ticketType = await this.prisma.ticketType.create({
        data: {
          tenantId: event.tenantId,
          eventId,
          name: body.name,
          description: body.description ?? null,
          price: new Decimal(typePrice),
          currency: body.currency ?? 'ARS',
          capacityTotal: body.capacityTotal,
          capacityAvailable: body.capacityTotal,
          maxPerOrder: body.maxPerOrder ?? 10,
          salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : minStart,
          salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : maxEnd,
          status: 'ACTIVE',
          batches: {
            create: sorted.map((b) => ({
              tenantId: event.tenantId,
              eventId,
              orderIndex: b.orderIndex,
              name: b.name,
              startAt: new Date(b.startAt),
              endAt: new Date(b.endAt),
              baseQuantity: b.baseQuantity,
              rolloverQuantity: 0,
              effectiveQuantity: b.baseQuantity,
              reservedQuantity: 0,
              soldCount: 0,
              price: new Decimal(b.price),
              currency: body.currency ?? 'ARS',
              status: deriveBatchStatus(new Date(b.startAt), new Date(b.endAt), now),
            })),
          },
        },
        include: { batches: { orderBy: { orderIndex: 'asc' } } },
      });

      await this.prisma.event.update({
        where: { id: eventId },
        data: { isTicketingEnabled: true, isGeneralPublication: false },
      });

      return this.toResponse(ticketType, ticketType.batches, now);
    }

    const startAt = body.salesStartAt ? new Date(body.salesStartAt) : now;
    const endAt = body.salesEndAt
      ? new Date(body.salesEndAt)
      : new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    const ticketType = await this.prisma.ticketType.create({
      data: {
        tenantId: event.tenantId,
        eventId,
        name: body.name,
        description: body.description ?? null,
        price: new Decimal(body.price!),
        currency: body.currency ?? 'ARS',
        capacityTotal: body.capacityTotal,
        capacityAvailable: body.capacityTotal,
        maxPerOrder: body.maxPerOrder ?? 10,
        salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : null,
        salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        status: 'ACTIVE',
        batches: {
          create: {
            tenantId: event.tenantId,
            eventId,
            orderIndex: 0,
            name: body.name,
            startAt,
            endAt,
            baseQuantity: body.capacityTotal,
            rolloverQuantity: 0,
            effectiveQuantity: body.capacityTotal,
            reservedQuantity: 0,
            soldCount: 0,
            price: new Decimal(body.price!),
            currency: body.currency ?? 'ARS',
            status: deriveBatchStatus(startAt, endAt, now),
          },
        },
      },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { isTicketingEnabled: true, isGeneralPublication: false },
    });

    return this.toResponse(ticketType, ticketType.batches, now);
  }

  async getEventTicketsForProducer(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<{ tickets: Array<{ id: string; eventId: string; qrPayload: string; status: string; ownerUserId?: string | null; usedAt?: string | null }> }> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);

    const tickets = await this.prisma.ticket.findMany({
      where: { eventId },
      select: {
        id: true,
        eventId: true,
        qrPayload: true,
        status: true,
        ownerUserId: true,
        usedAt: true,
      },
    });

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        eventId: t.eventId,
        qrPayload: t.qrPayload,
        status: t.status,
        ownerUserId: t.ownerUserId ?? undefined,
        usedAt: t.usedAt?.toISOString() ?? undefined,
      })),
    };
  }

  async update(
    tenantId: string,
    eventId: string,
    ticketTypeId: string,
    userId: string,
    userRole: string,
    body: UpdateTicketTypeDto,
  ): Promise<TicketTypeResponse> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);

    const existing = await this.prisma.ticketType.findFirst({
      where: { id: ticketTypeId, eventId, deletedAt: null },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Ticket type not found',
      });
    }

    if (body.capacityTotal !== undefined && body.capacityTotal < existing.capacityTotal - existing.capacityAvailable) {
      throw new BadRequestException({
        code: 'BAD_REQUEST',
        message: 'capacityTotal cannot be less than already sold capacity',
      });
    }

    const now = new Date();

    if (body.batches?.length) {
      const orderItems = await this.prisma.orderItem.count({
        where: { ticketTypeId },
      });
      const prevSold = existing.capacityTotal - existing.capacityAvailable;
      if (orderItems > 0 || prevSold > 0) {
        throw new BadRequestException({
          code: 'BAD_REQUEST',
          message:
            'Cannot replace batches when orders exist or tickets have been sold for this type',
        });
      }
      const capacityTotal =
        body.capacityTotal ??
        body.batches.reduce((s, b) => s + b.baseQuantity, 0);
      const sorted = [...body.batches].sort((a, b) => a.orderIndex - b.orderIndex);
      const minStart = sorted.reduce(
        (m, b) => (new Date(b.startAt) < m ? new Date(b.startAt) : m),
        new Date(sorted[0]!.startAt),
      );
      const maxEnd = sorted.reduce(
        (m, b) => (new Date(b.endAt) > m ? new Date(b.endAt) : m),
        new Date(sorted[0]!.endAt),
      );
      const firstPrice = sorted[0]!.price;

      const ticketType = await this.prisma.$transaction(async (tx) => {
        await tx.ticketBatch.deleteMany({ where: { ticketTypeId } });
        return tx.ticketType.update({
          where: { id: ticketTypeId },
          data: {
            ...(body.name !== undefined && { name: body.name }),
            ...(body.description !== undefined && { description: body.description }),
            ...(body.price !== undefined && { price: new Decimal(body.price) }),
            ...(body.maxPerOrder !== undefined && { maxPerOrder: body.maxPerOrder }),
            ...(body.status !== undefined && { status: body.status }),
            capacityTotal,
            capacityAvailable: capacityTotal,
            price: new Decimal(body.price ?? firstPrice),
            salesStartAt: body.salesStartAt !== undefined
              ? body.salesStartAt
                ? new Date(body.salesStartAt)
                : null
              : minStart,
            salesEndAt: body.salesEndAt !== undefined
              ? body.salesEndAt
                ? new Date(body.salesEndAt)
                : null
              : maxEnd,
            batches: {
              create: sorted.map((b) => ({
                tenantId: existing.tenantId,
                eventId,
                orderIndex: b.orderIndex,
                name: b.name,
                startAt: new Date(b.startAt),
                endAt: new Date(b.endAt),
                baseQuantity: b.baseQuantity,
                rolloverQuantity: 0,
                effectiveQuantity: b.baseQuantity,
                reservedQuantity: 0,
                soldCount: 0,
                price: new Decimal(b.price),
                currency: existing.currency,
                status: deriveBatchStatus(new Date(b.startAt), new Date(b.endAt), now),
              })),
            },
          },
          include: { batches: { orderBy: { orderIndex: 'asc' } } },
        });
      });

      return this.toResponse(ticketType, ticketType.batches, now);
    }

    const ticketType = await this.prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.price !== undefined && { price: new Decimal(body.price) }),
        ...(body.maxPerOrder !== undefined && { maxPerOrder: body.maxPerOrder }),
        ...(body.salesStartAt !== undefined && {
          salesStartAt: body.salesStartAt ? new Date(body.salesStartAt) : null,
        }),
        ...(body.salesEndAt !== undefined && {
          salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.capacityTotal !== undefined && {
          capacityTotal: body.capacityTotal,
          capacityAvailable:
            existing.capacityAvailable + (body.capacityTotal - existing.capacityTotal),
        }),
      },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
    });

    await this.prisma.$transaction(async (tx) => {
      await this.ticketBatches.reconcileTicketType(tx, ticketTypeId, now);
    });

    const refreshed = await this.prisma.ticketType.findUniqueOrThrow({
      where: { id: ticketTypeId },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
    });

    return this.toResponse(refreshed, refreshed.batches, now);
  }
}
