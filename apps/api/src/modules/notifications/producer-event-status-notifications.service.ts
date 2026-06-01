import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  readPortalPreferences,
  shouldSendEmailForProducerEventStatus,
  shouldSendPushForKind,
} from '../me/user-portal-preferences.util';
import { getAppUrl, getDefaultSupportEmail } from '../../email/templates/email-template.util';
import { UserNotificationsService } from './user-notifications.service';

type EventRecipientContext = {
  id: string;
  title: string;
  producerProfileId: string | null;
  producerId: string;
};

@Injectable()
export class ProducerEventStatusNotificationsService {
  private readonly logger = new Logger(ProducerEventStatusNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  /** Fire-and-forget: no debe fallar la moderación admin. */
  notifyApproved(tenantId: string, event: EventRecipientContext): void {
    void this.dispatch(tenantId, event, 'APPROVED').catch((err) => {
      this.logger.error(`notifyApproved failed event=${event.id}`, err);
    });
  }

  notifyRejected(
    tenantId: string,
    event: EventRecipientContext,
    reason: string,
  ): void {
    void this.dispatch(tenantId, event, 'REJECTED', reason.trim() || undefined).catch(
      (err) => {
        this.logger.error(`notifyRejected failed event=${event.id}`, err);
      },
    );
  }

  private async dispatch(
    tenantId: string,
    event: EventRecipientContext,
    status: 'APPROVED' | 'REJECTED',
    reason?: string,
  ): Promise<void> {
    const recipientIds = await this.resolveRecipientUserIds(tenantId, event);
    if (recipientIds.length === 0) {
      this.logger.warn(`No producer recipients for event=${event.id}`);
      return;
    }

    const appUrl = getAppUrl();
    const href = `/producer/events/${event.id}`;
    const referenceKey = `producer-event-status:${event.id}:${status}`;

    const eventDetails =
      status === 'APPROVED'
        ? await this.prisma.event.findFirst({
            where: { id: event.id, tenantId },
            select: { startAt: true, venueName: true },
          })
        : null;
    const kind =
      status === 'APPROVED'
        ? NotificationKind.EVENT_APPROVED_BY_ADMIN
        : NotificationKind.EVENT_REJECTED_BY_ADMIN;

    const title =
      status === 'APPROVED'
        ? 'Tu evento fue aprobado — Yo Te Invito'
        : 'Tu evento necesita revisión — Yo Te Invito';

    const body =
      status === 'APPROVED'
        ? `El evento «${event.title}» fue aprobado por administración y ya puede mostrarse públicamente según su configuración.`
        : reason
          ? `El evento «${event.title}» fue rechazado por administración. Motivo: ${reason}`
          : `El evento «${event.title}» fue rechazado por administración. Revisá la información cargada antes de volver a enviarlo.`;

    for (const userId of recipientIds) {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, tenantId, deletedAt: null },
        select: { email: true, preferences: true, firstName: true, lastName: true },
      });
      if (!user) continue;

      const prefs = readPortalPreferences(userId, user.preferences);
      const sendEmail =
        shouldSendEmailForProducerEventStatus(prefs) && Boolean(user.email?.trim());
      const sendPush = shouldSendPushForKind(prefs, kind);

      const producerName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || 'Productor/a';

      const eventDate = eventDetails?.startAt
        ? eventDetails.startAt.toLocaleDateString('es-AR', { dateStyle: 'medium' })
        : undefined;
      const eventTime = eventDetails?.startAt
        ? eventDetails.startAt.toLocaleTimeString('es-AR', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined;

      await this.notifications.deliver({
        tenantId,
        userId,
        userEmail: user.email,
        kind,
        referenceKey,
        title,
        body,
        href,
        sendInApp: true,
        sendEmail,
        sendPush,
        preferences: prefs,
        ...(status === 'APPROVED' && sendEmail
          ? {
              emailTemplateId: 'PRODUCER_EVENT_APPROVED' as const,
              emailTemplateVariables: {
                producerName,
                eventTitle: event.title,
                eventUrl: `${appUrl}${href}`,
                dashboardUrl: `${appUrl}/producer`,
                supportEmail: getDefaultSupportEmail(),
                ...(eventDate ? { eventDate } : {}),
                ...(eventTime ? { eventTime } : {}),
                ...(eventDetails?.venueName ? { venueName: eventDetails.venueName } : {}),
              },
            }
          : {}),
        ...(status === 'REJECTED' && sendEmail
          ? {
              emailTemplateId: 'PRODUCER_EVENT_REJECTED' as const,
              emailTemplateVariables: {
                producerName,
                eventTitle: event.title,
                rejectionReason: reason ?? '',
                eventEditUrl: `${appUrl}${href}/edit`,
                dashboardUrl: `${appUrl}/producer`,
                supportEmail: getDefaultSupportEmail(),
              },
            }
          : {}),
      });
    }
  }

  private async resolveRecipientUserIds(
    tenantId: string,
    event: EventRecipientContext,
  ): Promise<string[]> {
    const ids = new Set<string>();

    if (event.producerProfileId) {
      const [memberships, profile] = await Promise.all([
        this.prisma.userProducerMembership.findMany({
          where: {
            tenantId,
            profileId: event.producerProfileId,
            status: 'ACTIVE',
          },
          select: { userId: true },
        }),
        this.prisma.producerProfile.findFirst({
          where: { id: event.producerProfileId, tenantId },
          select: { createdByUserId: true },
        }),
      ]);
      for (const m of memberships) ids.add(m.userId);
      if (profile?.createdByUserId) ids.add(profile.createdByUserId);
    }

    if (ids.size === 0 && event.producerId) {
      ids.add(event.producerId);
    }

    return [...ids];
  }
}
