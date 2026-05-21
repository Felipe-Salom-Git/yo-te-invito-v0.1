import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isEventPubliclyVisible } from '../../common/utils/event-public-visibility.util';
import { getContentDetailPath } from '../me/user-portal-links.util';
import { readPortalPreferences } from '../me/user-portal-preferences.util';
import { UserNotificationsService } from './user-notifications.service';
import {
  categoryLabel,
  cityMatchesPreferences,
  interestMatchReason,
  isHotelCategory,
  shouldNotifyInterestMatch,
} from './smart-alerts-matching.util';

const CONTENT_ALERT_KINDS: NotificationKind[] = [
  NotificationKind.FOLLOWED_PRODUCER_NEW_EVENT,
  NotificationKind.FAVORITE_INTEREST_NEW_CONTENT,
];

export type PublicationAlertsSummary = {
  skipped?: string;
  producer: { attempted: number; delivered: number };
  interest: { attempted: number; delivered: number; throttled: number };
};

type PublishedEventRow = {
  id: string;
  tenantId: string;
  title: string;
  city: string | null;
  category: string | null;
  subcategoryId: string | null;
  startAt: Date;
  producerId: string;
  producerProfileId: string | null;
  producerProfile: { id: string; displayName: string } | null;
};

@Injectable()
export class SmartAlertsPreparedService {
  private readonly logger = new Logger(SmartAlertsPreparedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  private maxAlertsPerUserPerHour(): number {
    const n = Number(process.env.SMART_ALERTS_MAX_PER_USER_HOUR ?? 5);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 5;
  }

  private async isContentAlertThrottled(userId: string): Promise<boolean> {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const count = await this.prisma.notificationDeliveryLog.count({
      where: {
        userId,
        kind: { in: CONTENT_ALERT_KINDS },
        sentAt: { gte: since },
      },
    });
    return count >= this.maxAlertsPerUserPerHour();
  }

  private async loadPublishedEvent(eventId: string): Promise<PublishedEventRow | null> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, deletedAt: null, status: 'APPROVED' },
      select: {
        id: true,
        tenantId: true,
        title: true,
        city: true,
        category: true,
        subcategoryId: true,
        startAt: true,
        producerId: true,
        producerProfileId: true,
        producerProfile: { select: { id: true, displayName: true } },
      },
    });
    return event;
  }

  private async resolveProducerProfileId(
    event: PublishedEventRow,
  ): Promise<{ producerProfileId: string | null; producerName: string }> {
    if (event.producerProfileId) {
      return {
        producerProfileId: event.producerProfileId,
        producerName: event.producerProfile?.displayName?.trim() || 'Una productora',
      };
    }
    const profile = await this.prisma.producerProfile.findFirst({
      where: {
        tenantId: event.tenantId,
        createdByUserId: event.producerId,
        status: 'ACTIVE',
      },
      select: { id: true, displayName: true },
    });
    if (!profile) {
      return { producerProfileId: null, producerName: 'Una productora' };
    }
    return {
      producerProfileId: profile.id,
      producerName: profile.displayName?.trim() || 'Una productora',
    };
  }

  /**
   * Punto único: alertas al publicar/aprobar un evento (una vez por transición a APPROVED).
   */
  async dispatchPublicationAlerts(
    tenantId: string,
    eventId: string,
  ): Promise<PublicationAlertsSummary> {
    const empty = {
      producer: { attempted: 0, delivered: 0 },
      interest: { attempted: 0, delivered: 0, throttled: 0 },
    };

    const event = await this.loadPublishedEvent(eventId);
    if (!event || event.tenantId !== tenantId) {
      return { ...empty, skipped: 'not_found_or_not_approved' };
    }

    if (isHotelCategory(event.category)) {
      return { ...empty, skipped: 'hotel_category' };
    }

    if (!isEventPubliclyVisible(event.startAt, event.category)) {
      return { ...empty, skipped: 'not_publicly_visible' };
    }

    const producer = await this.notifyFollowersOfProducerEvent(event);
    const interest = await this.notifyUsersForNewPublishedContent(event);
    return { producer, interest };
  }

  async notifyFollowersOfProducerEvent(
    event: PublishedEventRow,
  ): Promise<{ attempted: number; delivered: number }> {
    const { producerProfileId, producerName } = await this.resolveProducerProfileId(event);
    if (!producerProfileId) {
      return { attempted: 0, delivered: 0 };
    }
    const href = getContentDetailPath(event.category, event.id);

    const follows = await this.prisma.userProducerFollow.findMany({
      where: { tenantId: event.tenantId, producerProfileId },
      include: {
        user: {
          select: { id: true, tenantId: true, email: true, preferences: true, status: true },
        },
      },
    });

    let delivered = 0;
    for (const row of follows) {
      if (row.user.status !== 'ACTIVE') continue;
      const prefs = readPortalPreferences(row.user.id, row.user.preferences);
      if (!prefs.notifyFollowedProducers) continue;
      if (await this.isContentAlertThrottled(row.user.id)) continue;

      const result = await this.notifications.deliver({
        tenantId: row.user.tenantId,
        userId: row.user.id,
        userEmail: row.user.email,
        kind: NotificationKind.FOLLOWED_PRODUCER_NEW_EVENT,
        referenceKey: `publish:producer:${event.id}`,
        title: 'Nueva publicación de una productora que seguís',
        body: `${producerName} publicó ${event.title}`,
        href,
        sendInApp: prefs.webNotificationsEnabled,
        sendEmail: false,
        preferences: prefs,
      });
      if (result.inApp || result.email || result.push) delivered += 1;
    }

    if (follows.length > 0) {
      this.logger.debug(
        `notifyFollowersOfProducerEvent event=${event.id} followers=${follows.length} delivered=${delivered}`,
      );
    }
    return { attempted: follows.length, delivered };
  }

  async notifyUsersForNewPublishedContent(
    event: PublishedEventRow,
  ): Promise<{ attempted: number; delivered: number; throttled: number }> {
    const { producerProfileId } = await this.resolveProducerProfileId(event);
    const followerIds = producerProfileId
      ? new Set(
          (
            await this.prisma.userProducerFollow.findMany({
              where: { tenantId: event.tenantId, producerProfileId },
              select: { userId: true },
            })
          ).map((f) => f.userId),
        )
      : new Set<string>();

    const users = await this.prisma.user.findMany({
      where: { tenantId: event.tenantId, deletedAt: null, status: 'ACTIVE' },
      select: { id: true, tenantId: true, email: true, preferences: true },
      take: 5000,
    });

    const href = getContentDetailPath(event.category, event.id);
    const label = categoryLabel(event.category);
    let attempted = 0;
    let delivered = 0;
    let throttled = 0;

    for (const user of users) {
      if (followerIds.has(user.id)) continue;

      const prefs = readPortalPreferences(user.id, user.preferences);
      if (!cityMatchesPreferences(event.city, prefs)) continue;

      const match = interestMatchReason(event.category, event.subcategoryId, prefs);
      if (!match || !shouldNotifyInterestMatch(event.category, event.subcategoryId, prefs)) {
        continue;
      }

      attempted += 1;
      if (await this.isContentAlertThrottled(user.id)) {
        throttled += 1;
        continue;
      }

      const result = await this.notifications.deliver({
        tenantId: user.tenantId,
        userId: user.id,
        userEmail: user.email,
        kind: NotificationKind.FAVORITE_INTEREST_NEW_CONTENT,
        referenceKey: `publish:interest:${event.id}`,
        title: 'Nuevo recomendado para vos',
        body: `Hay una nueva propuesta en ${label} que coincide con tus intereses.`,
        href,
        sendInApp: prefs.webNotificationsEnabled,
        sendEmail: false,
        preferences: prefs,
      });
      if (result.inApp || result.email || result.push) delivered += 1;
    }

    if (attempted > 0) {
      this.logger.debug(
        `notifyUsersForNewPublishedContent event=${event.id} attempted=${attempted} delivered=${delivered} throttled=${throttled}`,
      );
    }
    return { attempted, delivered, throttled };
  }
}
