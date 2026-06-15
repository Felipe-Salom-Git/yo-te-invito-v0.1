import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import {
  Role,
  shortTicketCode,
  type ProducerEventTicketsQuery,
  type ProducerEventTicketsResponse,
  type ScannerEventTicketsQuery,
  type ScannerEventTicketsResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorCode } from '@yo-te-invito/shared';
import type { Prisma, TicketStatus } from '@prisma/client';

function buyerDisplayName(input: {
  order?: { buyerFirstName: string; buyerLastName: string; buyerEmail: string } | null;
  ownerUser?: { firstName: string | null; lastName: string | null; email: string } | null;
}): string {
  if (input.order) {
    const name = `${input.order.buyerFirstName} ${input.order.buyerLastName}`.trim();
    if (name) return name;
    return input.order.buyerEmail;
  }
  if (input.ownerUser) {
    const name = `${input.ownerUser.firstName ?? ''} ${input.ownerUser.lastName ?? ''}`.trim();
    if (name) return name;
    return input.ownerUser.email;
  }
  return '—';
}

function buyerEmail(input: {
  order?: { buyerEmail: string } | null;
  ownerUser?: { email: string } | null;
}): string | null {
  return input.order?.buyerEmail ?? input.ownerUser?.email ?? null;
}

function occurrenceLabel(startAt: Date | null | undefined): string | null {
  if (!startAt) return null;
  return startAt.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function scannerLabel(user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
} | null): string | null {
  if (!user) return null;
  const name = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
  return name || user.email;
}

type TicketRow = Prisma.TicketGetPayload<{
  include: {
    ticketType: { select: { name: true; occurrenceId: true } };
    occurrence: { select: { id: true; startAt: true } };
    order: {
      select: {
        buyerFirstName: true;
        buyerLastName: true;
        buyerEmail: true;
        referralLinkId: true;
        referralLink: {
          select: {
            code: true;
            referrerProfile: { select: { displayName: true } };
            referrer: { select: { email: true; firstName: true; lastName: true } };
          };
        };
        orderItems: { select: { unitPrice: true } };
        paidAt: true;
        createdAt: true;
        currency: true;
      };
    };
    orderItem: { select: { unitPrice: true } };
    ownerUser: { select: { firstName: true; lastName: true; email: true } };
    ticketScanLogs: {
      select: {
        createdAt: true;
        result: true;
        scannerId: true;
      };
      orderBy: { createdAt: 'asc' };
    };
  };
}>;

@Injectable()
export class EventTicketListService {
  constructor(private readonly prisma: PrismaService) {}

