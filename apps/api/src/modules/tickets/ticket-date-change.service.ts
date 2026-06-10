import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import {
  ErrorCode,
  type CreateTicketDateChangeRequestBody,
  type ProducerTicketDateChangeListItem,
  type ProducerTicketDateChangeListQuery,
  type RejectTicketDateChangeBody,
  type TicketDateChangeEligibility,
  type TicketDateChangeHistoryItem,
  type TicketDateChangeRequestResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TicketDateChangeEligibilityService } from './ticket-date-change-eligibility.service';
import { TicketDateChangeNotificationsService } from './ticket-date-change-notifications.service';

@Injectable()
export class TicketDateChangeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eligibility: TicketDateChangeEligibilityService,
    private readonly audit: AuditService,
    private readonly notifications: TicketDateChangeNotificationsService,
  ) {}

  private mapRequest(row: {
    id: string;
    ticketId: string;
    status: string;
    fromOccurrenceId: string;
    toOccurrenceId: string;
    message: string | null;
    rejectReason: string | null;
    reviewedAt: Date | null;
    appliedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    fromOccurrence: { startAt: Date };
    toOccurrence: { startAt: Date };
  }): TicketDateChangeRequestResponse {
    return {
      id: row.id,
      ticketId: row.ticketId,
      status: row.status as TicketDateChangeRequestResponse['status'],
      fromOccurrenceId: row.fromOccurrenceId,
      toOccurrenceId: row.toOccurrenceId,
      fromOccurrenceStartAt: row.fromOccurrence.startAt.toISOString(),
      toOccurrenceStartAt: row.toOccurrence.startAt.toISOString(),
      message: row.message,
      rejectReason: row.rejectReason,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      appliedAt: row.appliedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private async requireUserEmail(tenantId: string, userId: string): Promise<string> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'User not found' });
    }
    return user.email;
  }

  async getOptions(
    tenantId: string,
    userId: string,
    ticketId: string,
  ): Promise<TicketDateChangeEligibility> {
    const userEmail = await this.requireUserEmail(tenantId, userId);
    const ticket = await this.eligibility.loadTicketForEligibility(tenantId, ticketId);
    if (!ticket) {
      return {
        canRequest: false,
        reasons: ['TICKET_NOT_FOUND'],
        currentOccurrenceId: null,
        currentOccurrenceStartAt: null,
        availableOccurrences: [],
        windowHours: 24,
      };
    }
    return this.eligibility.evaluate({ ticket, userId, userEmail });
  }

  async createRequest(
    tenantId: string,
    userId: string,
    ticketId: string,
    body: CreateTicketDateChangeRequestBody,
  ): Promise<TicketDateChangeRequestResponse & { autoApproved?: boolean }> {
    const userEmail = await this.requireUserEmail(tenantId, userId);
    const ticket = await this.eligibility.loadTicketForEligibility(tenantId, ticketId);
    if (!ticket) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    const evaluation = await this.eligibility.evaluate({
      ticket,
      userId,
      userEmail,
      toOccurrenceId: body.toOccurrenceId,
    });

    if (!evaluation.canRequest) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket is not eligible for date change',
        reasons: evaluation.reasons,
      });
    }

    const fromOccurrenceId =
      ticket.occurrenceId ?? ticket.ticketType?.occurrenceId ?? null;
    if (!fromOccurrenceId || !ticket.ticketType) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket has no occurrence',
      });
    }

    let destType = await this.eligibility.findCompatibleTicketType(
      ticket.eventId,
      tenantId,
      body.toOccurrenceId,
      ticket.ticketType,
    );

    if (!destType && evaluation.requiresApproval) {
      destType = await this.prisma.ticketType.findFirst({
        where: {
          eventId: ticket.eventId,
          tenantId,
          occurrenceId: body.toOccurrenceId,
          status: 'ACTIVE',
          deletedAt: null,
          name: ticket.ticketType.name,
          capacityAvailable: { gte: 1 },
        },
      });
    }

    if (!destType) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No ticket type available on destination date',
      });
    }

    const autoApprove = this.eligibility.canAutoApprove(evaluation) && !!destType;
    const now = new Date();

    const request = await this.prisma.$transaction(async (tx) => {
      const created = await tx.ticketDateChangeRequest.create({
        data: {
          tenantId,
          ticketId,
          requestedByUserId: userId,
          fromOccurrenceId,
          toOccurrenceId: body.toOccurrenceId,
          fromTicketTypeId: ticket.ticketTypeId,
          toTicketTypeId: destType?.id ?? null,
          status: autoApprove ? 'APPROVED' : 'PENDING',
          message: body.message?.trim() || null,
          reviewedAt: autoApprove ? now : null,
          reviewedByUserId: autoApprove ? userId : null,
        },
        include: {
          fromOccurrence: { select: { startAt: true } },
          toOccurrence: { select: { startAt: true } },
          ticket: {
            select: {
              event: { select: { title: true, producerProfileId: true } },
              ticketType: { select: { name: true } },
            },
          },
        },
      });

      if (autoApprove && destType) {
        await this.applyInTransaction(tx, created.id, userId, 'USER');
      }

      return created;
    });

    const refreshed = await this.prisma.ticketDateChangeRequest.findUniqueOrThrow({
      where: { id: request.id },
      include: {
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: 'USER',
      action: AuditAction.TICKET_DATE_CHANGE_REQUESTED,
      entityType: 'TicketDateChangeRequest',
      entityId: refreshed.id,
      after: { status: refreshed.status, toOccurrenceId: body.toOccurrenceId },
    });

    if (autoApprove) {
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: 'USER',
        action: AuditAction.TICKET_DATE_CHANGE_APPROVED,
        entityType: 'TicketDateChangeRequest',
        entityId: refreshed.id,
      });
      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: 'SYSTEM',
        action: AuditAction.TICKET_DATE_CHANGE_APPLIED,
        entityType: 'Ticket',
        entityId: ticketId,
        after: { occurrenceId: body.toOccurrenceId },
      });
      void this.notifications.onApplied(tenantId, userId, refreshed.id).catch(() => undefined);
    } else {
      void this.notifications.onPendingProducer(tenantId, refreshed.id).catch(() => undefined);
      void this.notifications.onRequested(tenantId, userId, refreshed.id).catch(() => undefined);
    }

    return { ...this.mapRequest(refreshed), autoApproved: autoApprove };
  }

  async applyInTransaction(
    tx: Prisma.TransactionClient,
    requestId: string,
    actorId: string,
    actorRole: string,
  ): Promise<void> {
    const request = await tx.ticketDateChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        ticket: {
          include: {
            ticketType: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Date change request not found',
      });
    }

    if (request.status === 'APPLIED') {
      return;
    }

    if (request.status !== 'APPROVED' && request.status !== 'PENDING') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Request cannot be applied in current status',
      });
    }

    const ticket = request.ticket;
    if (ticket.status !== 'VALID' || ticket.usedAt || ticket.revokedAt) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket is no longer valid for date change',
      });
    }

    const toTypeId = request.toTicketTypeId;
    if (!toTypeId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No compatible destination ticket type',
      });
    }

    const dec = await tx.ticketType.updateMany({
      where: { id: toTypeId, capacityAvailable: { gte: 1 } },
      data: { capacityAvailable: { decrement: 1 } },
    });
    if (dec.count === 0) {
      throw new BadRequestException({
        code: ErrorCode.EVENT_CAPACITY_EXCEEDED,
        message: 'Destination date is sold out',
      });
    }

    if (request.fromTicketTypeId) {
      await tx.ticketType.update({
        where: { id: request.fromTicketTypeId },
        data: { capacityAvailable: { increment: 1 } },
      });
    }

    await tx.ticket.update({
      where: { id: request.ticketId },
      data: {
        occurrenceId: request.toOccurrenceId,
        ticketTypeId: toTypeId,
      },
    });

    const now = new Date();
    await tx.ticketDateChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPLIED',
        appliedAt: now,
        reviewedAt: request.reviewedAt ?? now,
        reviewedByUserId: request.reviewedByUserId ?? actorId,
      },
    });
  }

  async applyRequest(
    tenantId: string,
    requestId: string,
    actorId: string,
    actorRole: string,
  ): Promise<TicketDateChangeRequestResponse> {
    await this.prisma.$transaction(async (tx) => {
      const req = await tx.ticketDateChangeRequest.findFirst({
        where: { id: requestId, tenantId },
      });
      if (!req) {
        throw new NotFoundException({
          code: ErrorCode.NOT_FOUND,
          message: 'Date change request not found',
        });
      }
      if (req.status === 'APPLIED') return;
      if (req.status === 'PENDING') {
        await tx.ticketDateChangeRequest.update({
          where: { id: requestId },
          data: { status: 'APPROVED', reviewedAt: new Date(), reviewedByUserId: actorId },
        });
      }
      await this.applyInTransaction(tx, requestId, actorId, actorRole);
    });

    const row = await this.prisma.ticketDateChangeRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId,
      actorRole,
      action: AuditAction.TICKET_DATE_CHANGE_APPLIED,
      entityType: 'Ticket',
      entityId: row.ticketId,
      after: { occurrenceId: row.toOccurrenceId },
    });

    return this.mapRequest(row);
  }

  async listHistoryForTicket(
    tenantId: string,
    userId: string,
    ticketId: string,
  ): Promise<TicketDateChangeHistoryItem[]> {
    const userEmail = await this.requireUserEmail(tenantId, userId);
    const ticket = await this.eligibility.loadTicketForEligibility(tenantId, ticketId);
    if (!ticket || !this.eligibility.isOwner(ticket, userId, userEmail)) {
      throw new NotFoundException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }

    const rows = await this.prisma.ticketDateChangeRequest.findMany({
      where: { tenantId, ticketId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      status: r.status as TicketDateChangeHistoryItem['status'],
      fromOccurrenceId: r.fromOccurrenceId,
      toOccurrenceId: r.toOccurrenceId,
      fromOccurrenceStartAt: r.fromOccurrence.startAt.toISOString(),
      toOccurrenceStartAt: r.toOccurrence.startAt.toISOString(),
      message: r.message,
      rejectReason: r.rejectReason,
      reviewedAt: r.reviewedAt?.toISOString() ?? null,
      appliedAt: r.appliedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async listForProducer(
    tenantId: string,
    eventId: string,
    query: ProducerTicketDateChangeListQuery,
  ): Promise<ProducerTicketDateChangeListItem[]> {
    const where: Prisma.TicketDateChangeRequestWhereInput = {
      tenantId,
      ticket: { eventId },
      ...(query.status ? { status: query.status } : {}),
    };

    const rows = await this.prisma.ticketDateChangeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
        requestedBy: { select: { firstName: true, lastName: true, email: true } },
        ticket: { include: { ticketType: { select: { name: true } } } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      ticketId: r.ticketId,
      status: r.status as ProducerTicketDateChangeListItem['status'],
      buyerName: `${r.requestedBy.firstName} ${r.requestedBy.lastName}`.trim() || null,
      buyerEmail: r.requestedBy.email,
      ticketTypeName: r.ticket.ticketType?.name ?? null,
      fromOccurrenceStartAt: r.fromOccurrence.startAt.toISOString(),
      toOccurrenceStartAt: r.toOccurrence.startAt.toISOString(),
      message: r.message,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async approve(
    tenantId: string,
    producerUserId: string,
    producerRole: string,
    requestId: string,
  ): Promise<TicketDateChangeRequestResponse> {
    const request = await this.prisma.ticketDateChangeRequest.findFirst({
      where: { id: requestId, tenantId, status: 'PENDING' },
      include: {
        ticket: { select: { eventId: true, id: true } },
        requestedBy: { select: { id: true, email: true } },
      },
    });
    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Pending request not found',
      });
    }

    const ticket = await this.eligibility.loadTicketForEligibility(tenantId, request.ticketId);
    if (!ticket) {
      throw new BadRequestException({
        code: ErrorCode.TICKET_NOT_FOUND,
        message: 'Ticket not found',
      });
    }
    const evaluation = await this.eligibility.evaluate({
      ticket,
      userId: request.requestedBy.id,
      userEmail: request.requestedBy.email,
      toOccurrenceId: request.toOccurrenceId,
      excludeRequestId: requestId,
    });
    if (!evaluation.canRequest && !evaluation.requiresApproval) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Ticket is no longer eligible for this date change',
        reasons: evaluation.reasons,
      });
    }

    const now = new Date();
    await this.prisma.ticketDateChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        reviewedByUserId: producerUserId,
        reviewedAt: now,
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: producerUserId,
      actorRole: producerRole,
      action: AuditAction.TICKET_DATE_CHANGE_APPROVED,
      entityType: 'TicketDateChangeRequest',
      entityId: requestId,
    });

    const applied = await this.applyRequest(tenantId, requestId, producerUserId, producerRole);
    void this.notifications.onApproved(tenantId, request.requestedByUserId, requestId).catch(
      () => undefined,
    );
    return applied;
  }

  async reject(
    tenantId: string,
    producerUserId: string,
    producerRole: string,
    requestId: string,
    body: RejectTicketDateChangeBody,
  ): Promise<TicketDateChangeRequestResponse> {
    const request = await this.prisma.ticketDateChangeRequest.findFirst({
      where: { id: requestId, tenantId, status: 'PENDING' },
    });
    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Pending request not found',
      });
    }

    const now = new Date();
    const row = await this.prisma.ticketDateChangeRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        reviewedByUserId: producerUserId,
        reviewedAt: now,
        rejectReason: body.reason?.trim() || null,
      },
      include: {
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
      },
    });

    await this.audit.logAction({
      tenantId,
      actorId: producerUserId,
      actorRole: producerRole,
      action: AuditAction.TICKET_DATE_CHANGE_REJECTED,
      entityType: 'TicketDateChangeRequest',
      entityId: requestId,
      metadata: { reason: body.reason },
    });

    void this.notifications.onRejected(tenantId, request.requestedByUserId, requestId).catch(
      () => undefined,
    );

    return this.mapRequest(row);
  }

  async assertProducerRequestAccess(
    tenantId: string,
    userId: string,
    userRole: string,
    requestId: string,
  ): Promise<{ eventId: string }> {
    const request = await this.prisma.ticketDateChangeRequest.findFirst({
      where: { id: requestId, tenantId },
      include: { ticket: { select: { eventId: true, event: { select: { producerProfileId: true, producerId: true } } } } },
    });
    if (!request) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Request not found',
      });
    }
    if (userRole === 'ADMIN') {
      return { eventId: request.ticket.eventId };
    }
    const membership = await this.prisma.userProducerMembership.findFirst({
      where: {
        userId,
        tenantId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      select: { profileId: true },
    });
    const event = request.ticket.event;
    const allowed =
      membership &&
      (event.producerProfileId === membership.profileId ||
        event.producerId === userId);
    if (!allowed) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Not allowed to manage this event',
      });
    }
    return { eventId: request.ticket.eventId };
  }
}
