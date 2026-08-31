import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
import { isOccurrenceScannable } from '../common/utils/scanner-event-eligibility.util';
import type {
  ValidateTicketBody,
  ValidateTicketQuery,
  ValidateTicketResponse,
  ScanBody,
  ScanResponse,
  EventTicketsResponse,
  TicketScanLogItem,
  ScannerEventOccurrencesResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { ScannerShortCodeService } from './scanner-short-code.service';
import { ticketBuyerDisplayName } from '../common/user-contact.util';

function occurrenceLabel(startAt: Date | null | undefined): string | undefined {
  if (!startAt) return undefined;
  return startAt.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

type ScanTicketContext = {
  eventTitle: string;
  holderName?: string;
  occurrenceLabel?: string;
};

@Injectable()
export class ScannerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerAccounts: ScannerAccountsService,
    private readonly shortCodes: ScannerShortCodeService,
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

  async getEventOccurrences(
    tenantId: string,
    scannerUserId: string,
    eventId: string,
  ): Promise<ScannerEventOccurrencesResponse> {
    await this.scannerAccounts.assertScannerCanAccessEvent(tenantId, scannerUserId, eventId);

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const occurrenceRows = await this.prisma.eventOccurrence.findMany({
      where: { eventId, tenantId, status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { startAt: 'asc' }],
      select: {
        id: true,
        startAt: true,
        endAt: true,
        venueName: true,
        status: true,
      },
    });

    const scannable = occurrenceRows.filter((o) => isOccurrenceScannable(o));

    if (scannable.length === 0) {
      return { isMultiDate: occurrenceRows.length > 0, occurrences: [] };
    }

    return {
      isMultiDate: true,
      occurrences: scannable.map((o) => ({
        id: o.id,
        startAt: o.startAt.toISOString(),
        endAt: o.endAt?.toISOString() ?? null,
        venueName: o.venueName,
        status: o.status,
      })),
    };
  }

  async scan(
    tenantId: string,
    scannerId: string,
    body: ScanBody,
  ): Promise<ScanResponse> {
    const { eventId, qrPayload: rawQrPayload, deviceId, occurrenceId } = body;

    await this.scannerAccounts.assertScannerCanAccessEvent(tenantId, scannerId, eventId);

    const qrPayload = await this.shortCodes.resolveTicketQrPayload(
      tenantId,
      eventId,
      rawQrPayload,
    );

    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) {
      return { result: 'INVALID', message: 'Evento no encontrado' };
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        qrPayload,
        eventId,
        event: { tenantId },
      },
      include: {
        ticketType: true,
        occurrence: { select: { startAt: true } },
        order: {
          select: { buyerFirstName: true, buyerLastName: true, buyerEmail: true },
        },
        ownerUser: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    const ctx: ScanTicketContext = {
      eventTitle: event.title,
      holderName: ticket
        ? ticketBuyerDisplayName({ order: ticket.order, ownerUser: ticket.ownerUser })
        : undefined,
      occurrenceLabel: ticket
        ? occurrenceLabel(ticket.occurrence?.startAt ?? null)
        : undefined,
    };

    const withCtx = (res: ScanResponse): ScanResponse => ({
      ...ctx,
      ...res,
      eventTitle: res.eventTitle ?? ctx.eventTitle,
      holderName: res.holderName ?? ctx.holderName,
      occurrenceLabel: res.occurrenceLabel ?? ctx.occurrenceLabel,
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
      return withCtx({ result: 'INVALID' });
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
      return withCtx({
        result: 'ALREADY_USED',
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name,
        firstScannedAt: ticket.usedAt?.toISOString(),
      });
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
      return withCtx({
        result: 'REVOKED',
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name,
        ticketStatus: 'REVOKED',
      });
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
      return withCtx({
        result: 'INVALID',
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name,
        ticketStatus: ticket.status,
      });
    }

    const ticketOccurrenceId = ticket.occurrenceId ?? ticket.ticketType?.occurrenceId ?? null;
    if (
      occurrenceId &&
      ticketOccurrenceId &&
      ticketOccurrenceId !== occurrenceId
    ) {
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
      return withCtx({
        result: 'WRONG_OCCURRENCE',
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name,
        message: 'Esta entrada corresponde a otra fecha.',
      });
    }

    const now = new Date();
    const { count } = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', usedAt: now },
    });

    if (count === 0) {
      const refreshed = await this.prisma.ticket.findUnique({
        where: { id: ticket.id },
        select: { usedAt: true },
      });
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
      return withCtx({
        result: 'ALREADY_USED',
        ticketId: ticket.id,
        ticketTypeName: ticket.ticketType?.name,
        firstScannedAt: refreshed?.usedAt?.toISOString(),
      });
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

    return withCtx({
      result: 'OK',
      ticketId: ticket.id,
      ticketTypeName: ticket.ticketType?.name ?? undefined,
      scannedAt: now.toISOString(),
    });
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
