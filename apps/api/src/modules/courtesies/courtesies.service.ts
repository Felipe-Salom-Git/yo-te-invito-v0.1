import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventCapacityGuardService } from '../../common/event-capacity-guard.service';
import { randomBytes } from 'crypto';
import type {
  CreateCourtesyBody,
  CreateCourtesyResponse,
  CourtesyGrantSummary,
} from '@yo-te-invito/shared';
import type { TicketTypeResponse } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { TicketBatchService, pickActiveBatch } from '../../ticketing/ticket-batch.service';

function generateQrPayload(): string {
  return 'yti:v1:' + randomBytes(24).toString('hex');
}

@Injectable()
export class CourtesiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capacityGuard: EventCapacityGuardService,
    private readonly ticketBatches: TicketBatchService,
  ) {}

  async create(
    tenantId: string,
    createdById: string,
    eventId: string,
    body: CreateCourtesyBody,
  ): Promise<CreateCourtesyResponse> {
    const { mode, ticketTypeId, quantity, note } = body;

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      include: {
        ticketTypes: { where: { deletedAt: null, status: 'ACTIVE' } },
      },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    if (mode === 'CONSUMES_BATCH') {
      if (!ticketTypeId?.trim()) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'ticketTypeId is required for CONSUMES_BATCH',
        });
      }

      const tt = event.ticketTypes.find((t) => t.id === ticketTypeId);
      if (!tt) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Ticket type not found for this event',
        });
      }

      if (quantity > tt.capacityAvailable) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: `Quantity exceeds batch capacity (${tt.capacityAvailable} available)`,
        });
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await this.capacityGuard.assertEventCapacityAvailable(
        tx,
        tenantId,
        eventId,
        quantity,
      );
      const grant = await tx.courtesyGrant.create({
        data: {
          tenantId,
          eventId,
          ticketTypeId: mode === 'CONSUMES_BATCH' ? ticketTypeId : null,
          mode: mode as 'CONSUMES_BATCH' | 'FREE_CAPACITY',
          quantity,
          issued: quantity,
          note: note ?? null,
          createdById,
        },
      });

      const tickets: { id: string; qrPayload: string }[] = [];
      let courtesyBatchId: string | null = null;

      if (mode === 'CONSUMES_BATCH' && ticketTypeId) {
        const now = new Date();
        try {
          const { batchId } = await this.ticketBatches.consumeFromActiveBatch(
            tx,
            ticketTypeId,
            quantity,
            now,
          );
          courtesyBatchId = batchId;
        } catch (e: unknown) {
          const code =
            e && typeof e === 'object' && 'code' in e
              ? (e as { code?: string }).code
              : '';
          if (code === 'NO_ACTIVE_BATCH' || code === 'INSUFFICIENT_BATCH_STOCK') {
            throw new BadRequestException({
              code: ErrorCode.VALIDATION_FAILED,
              message: 'Insufficient availability for this ticket type',
            });
          }
          throw e;
        }
        await tx.ticketType.update({
          where: { id: ticketTypeId },
          data: { capacityAvailable: { decrement: quantity } },
        });
      }

      for (let i = 0; i < quantity; i++) {
        const qrPayload = generateQrPayload();
        const ticket = await tx.ticket.create({
          data: {
            eventId,
            ticketTypeId: mode === 'CONSUMES_BATCH' ? ticketTypeId : null,
            ticketBatchId: courtesyBatchId,
            qrPayload,
            status: 'VALID',
            source: 'COURTESY',
            orderId: null,
            orderItemId: null,
          },
        });
        tickets.push({ id: ticket.id, qrPayload: ticket.qrPayload });
      }

      return { grant, tickets };
    });

    return {
      grantId: result.grant.id,
      issued: result.grant.issued,
      tickets: result.tickets,
    };
  }

  async getTicketTypes(
    tenantId: string,
    eventId: string,
  ): Promise<TicketTypeResponse[]> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const rows = await tx.ticketType.findMany({
        where: { eventId, status: 'ACTIVE', deletedAt: null },
        select: { id: true },
      });
      for (const row of rows) {
        await this.ticketBatches.reconcileTicketType(tx, row.id, now);
      }
    });

    const types = await this.prisma.ticketType.findMany({
      where: { eventId, status: 'ACTIVE', deletedAt: null },
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

  async list(
    tenantId: string,
    eventId: string,
  ): Promise<{ grants: CourtesyGrantSummary[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const grants = await this.prisma.courtesyGrant.findMany({
      where: { eventId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      grants: grants.map((g) => ({
        id: g.id,
        mode: g.mode,
        ticketTypeId: g.ticketTypeId,
        quantity: g.quantity,
        issued: g.issued,
        note: g.note,
        createdAt: g.createdAt.toISOString(),
      })),
    };
  }
}