  async assertProducerCanList(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { producerId: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const isAdmin = userRole === Role.ADMIN;
    const isOwner = event.producerId === userId;
    if (!isAdmin && !isOwner) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Not allowed to list tickets for this event',
      });
    }
  }

  private async loadTickets(eventId: string): Promise<TicketRow[]> {
    const tickets = await this.prisma.ticket.findMany({
      where: { eventId },
      include: {
        ticketType: { select: { name: true, occurrenceId: true } },
        occurrence: { select: { id: true, startAt: true } },
        order: {
          select: {
            buyerFirstName: true,
            buyerLastName: true,
            buyerEmail: true,
            referralLinkId: true,
            referralLink: {
              select: {
                code: true,
                referrerProfile: { select: { displayName: true } },
                referrer: { select: { email: true, firstName: true, lastName: true } },
              },
            },
            orderItems: { select: { unitPrice: true } },
            paidAt: true,
            createdAt: true,
            currency: true,
          },
        },
        orderItem: { select: { unitPrice: true } },
        ownerUser: { select: { firstName: true, lastName: true, email: true } },
        ticketScanLogs: {
          select: { createdAt: true, result: true, scannerId: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ occurrence: { startAt: 'asc' } }, { ticketType: { name: 'asc' } }, { createdAt: 'asc' }],
    });
    return tickets;
  }

  private async resolveScannerLabels(scannerIds: string[]): Promise<Map<string, string>> {
    const unique = [...new Set(scannerIds.filter(Boolean))];
    if (unique.length === 0) return new Map();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    return new Map(users.map((u) => [u.id, scannerLabel(u) ?? u.email]));
  }

  private mapScanInfo(
    ticket: TicketRow,
    scannerLabels: Map<string, string>,
  ) {
    const okLogs = ticket.ticketScanLogs.filter((l) => l.result === 'OK');
    const firstOk = okLogs[0];
    const lastLog = ticket.ticketScanLogs[ticket.ticketScanLogs.length - 1];
    const scannedAt = ticket.usedAt ?? firstOk?.createdAt ?? null;
    const scanned = ticket.status === 'USED' || !!scannedAt;
    return {
      scanned,
      scannedAt: scannedAt?.toISOString() ?? null,
      scannedByLabel: firstOk?.scannerId
        ? scannerLabels.get(firstOk.scannerId) ?? null
        : null,
      scanCount: ticket.ticketScanLogs.length,
      lastScanResult: lastLog?.result ?? null,
    };
  }

  private mapReferral(ticket: TicketRow) {
    const link = ticket.order?.referralLink;
    const viaReferral = !!ticket.order?.referralLinkId;
    let referrerName: string | null = null;
    let referrerEmail: string | null = null;
    if (link?.referrerProfile?.displayName) {
      referrerName = link.referrerProfile.displayName;
    } else if (link?.referrer) {
      referrerName = scannerLabel(link.referrer);
      referrerEmail = link.referrer.email;
    }
    return {
      viaReferral,
      referrerName,
      referrerEmail,
      referralCode: link?.code ?? null,
    };
  }

  private priceCents(ticket: TicketRow): number | null {
    const unit = ticket.orderItem?.unitPrice ?? ticket.order?.orderItems[0]?.unitPrice;
    if (!unit) return null;
    return Math.round(Number(unit) * 100);
  }

  async listForProducer(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
    query: ProducerEventTicketsQuery,
  ): Promise<ProducerEventTicketsResponse> {
    await this.assertProducerCanList(tenantId, eventId, userId, userRole);

    const all = await this.loadTickets(eventId);
    const scannerLabels = await this.resolveScannerLabels(
      all.flatMap((t) => t.ticketScanLogs.map((l) => l.scannerId).filter(Boolean) as string[]),
    );

    const kpis = {
      total: all.length,
      used: all.filter((t) => t.status === 'USED').length,
      available: all.filter((t) => t.status === 'VALID').length,
      viaReferral: all.filter((t) => !!t.order?.referralLinkId).length,
      transferredOrRevoked: all.filter((t) =>
        ['REVOKED', 'TRANSFERRED', 'TRANSFER_PENDING'].includes(t.status),
      ).length,
    };

    let filtered = all;

    if (query.status) {
      filtered = filtered.filter((t) => t.status === query.status);
    }
    if (query.occurrenceId) {
      filtered = filtered.filter(
        (t) =>
          t.occurrenceId === query.occurrenceId ||
          t.ticketType?.occurrenceId === query.occurrenceId,
      );
    }
    if (query.referrer === 'true') {
      filtered = filtered.filter((t) => !!t.order?.referralLinkId);
    } else if (query.referrer === 'false') {
      filtered = filtered.filter((t) => !t.order?.referralLinkId);
    }
    if (query.scanned === 'true') {
      filtered = filtered.filter((t) => t.status === 'USED' || !!t.usedAt);
    } else if (query.scanned === 'false') {
      filtered = filtered.filter((t) => t.status !== 'USED' && !t.usedAt);
    }
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      filtered = filtered.filter((t) => {
        const code = shortTicketCode(t.id).toLowerCase();
        const name = buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }).toLowerCase();
        const email = buyerEmail({ order: t.order, ownerUser: t.ownerUser })?.toLowerCase() ?? '';
        return code.includes(q) || name.includes(q) || email.includes(q);
      });
    }

    const total = filtered.length;
    const page = query.page;
    const limit = query.limit;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const slice = filtered.slice((page - 1) * limit, page * limit);

    const tickets = slice.map((t) => ({
      ticketId: t.id,
      shortCode: shortTicketCode(t.id),
      buyerName: buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }),
      buyerEmail: buyerEmail({ order: t.order, ownerUser: t.ownerUser }),
      ticketTypeName: t.ticketType?.name ?? 'Entrada',
      occurrenceId: t.occurrenceId ?? t.ticketType?.occurrenceId ?? null,
      occurrenceStartAt: t.occurrence?.startAt?.toISOString() ?? null,
      occurrenceLabel: occurrenceLabel(t.occurrence?.startAt),
      status: t.status,
      issuedAt: (t.order?.paidAt ?? t.order?.createdAt ?? t.createdAt).toISOString(),
      priceCents: this.priceCents(t),
      currency: t.order?.currency ?? 'ARS',
      referral: this.mapReferral(t),
      scan: this.mapScanInfo(t, scannerLabels),
      qrPayload: t.qrPayload,
    }));

    return {
      tickets,
      pagination: { page, limit, total, totalPages },
      kpis,
    };
  }

  async listForScanner(
    tenantId: string,
    eventId: string,
    query: ScannerEventTicketsQuery,
  ): Promise<ScannerEventTicketsResponse> {
    const all = await this.loadTickets(eventId);
    const scannerLabels = await this.resolveScannerLabels(
      all.flatMap((t) => t.ticketScanLogs.map((l) => l.scannerId).filter(Boolean) as string[]),
    );

    let filtered = all;

    if (query.occurrenceId) {
      filtered = filtered.filter(
        (t) =>
          t.occurrenceId === query.occurrenceId ||
          t.ticketType?.occurrenceId === query.occurrenceId,
      );
    }
    if (query.status) {
      filtered = filtered.filter((t) => t.status === query.status);
    }
    if (query.scanned === 'true') {
      filtered = filtered.filter((t) => t.status === 'USED' || !!t.usedAt);
    } else if (query.scanned === 'false') {
      filtered = filtered.filter((t) => t.status !== 'USED' && !t.usedAt);
    }
    if (query.q?.trim()) {
      const q = query.q.trim().toLowerCase();
      filtered = filtered.filter((t) => {
        const code = shortTicketCode(t.id).toLowerCase();
        const name = buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }).toLowerCase();
        const type = (t.ticketType?.name ?? '').toLowerCase();
        return code.includes(q) || name.includes(q) || type.includes(q);
      });
    }

    const tickets = filtered.map((t) => {
      const scan = this.mapScanInfo(t, scannerLabels);
      return {
        ticketId: t.id,
        shortCode: shortTicketCode(t.id),
        qrPayload: t.qrPayload,
        holderName: buyerDisplayName({ order: t.order, ownerUser: t.ownerUser }),
        ticketTypeName: t.ticketType?.name ?? 'Entrada',
        occurrenceId: t.occurrenceId ?? t.ticketType?.occurrenceId ?? null,
        occurrenceStartAt: t.occurrence?.startAt?.toISOString() ?? null,
        occurrenceLabel: occurrenceLabel(t.occurrence?.startAt),
        status: t.status,
        scannedAt: scan.scannedAt,
        scannedBy: scan.scannedByLabel,
        scanCount: scan.scanCount,
        lastScanResult: scan.lastScanResult,
      };
    });

    return { tickets, total: tickets.length };
  }

  /** Minimal rows for offline preload (backward compatible). */
  async listOfflinePreload(eventId: string): Promise<
    Array<{ ticketId: string; qrPayload: string; status: TicketStatus }>
  > {
    const tickets = await this.prisma.ticket.findMany({
      where: { eventId, status: 'VALID' },
      select: { id: true, qrPayload: true, status: true },
    });
    return tickets.map((t) => ({
      ticketId: t.id,
      qrPayload: t.qrPayload,
      status: t.status,
    }));
  }
}
