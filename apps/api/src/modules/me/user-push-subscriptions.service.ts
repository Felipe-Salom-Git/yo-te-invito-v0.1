import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebPushService } from '../notifications/web-push.service';
import type {
  DeactivatePushSubscriptionBody,
  MePushSubscriptionsResponse,
  PushSubscription,
  PushSubscriptionsConfig,
  RegisterPushSubscriptionBody,
  SendTestPushBody,
  SendTestPushResponse,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class UserPushSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly webPush: WebPushService,
  ) {}

  private mapRow(row: {
    id: string;
    endpoint: string;
    userAgent: string | null;
    deviceName: string | null;
    platform: string | null;
    isActive: boolean;
    lastUsedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }): PushSubscription {
    return {
      id: row.id,
      endpoint: row.endpoint,
      userAgent: row.userAgent,
      deviceName: row.deviceName,
      platform: row.platform,
      isActive: row.isActive,
      lastUsedAt: row.lastUsedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  getConfig(): PushSubscriptionsConfig {
    return {
      pushEnabled: this.webPush.isEnabled(),
      vapidPublicKey: this.webPush.getPublicKey(),
    };
  }

  async list(tenantId: string, userId: string): Promise<MePushSubscriptionsResponse> {
    const rows = await this.prisma.userPushSubscription.findMany({
      where: { tenantId, userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
    return { subscriptions: rows.map((r) => this.mapRow(r)) };
  }

  async register(
    tenantId: string,
    userId: string,
    body: RegisterPushSubscriptionBody,
  ): Promise<PushSubscription> {
    const now = new Date();
    const row = await this.prisma.userPushSubscription.upsert({
      where: { endpoint: body.endpoint },
      create: {
        tenantId,
        userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? null,
        deviceName: body.deviceName ?? null,
        platform: body.platform ?? null,
        isActive: true,
        lastUsedAt: now,
      },
      update: {
        tenantId,
        userId,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        userAgent: body.userAgent ?? null,
        deviceName: body.deviceName ?? null,
        platform: body.platform ?? null,
        isActive: true,
        lastUsedAt: now,
      },
    });
    return this.mapRow(row);
  }

  async deactivateCurrent(
    tenantId: string,
    userId: string,
    body: DeactivatePushSubscriptionBody,
  ): Promise<{ deactivated: boolean }> {
    const row = await this.prisma.userPushSubscription.findFirst({
      where: { tenantId, userId, endpoint: body.endpoint },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Push subscription not found',
      });
    }
    await this.prisma.userPushSubscription.update({
      where: { id: row.id },
      data: { isActive: false },
    });
    return { deactivated: true };
  }

  async sendTest(
    tenantId: string,
    userId: string,
    body: SendTestPushBody,
  ): Promise<SendTestPushResponse> {
    const where = {
      tenantId,
      userId,
      isActive: true,
      ...(body.endpoint ? { endpoint: body.endpoint } : {}),
    };
    const rows = await this.prisma.userPushSubscription.findMany({ where });
    if (rows.length === 0) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'No hay suscripción push activa en este dispositivo',
      });
    }

    const result = await this.webPush.sendToTargets(
      rows.map((r) => ({
        id: r.id,
        endpoint: r.endpoint,
        p256dh: r.p256dh,
        auth: r.auth,
      })),
      {
        title: 'Yo Te Invito',
        body: 'Tus notificaciones están activas.',
        url: '/me/notifications',
      },
    );

    if (result.deactivatedIds.length > 0) {
      await this.prisma.userPushSubscription.updateMany({
        where: { id: { in: result.deactivatedIds } },
        data: { isActive: false },
      });
    }

    if (result.sent === 0) {
      throw new ServiceUnavailableException({
        code: ErrorCode.INTERNAL_ERROR,
        message:
          result.failed > 0
            ? 'No se pudo enviar la notificación push (endpoint inválido o expirado)'
            : 'Web Push no está configurado en el servidor',
      });
    }

    await this.prisma.userPushSubscription.updateMany({
      where: { id: { in: rows.map((r) => r.id) } },
      data: { lastUsedAt: new Date() },
    });

    return {
      sent: result.sent,
      message:
        result.sent === 1
          ? 'Notificación de prueba enviada'
          : `Notificación de prueba enviada a ${result.sent} dispositivos`,
    };
  }
}
