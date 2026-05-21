import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { generateTicketQrPayload } from '../../common/utils/ticket-qr.util';
import {
  TICKET_TRANSFER_LEGAL_NOTICE,
  type AcceptTicketTransferOfferResponse,
  type CreateTicketTransferOfferBody,
  type CreateTicketTransferOfferResponse,
  type MeTicketTransferOffersQuery,
  type MeTicketTransferOffersResponse,
  type TicketTransferLookupResponse,
  type TicketTransferOfferSummary,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

const DEFAULT_EXPIRY_HOURS = 72;

type OfferRow = {
  id: string;
  status: string;
  sourceTicketId: string;
  destinationTicketId: string | null;
  sellerUserId: string;
  buyerUserId: string | null;
  acceptToken: string;
  expiresAt: Date;
  completedAt: Date | null;
  cancelledAt: Date | null;
  rejectedAt?: Date | null;
  message?: string | null;
  createdAt: Date;
  sellerUser?: { firstName: string; lastName: string; email: string } | null;
  buyerUser?: { email: string } | null;
  sourceTicket?: {
    event: {
      id: string;
      title: string;
      startAt: Date;
      venueName: string | null;
      category: string | null;
    };
  } | null;
};

@Injectable()
export class TicketTransferOfferService {
  constructor(private readonly prisma: PrismaService) {}

  private mapOffer(row: OfferRow): TicketTransferOfferSummary {
    return {
      id: row.id,
      status: row.status as TicketTransferOfferSummary['status'],
      sourceTicketId: row.sourceTicketId,
      destinationTicketId: row.destinationTicketId,
      sellerUserId: row.sellerUserId,
      buyerUserId: row.buyerUserId,
      acceptToken: row.acceptToken,
      expiresAt: row.expiresAt.toISOString(),
      completedAt: row.completedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      rejectedAt: row.rejectedAt?.toISOString() ?? null,
      message: row.message ?? null,
      createdAt: row.createdAt.toISOString(),
      sellerDisplayName: row.sellerUser
        ? `${row.sellerUser.firstName} ${row.sellerUser.lastName}`.trim()
        : null,
      recipientEmail: row.buyerUser?.email ?? null,
      event: row.sourceTicket?.event
        ? {
            id: row.sourceTicket.event.id,
            title: row.sourceTicket.event.title,
            startAt: row.sourceTicket.event.startAt.toISOString(),
            venueName: row.sourceTicket.event.venueName,
            category: row.sourceTicket.event.category ?? 'event',
          }
        : undefined,
    };
  }

  private offerInclude() {
    return {
      sellerUser: { select: { firstName: true, lastName: true, email: true } },
      buyerUser: { select: { email: true } },
      sourceTicket: {
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              endAt: true,
              venueName: true,
              category: true,
            },
          },
        },
      },
    } as const;
  }

  private async writeTransferAudit(
    tenantId: string,
    actorId: string,
    sourceTicketId: string,
    transferEvent:
      | 'TICKET_TRANSFER_CREATED'
      | 'TICKET_TRANSFER_CANCELLED'
      | 'TICKET_TRANSFER_REJECTED'
      | 'TICKET_TRANSFER_EXPIRED'
      | 'TICKET_TRANSFER_ACCEPTED'
      | 'TICKET_TRANSFER_SOURCE_LOCKED',
    before: object,
    after: object,
    extra?: object,
  ) {
    const action =
      transferEvent === 'TICKET_TRANSFER_ACCEPTED'
        ? AuditAction.TICKET_TRANSFERRED
        : AuditAction.TICKET_REVOKED;
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        actorId,
        actorRole: 'USER',
        action,
        entityType: 'Ticket',
        entityId: sourceTicketId,
        before: before as Prisma.InputJsonValue,
        after: after as Prisma.InputJsonValue,
        metadata: { transferEvent, ...extra } as Prisma.InputJsonValue,
      },
    });
  }

  private assertEventNotPast(event: { startAt: Date; endAt: Date | null }) {
    const now = new Date();
    const end = event.endAt ?? event.startAt;
    if (end < now) {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: 'Event has already ended',
      });
    }
  }

  private async resolveBuyer(
    tenantId: string,
    sellerUserId: string,
    body: CreateTicketTransferOfferBody,
  ): Promise<{ buyerUserId: string | null; recipientEmail: string | null }> {
    if (body.buyerUserId && body.recipientEmail) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Use either buyerUserId or recipientEmail',
      });
    }
    if (body.buyerUserId) {
      if (body.buyerUserId === sellerUserId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Cannot transfer to yourself',
        });
      }
      const buyer = await this.prisma.user.findFirst({
        where: { id: body.buyerUserId, tenantId, deletedAt: null, status: 'ACTIVE' },
        select: { id: true, email: true },
      });
      if (!buyer) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Recipient user not found',
        });
      }
      return { buyerUserId: buyer.id, recipientEmail: buyer.email };
    }
    if (body.recipientEmail) {
      const email = body.recipientEmail.trim().toLowerCase();
      const buyer = await this.prisma.user.findFirst({
        where: {
          tenantId,
          deletedAt: null,
          status: 'ACTIVE',
          email: { equals: email, mode: 'insensitive' },
        },
        select: { id: true, email: true },
      });
      if (!buyer) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'No registered user with that email',
        });
      }
      if (buyer.id === sellerUserId) {
        throw new BadRequestException({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'Cannot transfer to yourself',
        });
      }
      return { buyerUserId: buyer.id, recipientEmail: buyer.email };
    }
    return { buyerUserId: null, recipientEmail: null };
  }

  private async assertTransferableTicket(
    tenantId: string,
    userId: string,
    ticketId: string,
  ) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, event: { tenantId } },
      include: { event: true },
    });
    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }
    if (ticket.ownerUserId !== userId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'You are not the ticket owner',
      });
    }
    if (ticket.status !== 'VALID') {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: `Ticket is not transferable (status: ${ticket.status})`,
      });
    }
    if (ticket.usedAt || ticket.revokedAt) {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: 'Ticket has been used or revoked',
      });
    }
    this.assertEventNotPast(ticket.event);

    const active = await this.prisma.ticketTransferOffer.findFirst({
      where: {
        sourceTicketId: ticketId,
        status: { in: ['AVAILABLE', 'RESERVED'] },
      },
    });
    if (active) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'An active transfer already exists for this ticket',
      });
    }
    return ticket;
  }

  async create(
    tenantId: string,
    sellerUserId: string,
    ticketId: string,
    body: CreateTicketTransferOfferBody,
  ): Promise<CreateTicketTransferOfferResponse> {
    await this.assertTransferableTicket(tenantId, sellerUserId, ticketId);
    const { buyerUserId, recipientEmail } = await this.resolveBuyer(
      tenantId,
      sellerUserId,
      body,
    );

    const hours = body.expiresInHours ?? DEFAULT_EXPIRY_HOURS;
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + hours);
    const acceptToken = randomBytes(24).toString('hex');

    const offer = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketTransferOffer.create({
        data: {
          tenantId,
          sourceTicketId: ticketId,
          sellerUserId,
          buyerUserId,
          acceptToken,
          expiresAt,
          message: body.message?.trim() || null,
          idempotencyKey: body.idempotencyKey ?? null,
        },
        include: this.offerInclude(),
      });

      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          status: 'TRANSFER_PENDING',
          activeTransferOfferId: created.id,
        },
      });

      return created;
    });

    await this.writeTransferAudit(
      tenantId,
      sellerUserId,
      ticketId,
      'TICKET_TRANSFER_CREATED',
      { status: 'VALID' },
      { status: 'TRANSFER_PENDING', offerId: offer.id },
      {
        buyerUserId,
        recipientEmail,
        expiresAt: offer.expiresAt.toISOString(),
      },
    );
    return {
      offer: this.mapOffer(offer),
      acceptPath: `/me/ticket-transfer/${offer.acceptToken}`,
      message:
        buyerUserId != null
          ? 'Transferencia enviada. El receptor puede aceptarla desde su cuenta o el enlace.'
          : 'Transferencia iniciada. Compartí el enlace con quien recibirá el ticket.',
    };
  }

  private async restoreTicketAfterOfferEnd(
    tx: Prisma.TransactionClient,
    sourceTicketId: string,
    offerId: string,
    endStatus: 'CANCELLED' | 'EXPIRED',
    extra?: { rejectedAt?: Date },
  ) {
    await tx.ticketTransferOffer.update({
      where: { id: offerId },
      data: {
        status: endStatus,
        cancelledAt: endStatus === 'CANCELLED' ? new Date() : undefined,
        rejectedAt: extra?.rejectedAt ?? undefined,
      },
    });
    await tx.ticket.updateMany({
      where: { id: sourceTicketId, status: 'TRANSFER_PENDING' },
      data: { status: 'VALID', activeTransferOfferId: null },
    });
  }

  async cancel(
    tenantId: string,
    sellerUserId: string,
    offerId: string,
  ): Promise<TicketTransferOfferSummary> {
    const offer = await this.prisma.ticketTransferOffer.findFirst({
      where: { id: offerId, tenantId, sellerUserId },
      include: this.offerInclude(),
    });
    if (!offer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Transfer offer not found',
      });
    }
    if (offer.status !== 'AVAILABLE' && offer.status !== 'RESERVED') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Offer cannot be cancelled in current status',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketAfterOfferEnd(tx, offer.sourceTicketId, offerId, 'CANCELLED');
      return tx.ticketTransferOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: this.offerInclude(),
      });
    });

    await this.writeTransferAudit(
      tenantId,
      sellerUserId,
      offer.sourceTicketId,
      'TICKET_TRANSFER_CANCELLED',
      { status: 'TRANSFER_PENDING' },
      { status: 'VALID' },
      { offerId },
    );

    return this.mapOffer(updated);
  }

  async reject(
    tenantId: string,
    buyerUserId: string,
    offerId: string,
  ): Promise<TicketTransferOfferSummary> {
    const offer = await this.prisma.ticketTransferOffer.findFirst({
      where: { id: offerId, tenantId },
      include: this.offerInclude(),
    });
    if (!offer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Transfer offer not found',
      });
    }
    if (offer.sellerUserId === buyerUserId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Cannot reject your own transfer',
      });
    }
    if (offer.status !== 'AVAILABLE' && offer.status !== 'RESERVED') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Transfer offer is no longer pending',
      });
    }
    if (offer.buyerUserId && offer.buyerUserId !== buyerUserId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'This transfer is reserved for another user',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketAfterOfferEnd(tx, offer.sourceTicketId, offerId, 'CANCELLED', {
        rejectedAt: new Date(),
      });
      return tx.ticketTransferOffer.findUniqueOrThrow({
        where: { id: offerId },
        include: this.offerInclude(),
      });
    });

    await this.writeTransferAudit(
      tenantId,
      buyerUserId,
      offer.sourceTicketId,
      'TICKET_TRANSFER_REJECTED',
      { status: 'TRANSFER_PENDING' },
      { status: 'VALID' },
      { offerId },
    );

    return this.mapOffer(updated);
  }

  async lookupByToken(
    tenantId: string,
    userId: string,
    token: string,
  ): Promise<TicketTransferLookupResponse> {
    const offer = await this.prisma.ticketTransferOffer.findFirst({
      where: { acceptToken: token, tenantId },
      include: this.offerInclude(),
    });
    if (!offer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Transfer offer not found',
      });
    }

    const pending =
      offer.status === 'AVAILABLE' || offer.status === 'RESERVED';
    const expired = pending && offer.expiresAt < new Date();
    if (expired) {
      await this.expireOffer(offer.id);
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Transfer offer has expired',
      });
    }

    const isSeller = offer.sellerUserId === userId;
    const reservedOk = !offer.buyerUserId || offer.buyerUserId === userId;
    const canAccept = pending && !isSeller && reservedOk;
    const canReject = canAccept;

    return {
      offer: this.mapOffer(offer),
      canAccept,
      canReject,
      legalNotice: TICKET_TRANSFER_LEGAL_NOTICE,
    };
  }

  async accept(
    tenantId: string,
    buyerUserId: string,
    token: string,
  ): Promise<AcceptTicketTransferOfferResponse> {
    const offer = await this.prisma.ticketTransferOffer.findFirst({
      where: { acceptToken: token, tenantId },
      include: {
        sourceTicket: {
          include: {
            event: {
              select: {
                id: true,
                title: true,
                startAt: true,
                venueName: true,
                category: true,
                tenantId: true,
              },
            },
            ticketType: true,
            order: true,
            orderItem: true,
          },
        },
        sellerUser: { select: { firstName: true, lastName: true, email: true } },
        buyerUser: { select: { email: true } },
      },
    });

    if (!offer) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Transfer offer not found',
      });
    }

    if (offer.status !== 'AVAILABLE' && offer.status !== 'RESERVED') {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Transfer offer is no longer available',
      });
    }

    if (offer.expiresAt < new Date()) {
      await this.expireOffer(offer.id);
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Transfer offer has expired',
      });
    }

    if (offer.sellerUserId === buyerUserId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Cannot accept your own transfer',
      });
    }

    if (offer.buyerUserId && offer.buyerUserId !== buyerUserId) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'This transfer is reserved for another user',
      });
    }

    const source = offer.sourceTicket;
    if (!source || source.status !== 'TRANSFER_PENDING') {
      throw new ConflictException({
        code: ErrorCode.TICKET_NOT_TRANSFERABLE,
        message: 'Source ticket is not in transferable state',
      });
    }

    const result = await this.prisma.$transaction(async (tx) => {
      let qrPayload = generateTicketQrPayload();
      while (
        await tx.ticket.findUnique({ where: { qrPayload }, select: { id: true } })
      ) {
        qrPayload = generateTicketQrPayload();
      }

      const dest = await tx.ticket.create({
        data: {
          eventId: source.eventId,
          orderId: source.orderId,
          orderItemId: source.orderItemId,
          ticketTypeId: source.ticketTypeId,
          ticketBatchId: source.ticketBatchId,
          status: 'VALID',
          source: source.source,
          ownerUserId: buyerUserId,
          qrPayload,
          transferredFromTicketId: source.id,
        },
      });

      await tx.ticket.update({
        where: { id: source.id },
        data: {
          status: 'TRANSFERRED',
          activeTransferOfferId: null,
          ownerUserId: null,
        },
      });

      const completed = await tx.ticketTransferOffer.update({
        where: { id: offer.id },
        data: {
          status: 'COMPLETED',
          buyerUserId,
          destinationTicketId: dest.id,
          completedAt: new Date(),
        },
        include: this.offerInclude(),
      });

      await tx.ticketTransfer.create({
        data: {
          ticketId: source.id,
          offerId: offer.id,
          destinationTicketId: dest.id,
          fromUserId: offer.sellerUserId,
          toUserId: buyerUserId,
          idempotencyKey: offer.idempotencyKey,
        },
      });

      return { completed, dest };
    });

    await this.writeTransferAudit(
      tenantId,
      buyerUserId,
      offer.sourceTicketId,
      'TICKET_TRANSFER_ACCEPTED',
      { status: 'TRANSFER_PENDING', ownerUserId: offer.sellerUserId },
      {
        status: 'TRANSFERRED',
        destinationTicketId: result.dest.id,
        ownerUserId: buyerUserId,
      },
      {
        transferOfferId: offer.id,
        destinationTicketId: result.dest.id,
      },
    );

    return {
      offer: this.mapOffer(result.completed),
      destinationTicket: {
        ticketId: result.dest.id,
        qrPayload: result.dest.qrPayload,
        status: 'VALID',
        eventId: result.dest.eventId,
      },
      message: 'Transferencia completada. El QR anterior ya no es válido; usá tu nuevo ticket.',
    };
  }

  async expireDueOffers(): Promise<number> {
    const due = await this.prisma.ticketTransferOffer.findMany({
      where: {
        status: { in: ['AVAILABLE', 'RESERVED'] },
        expiresAt: { lt: new Date() },
      },
      select: { id: true },
      take: 100,
    });
    for (const row of due) {
      await this.expireOffer(row.id);
    }
    return due.length;
  }

  private async expireOffer(offerId: string) {
    const offer = await this.prisma.ticketTransferOffer.findUnique({
      where: { id: offerId },
      select: { id: true, sourceTicketId: true, tenantId: true, sellerUserId: true },
    });
    if (!offer) return;

    await this.prisma.$transaction(async (tx) => {
      await this.restoreTicketAfterOfferEnd(tx, offer.sourceTicketId, offerId, 'EXPIRED');
    });

    await this.writeTransferAudit(
      offer.tenantId,
      offer.sellerUserId,
      offer.sourceTicketId,
      'TICKET_TRANSFER_EXPIRED',
      { status: 'TRANSFER_PENDING' },
      { status: 'VALID' },
      { offerId },
    );
  }

  async listForUser(
    tenantId: string,
    userId: string,
    query: MeTicketTransferOffersQuery,
  ): Promise<MeTicketTransferOffersResponse> {
    const statusFilter = query.status ? { status: query.status } : {};
    const roleFilter =
      query.role === 'sent'
        ? { sellerUserId: userId }
        : query.role === 'received'
          ? { buyerUserId: userId }
          : {
              OR: [
                { sellerUserId: userId },
                { buyerUserId: userId },
              ],
            };

    const rows = await this.prisma.ticketTransferOffer.findMany({
      where: { tenantId, ...roleFilter, ...statusFilter },
      include: this.offerInclude(),
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return { offers: rows.map((r) => this.mapOffer(r)) };
  }
}
