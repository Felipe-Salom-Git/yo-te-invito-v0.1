import { Injectable, ConflictException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class EventCapacityGuardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Asserts event has capacity for additional seats.
   * Run inside a transaction; locks Event row to prevent races.
   * - If capacityTotal is null => ok
   * - usedSeats = tickets with status != REVOKED
   * - If usedSeats + additionalSeats > capacityTotal => 409 EVENT_CAPACITY_EXCEEDED
   */
  async assertEventCapacityAvailable(
    tx: Prisma.TransactionClient,
    tenantId: string,
    eventId: string,
    additionalSeats: number,
  ): Promise<void> {
    const event = await tx.event.findFirst({
      where: { id: eventId, tenantId },
    });

    if (!event) return;

    if (event.capacityTotal == null) return;

    await tx.$queryRaw`
      SELECT 1 FROM "Event" WHERE id = ${eventId} AND "tenantId" = ${tenantId} FOR UPDATE
    `;

    const usedSeats = await tx.ticket.count({
      where: {
        eventId,
        status: { not: 'REVOKED' },
      },
    });

    if (usedSeats + additionalSeats > event.capacityTotal) {
      throw new ConflictException({
        code: ErrorCode.EVENT_CAPACITY_EXCEEDED,
        message: `Event capacity exceeded (used: ${usedSeats}, capacity: ${event.capacityTotal}, requested: ${additionalSeats})`,
      });
    }
  }
}
