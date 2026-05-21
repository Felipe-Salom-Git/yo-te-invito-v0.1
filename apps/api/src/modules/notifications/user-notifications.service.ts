import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationChannel, NotificationKind, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailQueueService } from '../../email/email-queue.service';
import type {
  MeNotificationsResponse,
  MeNotificationsUnread,
  UserNotification,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

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
};

@Injectable()
export class UserNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
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

  /**
   * Idempotent delivery: skips channels already logged for (user, kind, referenceKey).
   */
  async deliver(input: DeliverNotificationInput): Promise<{ inApp: boolean; email: boolean }> {
    let inApp = false;
    let email = false;

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
        const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
        const link = input.href ? `${appUrl}${input.href}` : appUrl;
        await this.emailQueue.enqueue({
          to: input.userEmail,
          subject: input.title,
          html: `<p>${input.body}</p><p><a href="${link}">Ver en Yo Te Invito</a></p>`,
          text: `${input.body}\n\n${link}`,
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

    return { inApp, email };
  }

  /** Notificación determinística para smoke/E2E (admin). */
  async seedE2eDemo(tenantId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'User not found',
      });
    }
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
    });
    const row = await this.prisma.userNotification.findFirst({
      where: { userId, kind: NotificationKind.TICKET_REMINDER_24H, referenceKey },
    });
    return row ? this.map(row) : null;
  }
}
