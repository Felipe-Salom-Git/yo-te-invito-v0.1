import { Injectable, Logger } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  readPortalPreferences,
  shouldSendEmailForManagedReviews,
  shouldSendEmailForReviewEngagement,
  shouldSendPushForKind,
} from '../me/user-portal-preferences.util';
import {
  buildReviewEmailTemplateVariables,
  reviewEmailTemplateId,
  type ReviewEmailIds,
} from './review-email-template.util';
import { UserNotificationsService } from './user-notifications.service';

type ReviewEventContext = {
  id: string;
  title: string;
  category: string | null;
  producerProfileId: string | null;
  producerId: string;
};

function managedReviewsHref(category: string | null, eventId: string): string {
  if (category === 'gastro') return '/gastro/valoraciones';
  if (category === 'hotel') return '/hotel/valoraciones';
  const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : '';
  return `/producer/comments${q}`;
}

@Injectable()
export class ReviewNotificationsService {
  private readonly logger = new Logger(ReviewNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: UserNotificationsService,
  ) {}

  /** Nueva valoración en entidad gestionada (productor/gastro/hotel). */
  notifyReviewReceived(
    tenantId: string,
    reviewId: string,
    event: ReviewEventContext,
    reviewerUserId?: string | null,
  ): void {
    void this.dispatchToManagedRecipients(
      tenantId,
      event,
      [reviewerUserId].filter(Boolean) as string[],
      {
        kind: NotificationKind.REVIEW_RECEIVED,
        referenceKey: `review-received:${reviewId}`,
        title: 'Nueva valoración — Yo Te Invito',
        body: `Recibiste una valoración en «${event.title}».`,
        href: managedReviewsHref(event.category, event.id),
        sendEmail: true,
        sendPush: true,
        emailIds: { reviewId },
      },
    ).catch((err) => {
      this.logger.error(`notifyReviewReceived failed review=${reviewId}`, err);
    });
  }

  /** Respuesta oficial publicada (autor de la reseña). */
  notifyOfficialReply(
    tenantId: string,
    reviewId: string,
    event: ReviewEventContext,
    authorUserId: string,
  ): void {
    void this.deliverToUser(tenantId, authorUserId, {
      kind: NotificationKind.REVIEW_OFFICIAL_REPLY,
      referenceKey: `review-official-reply:${reviewId}`,
      title: 'Respondieron tu valoración — Yo Te Invito',
      body: `Hay una respuesta oficial en «${event.title}».`,
      href: `/me/activity?tab=reviews`,
      sendInApp: true,
      sendEmail: true,
      sendPush: true,
      emailPref: 'engagement',
      emailIds: { reviewId },
      event,
    }).catch((err) => {
      this.logger.error(`notifyOfficialReply failed review=${reviewId}`, err);
    });
  }

  /** Disputa registrada (equipo del portal gestionado). */
  notifyDisputeCreated(
    tenantId: string,
    disputeId: string,
    event: ReviewEventContext,
    excludeUserIds: string[] = [],
  ): void {
    void this.dispatchToManagedRecipients(tenantId, event, excludeUserIds, {
      kind: NotificationKind.REVIEW_DISPUTE_CREATED,
      referenceKey: `review-dispute-created:${disputeId}`,
      title: 'Solicitud de revisión enviada — Yo Te Invito',
      body: `Registramos tu solicitud de revisión sobre una valoración en «${event.title}».`,
      href: managedReviewsHref(event.category, event.id),
      sendEmail: true,
      sendPush: false,
      emailIds: { disputeId },
    }).catch((err) => {
      this.logger.error(`notifyDisputeCreated failed dispute=${disputeId}`, err);
    });
  }

  notifyDisputeAccepted(
    tenantId: string,
    disputeId: string,
    reviewId: string,
    event: ReviewEventContext,
    authorUserId: string | null,
  ): void {
    void this.dispatchToManagedRecipients(tenantId, event, authorUserId ? [authorUserId] : [], {
      kind: NotificationKind.REVIEW_DISPUTE_ACCEPTED,
      referenceKey: `review-dispute-accepted:${disputeId}`,
      title: 'Disputa aceptada — Yo Te Invito',
      body: `Administración aceptó la revisión de la valoración en «${event.title}». La reseña quedó oculta del listado público.`,
      href: managedReviewsHref(event.category, event.id),
      sendEmail: true,
      sendPush: true,
      emailIds: { disputeId, reviewId },
    }).catch((err) => {
      this.logger.error(`notifyDisputeAccepted failed dispute=${disputeId}`, err);
    });

    if (authorUserId) {
      void this.notifyReviewHidden(
        tenantId,
        reviewId,
        event,
        authorUserId,
        `dispute-accepted:${disputeId}`,
      );
    }
  }

  notifyDisputeRejected(
    tenantId: string,
    disputeId: string,
    event: ReviewEventContext,
    excludeUserIds: string[] = [],
  ): void {
    void this.dispatchToManagedRecipients(tenantId, event, excludeUserIds, {
      kind: NotificationKind.REVIEW_DISPUTE_REJECTED,
      referenceKey: `review-dispute-rejected:${disputeId}`,
      title: 'Disputa rechazada — Yo Te Invito',
      body: `Administración rechazó la solicitud sobre «${event.title}». La valoración sigue visible públicamente.`,
      href: managedReviewsHref(event.category, event.id),
      sendEmail: true,
      sendPush: false,
      emailIds: { disputeId },
    }).catch((err) => {
      this.logger.error(`notifyDisputeRejected failed dispute=${disputeId}`, err);
    });
  }

