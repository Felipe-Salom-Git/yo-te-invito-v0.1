import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { Prisma, TicketType } from '@prisma/client';
import { ErrorCode } from '@yo-te-invito/shared';

type Tx = Prisma.TransactionClient;

export async function countActiveOccurrences(tx: Tx, eventId: string): Promise<number> {
  return tx.eventOccurrence.count({
    where: { eventId, status: { not: 'CANCELLED' } },
  });
}

export async function assertOrderOccurrenceValid(
  tx: Tx,
  tenantId: string,
  eventId: string,
  occurrenceId: string | undefined,
  ticketTypes: Pick<TicketType, 'id' | 'occurrenceId'>[],
): Promise<string | null> {
  const occurrenceCount = await countActiveOccurrences(tx, eventId);
  const isMultiDate = occurrenceCount > 0;

  if (!isMultiDate) {
    if (occurrenceId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'occurrenceId is not applicable for single-date events',
      });
    }
    const hasOccurrenceTypes = ticketTypes.some((t) => t.occurrenceId != null);
    if (hasOccurrenceTypes) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket type does not match event date mode',
      });
    }
    return null;
  }

  if (!occurrenceId) {
    throw new BadRequestException({
      code: ErrorCode.VALIDATION_FAILED,
      message: 'occurrenceId is required for multi-date events',
    });
  }

  const occurrence = await tx.eventOccurrence.findFirst({
    where: {
      id: occurrenceId,
      eventId,
      tenantId,
      status: 'ACTIVE',
    },
  });
  if (!occurrence) {
    throw new NotFoundException({
      code: ErrorCode.NOT_FOUND,
      message: 'Event occurrence not found or not available',
    });
  }

  for (const tt of ticketTypes) {
    if (tt.occurrenceId != null && tt.occurrenceId !== occurrenceId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'All ticket types must belong to the selected event date',
      });
    }
  }

  return occurrenceId;
}
