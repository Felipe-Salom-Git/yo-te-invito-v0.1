import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { EventOccurrence, Ticket } from '@prisma/client';
import {
  ErrorCode,
  TICKET_TRANSFER_BLOCK_REASON,
  type TicketTransferBlockReason,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

type TicketWithRelations = Ticket & {
  event: {
    id: string;
    status: string;
    startAt: Date;
    endAt: Date | null;
    deletedAt: Date | null;
    tenantId: string;
  };
  occurrence: Pick<EventOccurrence, 'id' | 'startAt' | 'endAt' | 'status'> | null;
  activeTransferOffer: { id: string } | null;
};

export type TicketTransferEligibility = {
  transferable: boolean;
  reasons: TicketTransferBlockReason[];
};

@Injectable()
export class TicketTransferEligibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async loadTicketForEligibility(
    tenantId: string,
    ticketId: string,
  ): Promise<TicketWithRelations | null> {
    return this.prisma.ticket.findFirst({
      where: {
        id: ticketId,
        event: { tenantId, deletedAt: null },
      },
      include: {
        event: {
          select: {
            id: true,
            status: true,
            startAt: true,
            endAt: true,
            deletedAt: true,
            tenantId: true,
          },
        },
        occurrence: {
          select: { id: true, startAt: true, endAt: true, status: true },
        },
        activeTransferOffer: { select: { id: true } },
      },
    });
  }

  isOwner(ticket: TicketWithRelations, userId: string): boolean {
    return ticket.ownerUserId === userId;
  }

  evaluate(ticket: TicketWithRelations, userId: string): TicketTransferEligibility {
    const reasons: TicketTransferBlockReason[] = [];

    if (!this.isOwner(ticket, userId)) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.NOT_OWNER);
    }

    if (ticket.status === 'USED' || ticket.usedAt) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_ALREADY_USED);
    }

    if (ticket.status === 'REVOKED' || ticket.revokedAt) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_REVOKED);
    }

    if (ticket.status === 'TRANSFERRED') {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_NOT_VALID_STATUS);
    }

    if (ticket.status === 'TRANSFER_PENDING' || ticket.activeTransferOffer) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TRANSFER_ALREADY_PENDING);
    }

    if (ticket.status !== 'VALID' && ticket.status !== 'TRANSFER_PENDING') {
      if (!reasons.includes(TICKET_TRANSFER_BLOCK_REASON.TICKET_NOT_VALID_STATUS)) {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_NOT_VALID_STATUS);
      }
    }

    if (ticket.event.status === 'CANCELLED') {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.EVENT_CANCELLED);
    }

    const now = new Date();
    if (ticket.occurrence) {
      if (ticket.occurrence.status === 'CANCELLED') {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.OCCURRENCE_CLOSED);
      }
      const occEnd = ticket.occurrence.endAt ?? ticket.occurrence.startAt;
      if (occEnd < now) {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED);
      }
    } else {
      const eventEnd = ticket.event.endAt ?? ticket.event.startAt;
      if (eventEnd < now) {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED);
      }
    }

    return {
      transferable: reasons.length === 0,
      reasons,
    };
  }

  async evaluateWithPendingDateChange(
    ticket: TicketWithRelations,
    userId: string,
  ): Promise<TicketTransferEligibility> {
    const base = this.evaluate(ticket, userId);
    if (!base.transferable) {
      return base;
    }

    const pendingDateChange = await this.prisma.ticketDateChangeRequest.findFirst({
      where: { ticketId: ticket.id, status: 'PENDING' },
      select: { id: true },
    });
    if (pendingDateChange) {
      return {
        transferable: false,
        reasons: [...base.reasons, TICKET_TRANSFER_BLOCK_REASON.DATE_CHANGE_PENDING],
      };
    }

    return base;
  }

  assertTransferable(eligibility: TicketTransferEligibility): void {
    if (eligibility.transferable) return;

    const primary = eligibility.reasons[0];
    const code = this.reasonToErrorCode(primary);
    const message = this.reasonToMessage(primary);

    if (primary === TICKET_TRANSFER_BLOCK_REASON.NOT_OWNER) {
      throw new ForbiddenException({ code, message });
    }

    throw new ConflictException({ code, message });
  }

  /** Accept path: ticket must be TRANSFER_PENDING and still transferable (not used/revoked/expired). */
  assertAcceptableSource(
    ticket: Pick<Ticket, 'status' | 'usedAt' | 'revokedAt'> & {
      event: { status: string; startAt: Date; endAt: Date | null };
      occurrence: Pick<EventOccurrence, 'startAt' | 'endAt' | 'status'> | null;
    },
  ): void {
    const reasons: TicketTransferBlockReason[] = [];

    if (ticket.status !== 'TRANSFER_PENDING') {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_NOT_VALID_STATUS);
    }

    if (ticket.usedAt) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_ALREADY_USED);
    }

    if (ticket.revokedAt) {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_REVOKED);
    }

    if (ticket.event.status === 'CANCELLED') {
      reasons.push(TICKET_TRANSFER_BLOCK_REASON.EVENT_CANCELLED);
    }

    const now = new Date();
    if (ticket.occurrence) {
      if (ticket.occurrence.status === 'CANCELLED') {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.OCCURRENCE_CLOSED);
      }
      const occEnd = ticket.occurrence.endAt ?? ticket.occurrence.startAt;
      if (occEnd < now) {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED);
      }
    } else {
      const eventEnd = ticket.event.endAt ?? ticket.event.startAt;
      if (eventEnd < now) {
        reasons.push(TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED);
      }
    }

    if (reasons.length > 0) {
      const primary = reasons[0];
      throw new ConflictException({
        code: this.reasonToErrorCode(primary),
        message: this.reasonToMessage(primary),
      });
    }
  }

  private reasonToErrorCode(reason: TicketTransferBlockReason): string {
    switch (reason) {
      case TICKET_TRANSFER_BLOCK_REASON.NOT_OWNER:
        return ErrorCode.NOT_TICKET_OWNER;
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_ALREADY_USED:
        return ErrorCode.TICKET_ALREADY_USED;
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_REVOKED:
        return ErrorCode.TICKET_REVOKED;
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED:
        return ErrorCode.TICKET_EXPIRED;
      case TICKET_TRANSFER_BLOCK_REASON.TRANSFER_ALREADY_PENDING:
        return ErrorCode.TRANSFER_ALREADY_PENDING;
      case TICKET_TRANSFER_BLOCK_REASON.EVENT_CANCELLED:
      case TICKET_TRANSFER_BLOCK_REASON.OCCURRENCE_CLOSED:
      case TICKET_TRANSFER_BLOCK_REASON.DATE_CHANGE_PENDING:
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_NOT_VALID_STATUS:
      default:
        return ErrorCode.TICKET_NOT_TRANSFERABLE;
    }
  }

  private reasonToMessage(reason: TicketTransferBlockReason): string {
    switch (reason) {
      case TICKET_TRANSFER_BLOCK_REASON.NOT_OWNER:
        return 'You are not the ticket owner';
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_ALREADY_USED:
        return 'Ticket has already been used';
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_REVOKED:
        return 'Ticket has been revoked';
      case TICKET_TRANSFER_BLOCK_REASON.TICKET_EXPIRED:
        return 'Ticket or event date has passed';
      case TICKET_TRANSFER_BLOCK_REASON.TRANSFER_ALREADY_PENDING:
        return 'An active transfer already exists for this ticket';
      case TICKET_TRANSFER_BLOCK_REASON.EVENT_CANCELLED:
        return 'Event has been cancelled';
      case TICKET_TRANSFER_BLOCK_REASON.OCCURRENCE_CLOSED:
        return 'Event occurrence is not available';
      case TICKET_TRANSFER_BLOCK_REASON.DATE_CHANGE_PENDING:
        return 'A date change request is pending for this ticket';
      default:
        return 'Ticket is not transferable';
    }
  }
}
