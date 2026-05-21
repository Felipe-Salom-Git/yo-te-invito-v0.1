import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  isTicketReminderEnabled,
  readPortalPreferences,
} from '../me/user-portal-preferences.util';
import { UserNotificationsService } from './user-notifications.service';

function eventWindowBounds(now: Date): { from: Date; to: Date } {
  const hours = Number(process.env.NOTIFICATION_REMINDER_HOURS ?? 24);
  const tolerance = Number(process.env.NOTIFICATION_REMINDER_TOLERANCE_HOURS ?? 1);
  const from = new Date(now.getTime() + (hours - tolerance) * 60 * 60 * 1000);
  const to = new Date(now.getTime() + (hours + tolerance) * 60 * 60 * 1000);
  return { from, to };
}

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  @Cron(process.env.NODE_ENV === 'development' ? '*/10 * * * *' : '*/15 * * * *')
  async runScheduledNotifications() {
    if (process.env.NOTIFICATIONS_CRON_ENABLED === 'false') {
      return;
    }
    try {
      const ticket = await this.processTicketReminders();
      const fav = await this.processFavoriteEventsSoon();
      const exp = await this.processExpectedEventsSoon();
      const reviews = await this.processPendingReviewReminders();
      const total = ticket.sent + fav.sent + exp.sent + reviews.sent;
      if (total > 0) {
        this.logger.log(
          `Notifications sent: tickets=${ticket.sent} favorites=${fav.sent} expected=${exp.sent} reviews=${reviews.sent}`,
        );
      }
    } catch (err) {
      this.logger.error('Scheduled notifications failed', err);
    }
  }

  /** Manual trigger (smoke / admin tooling). */
  async runAllJobs(): Promise<{
    ticketReminders: { sent: number };
    favoriteSoon: { sent: number };
    expectedSoon: { sent: number };
    reviewPending: { sent: number };
  }> {
    const ticketReminders = await this.processTicketReminders();
    const favoriteSoon = await this.processFavoriteEventsSoon();
    const expectedSoon = await this.processExpectedEventsSoon();
    const reviewPending = await this.processPendingReviewReminders();
    return { ticketReminders, favoriteSoon, expectedSoon, reviewPending };
  }

  private async processTicketReminders(): Promise<{ sent: number }> {
    const now = new Date();
    const { from, to } = eventWindowBounds(now);
    let sent = 0;

    const tickets = await this.prisma.ticket.findMany({
      where: {
        status: 'VALID',
        ownerUserId: { not: null },
        event: {
          startAt: { gte: from, lte: to },
          deletedAt: null,
        },
      },
      include: {
        event: { select: { id: true, title: true, startAt: true, venueName: true } },
        ownerUser: {
          select: { id: true, tenantId: true, email: true, preferences: true },
        },
      },
    });

    for (const t of tickets) {
      const user = t.ownerUser;
      if (!user?.id) continue;
      const prefs = readPortalPreferences(user.id, user.preferences);
      if (!isTicketReminderEnabled(prefs, t.id)) continue;

      const startLabel = t.event.startAt.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const venue = t.event.venueName ? ` · ${t.event.venueName}` : '';
      const result = await this.notifications.deliver({
        tenantId: user.tenantId,
        userId: user.id,
        userEmail: user.email,
        kind: NotificationKind.TICKET_REMINDER_24H,
        referenceKey: `ticket:${t.id}`,
        title: `Recordatorio: ${t.event.title}`,
        body: `Tu evento comienza el ${startLabel}${venue}. Tené listo tu ticket con QR.`,
        href: `/me/tickets/${t.id}`,
        sendInApp: prefs.webNotificationsEnabled,
        sendEmail: prefs.emailNotificationsEnabled,
      });
      if (result.inApp || result.email || result.push) sent += 1;
    }

    return { sent };
  }

  private async processFavoriteEventsSoon(): Promise<{ sent: number }> {
    const now = new Date();
    const { from, to } = eventWindowBounds(now);
    let sent = 0;

    const favorites = await this.prisma.userFavorite.findMany({
      where: {
        entityType: 'event',
        webNotificationsEnabled: true,
      },
      include: {
        user: { select: { id: true, tenantId: true, email: true, preferences: true } },
      },
    });

    for (const fav of favorites) {
      const user = fav.user;
      const prefs = readPortalPreferences(user.id, user.preferences);
      if (!prefs.favoriteEntityNotificationsEnabled) continue;

      const event = await this.prisma.event.findFirst({
        where: {
          id: fav.entityId,
          deletedAt: null,
          startAt: { gte: from, lte: to },
        },
        select: { id: true, title: true, startAt: true },
      });
      if (!event) continue;

      const startLabel = event.startAt.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const result = await this.notifications.deliver({
        tenantId: user.tenantId,
        userId: user.id,
        userEmail: user.email,
        kind: NotificationKind.FAVORITE_EVENT_SOON,
        referenceKey: `favorite:${event.id}`,
        title: `Pronto: ${event.title}`,
        body: `Un evento de tus favoritos comienza el ${startLabel}.`,
        href: `/events/${event.id}`,
        sendInApp: fav.webNotificationsEnabled && prefs.webNotificationsEnabled,
        sendEmail: fav.emailNotificationsEnabled && prefs.emailNotificationsEnabled,
      });
      if (result.inApp || result.email || result.push) sent += 1;
    }

    return { sent };
  }

  private async processExpectedEventsSoon(): Promise<{ sent: number }> {
    const now = new Date();
    const { from, to } = eventWindowBounds(now);
    let sent = 0;

    const expected = await this.prisma.userExpectedEvent.findMany({
      where: { webNotificationsEnabled: true },
      include: {
        user: { select: { id: true, tenantId: true, email: true, preferences: true } },
        event: {
          select: { id: true, title: true, startAt: true, deletedAt: true },
        },
      },
    });

    for (const row of expected) {
      const user = row.user;
      const event = row.event;
      if (event.deletedAt) continue;
      if (event.startAt < from || event.startAt > to) continue;

      const prefs = readPortalPreferences(user.id, user.preferences);
      if (!prefs.expectedEventNotificationsEnabled) continue;

      const startLabel = event.startAt.toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const result = await this.notifications.deliver({
        tenantId: user.tenantId,
        userId: user.id,
        userEmail: user.email,
        kind: NotificationKind.EXPECTED_EVENT_SOON,
        referenceKey: `expected:${event.id}`,
        title: `Tu evento esperado: ${event.title}`,
        body: `Comienza el ${startLabel}. Revisá si ya hay entradas disponibles.`,
        href: `/events/${event.id}`,
        sendInApp: row.webNotificationsEnabled && prefs.webNotificationsEnabled,
        sendEmail: row.emailNotificationsEnabled && prefs.emailNotificationsEnabled,
      });
      if (result.inApp || result.email || result.push) sent += 1;
    }

    return { sent };
  }

  private async processPendingReviewReminders(): Promise<{ sent: number }> {
    let sent = 0;
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: {
        id: true,
        tenantId: true,
        email: true,
        preferences: true,
      },
      take: 500,
    });

    for (const user of users) {
      const prefs = readPortalPreferences(user.id, user.preferences);
      if (!prefs.notifyPendingReviews) continue;

      const tickets = await this.prisma.ticket.findMany({
        where: {
          event: { tenantId: user.tenantId },
          status: 'USED',
          ownerUserId: user.id,
        },
        include: {
          event: { select: { id: true, title: true, deletedAt: true } },
        },
        take: 50,
      });

      const reviewed = await this.prisma.review.findMany({
        where: { tenantId: user.tenantId, userId: user.id },
        select: { eventId: true },
      });
      const reviewedIds = new Set(reviewed.map((r) => r.eventId));

      const seen = new Set<string>();
      for (const t of tickets) {
        if (!t.event || t.event.deletedAt) continue;
        if (reviewedIds.has(t.eventId) || seen.has(t.eventId)) continue;
        seen.add(t.eventId);

        const result = await this.notifications.deliver({
          tenantId: user.tenantId,
          userId: user.id,
          userEmail: user.email,
          kind: NotificationKind.REVIEW_PENDING,
          referenceKey: `review-pending:${t.eventId}`,
          title: 'Tenés una experiencia para calificar',
          body: `Podés valorar «${t.event.title}».`,
          href: `/events/${t.event.id}`,
          sendInApp: prefs.webNotificationsEnabled,
          sendEmail: false,
          preferences: prefs,
        });
        if (result.inApp || result.email || result.push) sent += 1;
      }
    }

    return { sent };
  }
}
