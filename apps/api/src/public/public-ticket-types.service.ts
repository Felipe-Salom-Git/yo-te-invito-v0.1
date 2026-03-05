import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { TicketTypeResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class PublicTicketTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(eventId: string, tenantId: string): Promise<TicketTypeResponse[]> {
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
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

    const types = await this.prisma.ticketType.findMany({
      where: { eventId, status: 'ACTIVE', deletedAt: null },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => ({
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
      status: t.status,
    }));
  }
}
