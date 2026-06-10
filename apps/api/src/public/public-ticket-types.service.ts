import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TicketBatchService, pickActiveBatch } from '../ticketing/ticket-batch.service';
import type { TicketTypeResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { mergePublicEventVisibility } from '../common/utils/event-public-visibility.util';

@Injectable()
export class PublicTicketTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ticketBatches: TicketBatchService,
  ) {}

  async list(
    eventId: string,
    tenantId: string,
    occurrenceId?: string,
  ): Promise<TicketTypeResponse[]> {
    const event = await this.prisma.event.findFirst({
      where: mergePublicEventVisibility({
        id: eventId,
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

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const types = await tx.ticketType.findMany({
        where: { eventId, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      for (const t of types) {
        await this.ticketBatches.reconcileTicketType(tx, t.id, now);
      }
    });

    const types = await this.prisma.ticketType.findMany({
      where: {
        eventId,
        status: 'ACTIVE',
        deletedAt: null,
        ...(occurrenceId ? { occurrenceId } : {}),
      },
      include: { batches: { orderBy: { orderIndex: 'asc' } } },
      orderBy: { name: 'asc' },
    });

    return types.map((t) => {
      const active = pickActiveBatch(t.batches, now);
      const remaining = active
        ? active.effectiveQuantity - active.soldCount - active.reservedQuantity
        : 0;
      return {
        id: t.id,
        eventId: t.eventId,
        occurrenceId: t.occurrenceId,
        name: t.name,
        description: t.description,
        price: (active?.price ?? t.price).toString(),
        currency: active?.currency ?? t.currency,
        capacityTotal: t.capacityTotal,
        capacityAvailable: remaining,
        maxPerOrder: t.maxPerOrder,
        salesStartAt: (active?.startAt ?? t.salesStartAt)?.toISOString() ?? null,
        salesEndAt: (active?.endAt ?? t.salesEndAt)?.toISOString() ?? null,
        status: t.status,
        activeTicketBatchId: active?.id ?? null,
      };
    });
  }
}
