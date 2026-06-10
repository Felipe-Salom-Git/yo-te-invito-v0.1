import { Injectable } from '@nestjs/common';
import type { EventOccurrence, Ticket, TicketType } from '@prisma/client';
import {
  TICKET_DATE_CHANGE_BLOCK_REASON,
  TICKET_DATE_CHANGE_WINDOW_HOURS,
  type TicketDateChangeBlockReason,
  type TicketDateChangeEligibility,
  type TicketDateChangeOccurrenceOption,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

type TicketWithRelations = Ticket & {
  event: { id: string; deletedAt: Date | null; tenantId: string };
  ticketType: Pick<TicketType, 'id' | 'name' | 'price' | 'occurrenceId'> | null;
  occurrence: Pick<EventOccurrence, 'id' | 'startAt' | 'endAt' | 'status' | 'eventId'> | null;
  order: { buyerEmail: string; status: string; buyerUserId: string | null } | null;
  activeTransferOffer: { id: string } | null;
};

export type DateChangeEligibilityContext = {
  ticket: TicketWithRelations;
  userId: string;
  userEmail: string;
  toOccurrenceId?: string;
  /** Skip pending-request block when re-validating an existing request. */
  excludeRequestId?: string;
};

@Injectable()
export class TicketDateChangeEligibilityService {
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
        event: { select: { id: true, deletedAt: true, tenantId: true } },
        ticketType: {
          select: { id: true, name: true, price: true, occurrenceId: true },
        },
        occurrence: {
          select: { id: true, startAt: true, endAt: true, status: true, eventId: true },
        },
        order: { select: { buyerEmail: true, status: true, buyerUserId: true } },
        activeTransferOffer: { select: { id: true } },
      },
    });
  }

  isOwner(ticket: TicketWithRelations, userId: string, userEmail: string): boolean {
    if (ticket.ownerUserId) {
      return ticket.ownerUserId === userId;
    }
    if (ticket.order?.status === 'PAID') {
      return (
        ticket.order.buyerUserId === userId ||
        ticket.order.buyerEmail.toLowerCase() === userEmail.toLowerCase()
      );
    }
    return false;
  }

  private withinTimeWindow(occurrenceStartAt: Date): boolean {
    const deadline = new Date(
      Date.now() + TICKET_DATE_CHANGE_WINDOW_HOURS * 60 * 60 * 1000,
    );
    return occurrenceStartAt >= deadline;
  }

  private isExpired(occurrence: { startAt: Date; endAt: Date | null }): boolean {
    const end = occurrence.endAt ?? occurrence.startAt;
    return end < new Date();
  }

  async isMultiDateEvent(eventId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.eventOccurrence.count({
      where: { eventId, tenantId, status: 'ACTIVE' },
    });
    return count >= 2;
  }

  async findCompatibleTicketType(
    eventId: string,
    tenantId: string,
    toOccurrenceId: string,
    sourceType: Pick<TicketType, 'name' | 'price'>,
  ): Promise<(TicketType & { capacityAvailable: number }) | null> {
    const candidates = await this.prisma.ticketType.findMany({
      where: {
        eventId,
        tenantId,
        occurrenceId: toOccurrenceId,
        status: 'ACTIVE',
        deletedAt: null,
        name: sourceType.name,
      },
    });
    const samePrice = candidates.find(
      (c) => c.price.toString() === sourceType.price.toString(),
    );
    if (samePrice && samePrice.capacityAvailable > 0) {
      return samePrice;
    }
    return null;
  }

  async listDestinationOptions(
    eventId: string,
    tenantId: string,
    fromOccurrenceId: string,
    sourceType: Pick<TicketType, 'name' | 'price'> | null,
  ): Promise<TicketDateChangeOccurrenceOption[]> {
    if (!sourceType) return [];

    const occurrences = await this.prisma.eventOccurrence.findMany({
      where: {
        eventId,
        tenantId,
        status: 'ACTIVE',
        id: { not: fromOccurrenceId },
        startAt: { gte: new Date(Date.now() + TICKET_DATE_CHANGE_WINDOW_HOURS * 3600000) },
      },
      orderBy: { startAt: 'asc' },
    });

    const options: TicketDateChangeOccurrenceOption[] = [];
    for (const occ of occurrences) {
      if (!this.withinTimeWindow(occ.startAt)) continue;

      const match = await this.findCompatibleTicketType(
        eventId,
        tenantId,
        occ.id,
        sourceType,
      );
      if (!match) continue;

      options.push({
        occurrenceId: occ.id,
        startAt: occ.startAt.toISOString(),
        endAt: occ.endAt?.toISOString() ?? null,
        venueName: occ.venueName,
        ticketTypeId: match.id,
        ticketTypeName: match.name,
        price: match.price.toString(),
        capacityAvailable: match.capacityAvailable,
      });
    }
    return options;
  }

  async evaluate(ctx: DateChangeEligibilityContext): Promise<TicketDateChangeEligibility> {
    const { ticket, userId, userEmail, toOccurrenceId, excludeRequestId } = ctx;
    const reasons: TicketDateChangeBlockReason[] = [];

    if (!this.isOwner(ticket, userId, userEmail)) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.NOT_OWNER);
    }
    if (ticket.status === 'USED') {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_USED);
    }
    if (ticket.status === 'REVOKED') {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_REVOKED);
    }
    if (ticket.status === 'TRANSFER_PENDING' || ticket.activeTransferOffer) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.TRANSFER_PENDING);
    }
    if (ticket.status !== 'VALID' && reasons.length === 0) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_USED);
    }

    const multiDate = await this.isMultiDateEvent(ticket.eventId, ticket.event.tenantId);
    if (!multiDate) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.SINGLE_DATE_EVENT);
    }

    const fromOccurrenceId = ticket.occurrenceId ?? ticket.ticketType?.occurrenceId ?? null;
    if (!fromOccurrenceId || !ticket.occurrence) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.NO_OCCURRENCE);
    } else if (this.isExpired(ticket.occurrence)) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.TICKET_EXPIRED);
    } else if (!this.withinTimeWindow(ticket.occurrence.startAt)) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.OUTSIDE_TIME_WINDOW);
    }

    const pending = await this.prisma.ticketDateChangeRequest.findFirst({
      where: {
        ticketId: ticket.id,
        status: 'PENDING',
        ...(excludeRequestId ? { id: { not: excludeRequestId } } : {}),
      },
    });
    if (pending) {
      reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.PENDING_REQUEST_EXISTS);
    }

    let requiresApproval = false;
    let availableOccurrences: TicketDateChangeOccurrenceOption[] = [];

    if (ticket.ticketType && fromOccurrenceId && reasons.length === 0) {
      availableOccurrences = await this.listDestinationOptions(
        ticket.eventId,
        ticket.event.tenantId,
        fromOccurrenceId,
        ticket.ticketType,
      );

      if (toOccurrenceId) {
        if (toOccurrenceId === fromOccurrenceId) {
          reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.SAME_OCCURRENCE);
        } else {
          const dest = await this.prisma.eventOccurrence.findFirst({
            where: {
              id: toOccurrenceId,
              eventId: ticket.eventId,
              tenantId: ticket.event.tenantId,
            },
          });
          if (!dest) {
            reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_NOT_FOUND);
          } else if (dest.status !== 'ACTIVE') {
            reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_INACTIVE);
          } else if (!this.withinTimeWindow(dest.startAt)) {
            reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.OUTSIDE_TIME_WINDOW);
          } else {
            const compatible = await this.findCompatibleTicketType(
              ticket.eventId,
              ticket.event.tenantId,
              toOccurrenceId,
              ticket.ticketType,
            );
            if (!compatible) {
              const anyType = await this.prisma.ticketType.findFirst({
                where: {
                  eventId: ticket.eventId,
                  tenantId: ticket.event.tenantId,
                  occurrenceId: toOccurrenceId,
                  status: 'ACTIVE',
                  deletedAt: null,
                  name: ticket.ticketType.name,
                  capacityAvailable: { gte: 1 },
                },
              });
              if (anyType && anyType.price.toString() !== ticket.ticketType.price.toString()) {
                requiresApproval = true;
              } else {
                reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.NO_COMPATIBLE_TICKET_TYPE);
              }
            } else if (compatible.capacityAvailable < 1) {
              reasons.push(TICKET_DATE_CHANGE_BLOCK_REASON.OCCURRENCE_SOLD_OUT);
            }
          }
        }
      }
    }

    const uniqueReasons = [...new Set(reasons)];
    return {
      canRequest: uniqueReasons.length === 0,
      reasons: uniqueReasons,
      currentOccurrenceId: fromOccurrenceId,
      currentOccurrenceStartAt: ticket.occurrence?.startAt.toISOString() ?? null,
      availableOccurrences,
      requiresApproval,
      windowHours: TICKET_DATE_CHANGE_WINDOW_HOURS,
    };
  }

  canAutoApprove(eligibility: TicketDateChangeEligibility): boolean {
    return eligibility.canRequest && !eligibility.requiresApproval;
  }
}
