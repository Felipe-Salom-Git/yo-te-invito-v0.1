import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
import type {
  ValidateTicketBody,
  ValidateTicketQuery,
  ValidateTicketResponse,
  ScanBody,
  ScanResponse,
  EventTicketsResponse,
  TicketScanLogItem,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class ScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerAccounts: ScannerAccountsService,
  ) {}

  async getEventTickets(
    tenantId: string,
    scannerUserId: string,
    eventId: string,
  ): Promise<EventTicketsResponse> {
    await this.scannerAccounts.assertScannerCanAccessEvent(tenantId, scannerUserId, eventId);
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        tenantId,
        deletedAt: null,
      },
    });

    if (!event) {
      return { tickets: [] };
    }

    const tickets = await this.prisma.ticket.findMany({
      where: {
        eventId,
        status: 'VALID',
      },
      select: {
        id: true,
        qrPayload: true,
        status: true,
      },
    });

    return {
      tickets: tickets.map((t) => ({
        ticketId: t.id,
        qrPayload: t.qrPayload,
        status: t.status,
      })),
    };
  }

  async scan(
    tenantId: string,
    scannerId: string,
    body: ScanBody,
  ): Promise<ScanResponse> {
    const { eventId, qrPayload, deviceId } = body;

    await this.scannerAccounts.assertScannerCanAccessEvent(tenantId, scannerId, eventId);

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        qrPayload,
        eventId,
        event: { tenantId },
      },
      include: { ticketType: true },
    });

    if (!ticket) {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          scannerId,
          ticketId: null,
          result: 'INVALID',
        },
      });
      return { result: 'INVALID' };
    }

    if (ticket.status === 'USED') {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          scannerId,
          ticketId: ticket.id,
          result: 'ALREADY_USED',
        },
      });
      return { result: 'ALREADY_USED', ticketId: ticket.id, ticketTypeName: ticket.ticketType?.name };
    }

    if (ticket.status === 'REVOKED') {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          scannerId,
          ticketId: ticket.id,
          result: 'REVOKED',
        },
      });
      return { result: 'REVOKED', ticketId: ticket.id, ticketTypeName: ticket.ticketType?.name };
    }

    if (ticket.status === 'TRANSFER_PENDING' || ticket.status === 'TRANSFERRED') {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          scannerId,
          ticketId: ticket.id,
          result: 'INVALID',
        },
      });
      return { result: 'INVALID', ticketId: ticket.id, ticketTypeName: ticket.ticketType?.name };
    }

    const now = new Date();
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', usedAt: now },
    });

    if (count === 0) {
      await this.prisma.ticketScanLog.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          scannerId,
          ticketId: ticket.id,
          result: 'ALREADY_USED',
        },
      });
      return { result: 'ALREADY_USED', ticketId: ticket.id, ticketTypeName: ticket.ticketType?.name };
    }

    await this.prisma.ticketScanLog.create({
      data: {
        tenantId,
        eventId,
        qrPayload,
        deviceId: deviceId ?? null,
        scannerId,
        ticketId: ticket.id,
        result: 'OK',
      },
    });

    return {
      result: 'OK',
      ticketId: ticket.id,
      ticketTypeName: ticket.ticketType?.name ?? undefined,
    };
  }

  async validate(
    query: ValidateTicketQuery,
    body: ValidateTicketBody,
    ctx?: { ipAddress?: string; userAgent?: string },
  ): Promise<ValidateTicketResponse> {
    const { tenantId } = query;
    const { eventId, qrPayload, deviceId } = body;
    const scanMeta = {
      ipAddress: ctx?.ipAddress ?? null,
      userAgent: ctx?.userAgent ?? null,
    };

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
          ...scanMeta,
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
          ...scanMeta,
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

    // 3) Status handling: REVOKED — return 200 with isValid: false (spec)
    if (ticket.status === 'REVOKED') {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ...scanMeta,
          ticketId: ticket.id,
          isValid: false,
          reason: 'REVOKED',
        },
      });
      return {
        isValid: false,
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name ?? undefined,
        message: 'revoked',
      };
    }

    // 3) Status handling: USED (already used)
    if (ticket.status === 'USED') {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ...scanMeta,
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

    if (ticket.status === 'TRANSFER_PENDING' || ticket.status === 'TRANSFERRED') {
      await this.prisma.ticketScan.create({
        data: {
          tenantId,
          eventId,
          qrPayload,
          deviceId: deviceId ?? null,
          ...scanMeta,
          ticketId: ticket.id,
          isValid: false,
          reason: 'INVALID',
        },
      });
      return {
        isValid: false,
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name ?? undefined,
        message: 'invalid',
      };
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
          ...scanMeta,
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
        ...scanMeta,
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

  async listScanLogs(
    tenantId: string,
    eventId: string,
    limit: number,
  ): Promise<TicketScanLogItem[]> {
    const logs = await this.prisma.ticketScanLog.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs.map((l) => ({
      id: l.id,
      ticketId: l.ticketId,
      eventId: l.eventId,
      qrPayload: l.qrPayload,
      result: l.result,
      scannedAt: l.createdAt.toISOString(),
    }));
  }
}
