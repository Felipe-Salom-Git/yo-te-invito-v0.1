import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import { renderEmailTemplate } from '../../email/templates/email-template.renderer';
import type { EmailTemplateId } from '../../email/templates/email-template.types';
import type {
  MeNotificationsResponse,
  MeNotificationsUnread,
  UserNotification,
  UserPortalPreferences,
  WebPushPayload,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import {
  pushTypeForKind,
  readPortalPreferences,
  shouldSendPushForKind,
} from '../me/user-portal-preferences.util';
import { WebPushService } from './web-push.service';

export type DeliverNotificationInput = {
  tenantId: string;
  userId: string;
  userEmail: string;
  kind: NotificationKind;
  referenceKey: string;
  title: string;
  body: string;
  href?: string | null;
  sendInApp: boolean;
  sendEmail: boolean;
  /** Si se omite, se calcula desde preferencias del usuario. */
  sendPush?: boolean;
  preferences?: UserPortalPreferences;
  /** Canal email: template registrado en lugar de HTML inline. */
  emailTemplateId?: EmailTemplateId;
  emailTemplateVariables?: Record<string, unknown>;
};

@Injectable()
export class UserNotificationsService {
  private readonly logger = new Logger(UserNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
    private readonly webPush: WebPushService,
  ) {}

  private map(row: {
    id: string;
    kind: NotificationKind;
    referenceKey: string;
    title: string;
    body: string;
    href: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): UserNotification {
    return {
      id: row.id,
      kind: row.kind as UserNotification['kind'],
      referenceKey: row.referenceKey,
      title: row.title,
      body: row.body,
      href: row.href,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  async list(tenantId: string, userId: string, limit = 50): Promise<MeNotificationsResponse> {
    const rows = await this.prisma.userNotification.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const unreadCount = await this.prisma.userNotification.count({
      where: { tenantId, userId, readAt: null },
    });
    return {
      items: rows.map((r) => this.map(r)),
      unreadCount,
    };
  }

  async unreadCount(tenantId: string, userId: string): Promise<MeNotificationsUnread> {
    const unreadCount = await this.prisma.userNotification.count({
      where: { tenantId, userId, readAt: null },
    });
    return { unreadCount };
  }

  async markRead(tenantId: string, userId: string, notificationId: string): Promise<UserNotification> {
    const row = await this.prisma.userNotification.findFirst({
      where: { id: notificationId, tenantId, userId },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Notification not found',
      });
    }
    const updated = await this.prisma.userNotification.update({
      where: { id: notificationId },
      data: { readAt: row.readAt ?? new Date() },
    });
    return this.map(updated);
  }

  async markAllRead(tenantId: string, userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.userNotification.updateMany({
      where: { tenantId, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private async resolvePreferences(
    userId: string,
    provided?: UserPortalPreferences,
  ): Promise<UserPortalPreferences | null> {
    if (provided) return provided;
    const user = await this.prisma.user.findFirst({
      where: { id: userId },
      select: { preferences: true },
    });
    if (!user) return null;
    return readPortalPreferences(userId, user.preferences);
  }

  /**
   * Idempotent delivery: skips channels already logged for (user, kind, referenceKey).
   */
  async deliver(
    input: DeliverNotificationInput,
  ): Promise<{ inApp: boolean; email: boolean; push: boolean }> {
    let inApp = false;
    let email = false;
    let push = false;

    if (input.sendInApp) {
      const already = await this.prisma.notificationDeliveryLog.findUnique({
        where: {
          userId_kind_referenceKey_channel: {
            userId: input.userId,
            kind: input.kind,
            referenceKey: input.referenceKey,
            channel: NotificationChannel.IN_APP,
          },
        },
      });
      if (!already) {
        await this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
          await tx.userNotification.upsert({
            where: {
              userId_kind_referenceKey: {
                userId: input.userId,
                kind: input.kind,
                referenceKey: input.referenceKey,
              },
            },
            create: {
              tenantId: input.tenantId,
              userId: input.userId,
              kind: input.kind,
              referenceKey: input.referenceKey,
              title: input.title,
              body: input.body,
              href: input.href ?? null,
            },
            update: {
              title: input.title,
              body: input.body,
              href: input.href ?? null,
            },
          });
          await tx.notificationDeliveryLog.create({
            data: {
              tenantId: input.tenantId,
              userId: input.userId,
              kind: input.kind,
              referenceKey: input.referenceKey,
              channel: NotificationChannel.IN_APP,
            },
          });
        });
        inApp = true;
      }
    }

    if (input.sendEmail && input.userEmail) {
      const alreadyEmail = await this.prisma.notificationDeliveryLog.findUnique({
        where: {
          userId_kind_referenceKey_channel: {
            userId: input.userId,
            kind: input.kind,
            referenceKey: input.referenceKey,
            channel: NotificationChannel.EMAIL,
          },
        },
      });
      if (!alreadyEmail) {
        let subject = input.title;
        let html: string;
        let text: string | undefined;

        if (input.emailTemplateId) {
          const rendered = renderEmailTemplate({
            templateId: input.emailTemplateId,
            variables: input.emailTemplateVariables ?? {},
          });
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
        } else {
          const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
          const link = input.href ? `${appUrl}${input.href}` : appUrl;
          html = `<p>${input.body}</p><p><a href="${link}">Ver en Yo Te Invito</a></p>`;
          text = `${input.body}\n\n${link}`;
        }

        await this.emailQueue.enqueue({
          to: input.userEmail,
          subject,
          html,
          text,
        });
        await this.prisma.notificationDeliveryLog.create({
          data: {
            tenantId: input.tenantId,
            userId: input.userId,
            kind: input.kind,
            referenceKey: input.referenceKey,
            channel: NotificationChannel.EMAIL,
          },
        });
        email = true;
      }
    }

    const prefs = await this.resolvePreferences(input.userId, input.preferences);
    const wantsPush =
      input.sendPush ?? (prefs != null && shouldSendPushForKind(prefs, input.kind));

    if (wantsPush && prefs) {
      push = await this.deliverPushChannel(input, prefs);
    }

    return { inApp, email, push };
  }

  private async deliverPushChannel(
    input: DeliverNotificationInput,
    prefs: UserPortalPreferences,
  ): Promise<boolean> {
    if (!this.webPush.isEnabled()) return false;
    if (!shouldSendPushForKind(prefs, input.kind)) return false;

    const already = await this.prisma.notificationDeliveryLog.findUnique({
      where: {
        userId_kind_referenceKey_channel: {
          userId: input.userId,
          kind: input.kind,
          referenceKey: input.referenceKey,
          channel: NotificationChannel.PUSH,
        },
      },
    });
    if (already) return false;

    const subs = await this.prisma.userPushSubscription.findMany({
      where: { tenantId: input.tenantId, userId: input.userId, isActive: true },
    });
    if (subs.length === 0) return false;

    const payload: WebPushPayload = {
      title: input.title,
      body: input.body,
      url: input.href ?? '/me/notifications',
      type: pushTypeForKind(input.kind),
    };

    const result = await this.webPush.sendToTargets(
      subs.map((s) => ({
        id: s.id,
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      })),
      payload,
    );

    if (result.deactivatedIds.length > 0) {
      await this.prisma.userPushSubscription.updateMany({
        where: { id: { in: result.deactivatedIds } },
        data: { isActive: false },
      });
    }

    if (result.sent > 0) {
      const now = new Date();
      await this.prisma.notificationDeliveryLog.create({
        data: {
          tenantId: input.tenantId,
          userId: input.userId,
          kind: input.kind,
          referenceKey: input.referenceKey,
          channel: NotificationChannel.PUSH,
        },
      });
      await this.prisma.userPushSubscription.updateMany({
        where: {
          userId: input.userId,
          isActive: true,
          endpoint: {
            in: subs
              .filter((s) => !result.deactivatedIds.includes(s.id))
              .map((s) => s.endpoint),
          },
        },
        data: { lastUsedAt: now },
      });
      return true;
    }

    if (result.failed > 0) {
      this.logger.debug(
        `Push delivery failed for user=${input.userId} kind=${input.kind} ref=${input.referenceKey}`,
      );
    }
    return false;
  }

  /** Notificación determinística para smoke/E2E (admin). */
  async seedE2eDemo(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { email: true, preferences: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
    const prefs = readPortalPreferences(userId, user.preferences);
    const referenceKey = `e2e-demo:${Date.now()}`;
    await this.deliver({
      tenantId,
      userId,
      userEmail: user.email,
      kind: NotificationKind.TICKET_REMINDER_24H,
      referenceKey,
      title: 'E2E: Recordatorio de prueba',
      body: 'Notificación generada para tests automatizados del portal.',
      href: '/me/tickets',
      sendInApp: true,
      sendEmail: false,
      preferences: prefs,
    });
    const row = await this.prisma.userNotification.findFirst({
      where: { userId, kind: NotificationKind.TICKET_REMINDER_24H, referenceKey },
    });
    return row ? this.map(row) : null;
  }
}
