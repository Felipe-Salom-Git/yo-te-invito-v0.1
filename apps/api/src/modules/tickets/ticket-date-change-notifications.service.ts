import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { UserNotificationsService } from '../notifications/user-notifications.service';

@Injectable()
export class TicketDateChangeNotificationsService {
  private readonly logger = new Logger(TicketDateChangeNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  private async loadContext(requestId: string) {
    return this.prisma.ticketDateChangeRequest.findUnique({
      where: { id: requestId },
      include: {
        requestedBy: { select: { id: true, email: true, firstName: true } },
        ticket: {
          select: {
            eventId: true,
            event: {
              select: {
                title: true,
                producerProfileId: true,
                producerId: true,
              },
            },
            ticketType: { select: { name: true } },
          },
        },
        fromOccurrence: { select: { startAt: true } },
        toOccurrence: { select: { startAt: true } },
      },
    });
  }

  private formatDate(d: Date): string {
    return d.toLocaleString('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: 'America/Argentina/Buenos_Aires',
    });
  }

  async onRequested(tenantId: string, userId: string, requestId: string): Promise<void> {
    const ctx = await this.loadContext(requestId);
    if (!ctx) return;

    await this.notifications.deliver({
      tenantId,
      userId,
      userEmail: ctx.requestedBy.email,
      kind: NotificationKind.TICKET_DATE_CHANGE_REQUESTED,
      referenceKey: `ticket-date-change:${requestId}`,
      title: 'Cambio de fecha solicitado',
      body: `Tu solicitud para ${ctx.ticket.event.title} está pendiente de revisión.`,
      href: `/me/tickets/${ctx.ticketId}`,
      sendInApp: true,
      sendEmail: true,
      emailTemplateId: 'TICKET_DATE_CHANGE_REQUESTED',
      emailTemplateVariables: {
        userName: ctx.requestedBy.firstName,
        eventTitle: ctx.ticket.event.title,
        ticketName: ctx.ticket.ticketType?.name ?? 'Entrada',
        fromDate: this.formatDate(ctx.fromOccurrence.startAt),
        toDate: this.formatDate(ctx.toOccurrence.startAt),
        ticketsUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/me/tickets/${ctx.ticketId}`,
      },
    });
  }

  async onPendingProducer(tenantId: string, requestId: string): Promise<void> {
    const ctx = await this.loadContext(requestId);
    if (!ctx?.ticket.event.producerProfileId) return;

    const members = await this.prisma.userProducerMembership.findMany({
      where: {
        tenantId,
        profileId: ctx.ticket.event.producerProfileId,
        status: 'ACTIVE',
      },
      include: { user: { select: { id: true, email: true, firstName: true } } },
    });

    for (const m of members) {
      await this.notifications.deliver({
        tenantId,
        userId: m.user.id,
        userEmail: m.user.email,
        kind: NotificationKind.TICKET_DATE_CHANGE_PENDING_PRODUCER,
        referenceKey: `ticket-date-change-producer:${requestId}`,
        title: 'Cambio de fecha pendiente',
        body: `Hay una solicitud de cambio de fecha para ${ctx.ticket.event.title}.`,
        href: `/producer/events/${ctx.ticket.eventId}`,
        sendInApp: true,
        sendEmail: true,
        emailTemplateId: 'TICKET_DATE_CHANGE_PENDING_PRODUCER',
        emailTemplateVariables: {
          producerName: m.user.firstName,
          eventTitle: ctx.ticket.event.title,
          buyerName: ctx.requestedBy.firstName,
          fromDate: this.formatDate(ctx.fromOccurrence.startAt),
          toDate: this.formatDate(ctx.toOccurrence.startAt),
          eventUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/producer/events/${ctx.ticket.eventId}`,
        },
      });
    }
  }

  async onApproved(tenantId: string, userId: string, requestId: string): Promise<void> {
    const ctx = await this.loadContext(requestId);
    if (!ctx) return;

    await this.notifications.deliver({
      tenantId,
      userId,
      userEmail: ctx.requestedBy.email,
      kind: NotificationKind.TICKET_DATE_CHANGE_APPROVED,
      referenceKey: `ticket-date-change-approved:${requestId}`,
      title: 'Cambio de fecha aprobado',
      body: `Tu entrada para ${ctx.ticket.event.title} fue actualizada a la nueva fecha.`,
      href: `/me/tickets/${ctx.ticketId}`,
      sendInApp: true,
      sendEmail: true,
      emailTemplateId: 'TICKET_DATE_CHANGE_APPLIED',
      emailTemplateVariables: {
        userName: ctx.requestedBy.firstName,
        eventTitle: ctx.ticket.event.title,
        toDate: this.formatDate(ctx.toOccurrence.startAt),
        ticketsUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/me/tickets/${ctx.ticketId}`,
      },
    });
  }

  async onRejected(tenantId: string, userId: string, requestId: string): Promise<void> {
    const ctx = await this.loadContext(requestId);
    if (!ctx) return;

    await this.notifications.deliver({
      tenantId,
      userId,
      userEmail: ctx.requestedBy.email,
      kind: NotificationKind.TICKET_DATE_CHANGE_REJECTED,
      referenceKey: `ticket-date-change-rejected:${requestId}`,
      title: 'Cambio de fecha rechazado',
      body: `Tu solicitud para ${ctx.ticket.event.title} no fue aprobada.`,
      href: `/me/tickets/${ctx.ticketId}`,
      sendInApp: true,
      sendEmail: true,
      emailTemplateId: 'TICKET_DATE_CHANGE_REJECTED',
      emailTemplateVariables: {
        userName: ctx.requestedBy.firstName,
        eventTitle: ctx.ticket.event.title,
        rejectReason: ctx.rejectReason ?? 'Sin motivo indicado',
        ticketsUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/me/tickets/${ctx.ticketId}`,
      },
    });
  }

  async onApplied(tenantId: string, userId: string, requestId: string): Promise<void> {
    const ctx = await this.loadContext(requestId);
    if (!ctx) return;

    await this.notifications.deliver({
      tenantId,
      userId,
      userEmail: ctx.requestedBy.email,
      kind: NotificationKind.TICKET_DATE_CHANGE_APPLIED,
      referenceKey: `ticket-date-change-applied:${requestId}`,
      title: 'Fecha de entrada actualizada',
      body: `Tu entrada para ${ctx.ticket.event.title} ahora es el ${this.formatDate(ctx.toOccurrence.startAt)}.`,
      href: `/me/tickets/${ctx.ticketId}`,
      sendInApp: true,
      sendEmail: true,
      emailTemplateId: 'TICKET_DATE_CHANGE_APPLIED',
      emailTemplateVariables: {
        userName: ctx.requestedBy.firstName,
        eventTitle: ctx.ticket.event.title,
        toDate: this.formatDate(ctx.toOccurrence.startAt),
        ticketsUrl: `${process.env.APP_URL ?? 'http://localhost:3000'}/me/tickets/${ctx.ticketId}`,
      },
    });
  }
}