  notifyReviewHidden(
    tenantId: string,
    reviewId: string,
    event: ReviewEventContext,
    authorUserId: string,
    referenceSuffix = 'moderation',
  ): void {
    void this.deliverToUser(tenantId, authorUserId, {
      kind: NotificationKind.REVIEW_MODERATION_HIDDEN,
      referenceKey: `review-moderation-hidden:${reviewId}:${referenceSuffix}`,
      title: 'Tu valoración fue ocultada — Yo Te Invito',
      body: `Tu comentario en «${event.title}» ya no se muestra en el listado público.`,
      href: `/me/activity?tab=reviews`,
      sendInApp: true,
      sendEmail: true,
      sendPush: false,
      emailPref: 'engagement',
      emailIds: { reviewId },
      event,
    }).catch((err) => {
      this.logger.error(`notifyReviewHidden failed review=${reviewId}`, err);
    });
  }

  notifyReviewRestored(
    tenantId: string,
    reviewId: string,
    event: ReviewEventContext,
    authorUserId: string,
  ): void {
    void this.deliverToUser(tenantId, authorUserId, {
      kind: NotificationKind.REVIEW_MODERATION_RESTORED,
      referenceKey: `review-moderation-restored:${reviewId}`,
      title: 'Tu valoración fue restaurada — Yo Te Invito',
      body: `Tu comentario en «${event.title}» volvió a mostrarse públicamente.`,
      href: `/me/activity?tab=reviews`,
      sendInApp: true,
      sendEmail: true,
      sendPush: false,
      emailPref: 'engagement',
      emailIds: { reviewId },
      event,
    }).catch((err) => {
      this.logger.error(`notifyReviewRestored failed review=${reviewId}`, err);
    });
  }

  private async dispatchToManagedRecipients(
    tenantId: string,
    event: ReviewEventContext,
    excludeUserIds: string[],
    payload: {
      kind: NotificationKind;
      referenceKey: string;
      title: string;
      body: string;
      href: string;
      sendEmail: boolean;
      sendPush: boolean;
      emailIds: ReviewEmailIds;
    },
  ): Promise<void> {
    const exclude = new Set(excludeUserIds);
    const recipientIds = await this.resolveManagedRecipientUserIds(tenantId, event);
    for (const userId of recipientIds) {
      if (exclude.has(userId)) continue;
      await this.deliverToUser(tenantId, userId, {
        ...payload,
        sendInApp: true,
        sendEmail: payload.sendEmail,
        sendPush: payload.sendPush,
        emailPref: 'managed',
        event,
      });
    }
  }

  private async deliverToUser(
    tenantId: string,
    userId: string,
    input: {
      kind: NotificationKind;
      referenceKey: string;
      title: string;
      body: string;
      href: string;
      sendInApp: boolean;
      sendEmail: boolean;
      sendPush: boolean;
      emailPref: 'managed' | 'engagement';
      emailIds: ReviewEmailIds;
      event: ReviewEventContext;
    },
  ): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true, preferences: true, firstName: true, lastName: true },
    });
    if (!user) return;

    const prefs = readPortalPreferences(userId, user.preferences);
    const sendEmail =
      input.sendEmail &&
      Boolean(user.email?.trim()) &&
      (input.emailPref === 'managed'
        ? shouldSendEmailForManagedReviews(prefs)
        : shouldSendEmailForReviewEngagement(prefs));
    const sendPush =
      input.sendPush && shouldSendPushForKind(prefs, input.kind);

    const templateId = sendEmail ? reviewEmailTemplateId(input.kind) : null;
    const emailTemplateVariables =
      templateId != null
        ? await buildReviewEmailTemplateVariables(
            this.prisma,
            input.kind,
            input.event,
            input.href,
            user,
            input.emailIds,
          )
        : undefined;

    await this.notifications.deliver({
      tenantId,
      userId,
      userEmail: user.email,
      kind: input.kind,
      referenceKey: input.referenceKey,
      title: input.title,
      body: input.body,
      href: input.href,
      sendInApp: input.sendInApp,
      sendEmail,
      sendPush,
      preferences: prefs,
      ...(templateId && emailTemplateVariables
        ? { emailTemplateId: templateId, emailTemplateVariables }
        : {}),
    });
  }

  private async resolveManagedRecipientUserIds(
    tenantId: string,
    event: ReviewEventContext,
  ): Promise<string[]> {
    const ids = new Set<string>();
    const category = event.category ?? 'event';

    if (category === 'gastro') {
      const profile = await this.prisma.gastroProfile.findFirst({
        where: { tenantId, publicEventId: event.id },
        select: {
          createdByUserId: true,
          memberships: {
            where: { status: 'ACTIVE' },
            select: { userId: true },
          },
        },
      });
      if (profile) {
        for (const m of profile.memberships) ids.add(m.userId);
        if (profile.createdByUserId) ids.add(profile.createdByUserId);
      }
    } else if (category === 'hotel') {
      const memberships = await this.prisma.userHotelMembership.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          profile: { status: 'ACTIVE' },
        },
        select: {
          userId: true,
          profile: { select: { createdByUserId: true } },
        },
      });
      for (const m of memberships) {
        if (
          m.profile.createdByUserId === event.producerId ||
          m.userId === event.producerId
        ) {
          ids.add(m.userId);
        }
      }
      if (event.producerId) ids.add(event.producerId);
    } else if (event.producerProfileId) {
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
