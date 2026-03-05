import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  ValidateTicketBody,
  ValidateTicketQuery,
  ValidateTicketResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class ScannerService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(
    query: ValidateTicketQuery,
    body: ValidateTicketBody,
  ): Promise<ValidateTicketResponse> {
    const { tenantId } = query;
    const { eventId, qrPayload, deviceId } = body;

    // 1) Validate Event exists for tenant
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ticketId: null,
          isValid: false,
          reason: 'EVENT_NOT_FOUND',
        },
      });
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    // 2) Lookup Ticket by qrPayload + eventId
    const ticket = await this.prisma.ticket.findFirst({
      where: { qrPayload, eventId },
      include: { ticketType: true },
    });

    if (!ticket) {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ticketId: null,
          isValid: false,
          reason: 'TICKET_NOT_FOUND',
        },
      });
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    // 3) Status handling: REVOKED
    if (ticket.status === 'REVOKED') {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ticketId: ticket.id,
          isValid: false,
          reason: 'REVOKED',
        },
      });
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket is revoked',
      });
    }

    // 3) Status handling: USED (already used)
    if (ticket.status === 'USED') {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ticketId: ticket.id,
          isValid: false,
          reason: 'ALREADY_USED',
        },
      });
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Ticket already used',
      });
    }

    // 4) VALID: atomic update to prevent race / double-scan
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED' },
    });

    if (count === 0) {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ticketId: ticket.id,
          isValid: false,
          reason: 'ALREADY_USED',
        },
      });
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Ticket already used',
      });
    }

    // count === 1: success
    await this.prisma.ticketScan.create({
      data: {
        tenantId,
        eventId,
        qrPayload,
        deviceId: deviceId ?? null,
        ticketId: ticket.id,
        isValid: true,
        reason: 'SUCCESS',
      },
    });

    return {
      isValid: true,
      ticketId: ticket.id,
      ticketTypeName: ticket.ticketType?.name ?? undefined,
      message: 'VALID',
    };
  }
}
