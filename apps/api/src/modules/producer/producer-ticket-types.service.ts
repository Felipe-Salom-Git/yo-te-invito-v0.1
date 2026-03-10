import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateTicketTypeDto,
  UpdateTicketTypeDto,
  TicketTypeResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { Decimal } from '@prisma/client/runtime/library';

@Injectable()
export class ProducerTicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertEventOwnedByUser(
    eventId: string,
    tenantId: string,
    userId: string,
    userRole: string,
  ) {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, producerId: true, isTicketingEnabled: true },
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

  private toResponse(t: {
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
  }): TicketTypeResponse {
    return {
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
    };
  }

  async create(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    body: CreateTicketTypeDto,
  ): Promise<TicketTypeResponse> {
    await this.assertEventOwnedByUser(eventId, tenantId, userId, userRole);

    const ticketType = await this.prisma.ticketType.create({
      data: {
        eventId,
        name: body.name,
        description: body.description ?? null,
        price: new Decimal(body.price),
        currency: body.currency ?? 'ARS',
        capacityTotal: body.capacityTotal,
        capacityAvailable: body.capacityTotal,
        maxPerOrder: body.maxPerOrder ?? 10,
        salesStartAt: body.salesStartAt
          ? new Date(body.salesStartAt)
          : null,
        salesEndAt: body.salesEndAt ? new Date(body.salesEndAt) : null,
        status: 'ACTIVE',
      },
    });

    await this.prisma.event.update({
      where: { id: eventId },
      data: { isTicketingEnabled: true },
    });

    return this.toResponse(ticketType);
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
          capacityAvailable: existing.capacityAvailable + (body.capacityTotal - existing.capacityTotal),
        }),
      },
    });

    return this.toResponse(ticketType);
  }
}
