import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import webpush from 'web-push';
import type { WebPushPayload } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

export type PushSendTarget = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  deactivatedIds: string[];
};

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private configured = false;

  isEnabled(): boolean {
    return this.ensureConfigured(false);
  }

  getPublicKey(): string | null {
    const key = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
    return key || null;
  }

  private ensureConfigured(throwIfMissing: boolean): boolean {
    if (this.configured) return true;

    const publicKey = process.env.WEB_PUSH_VAPID_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_VAPID_PRIVATE_KEY?.trim();
    const contact =
      process.env.WEB_PUSH_CONTACT_EMAIL?.trim() || 'mailto:support@yoteinvito.com';

    if (!publicKey || !privateKey) {
      if (throwIfMissing) {
        throw new ServiceUnavailableException({
          code: ErrorCode.INTERNAL_ERROR,
          message:
            'Web Push no está configurado. Definí WEB_PUSH_VAPID_PUBLIC_KEY y WEB_PUSH_VAPID_PRIVATE_KEY.',
        });
      }
      return false;
    }

    webpush.setVapidDetails(contact, publicKey, privateKey);
    this.configured = true;
    return true;
  }

  async sendToTargets(
    targets: PushSendTarget[],
    payload: WebPushPayload,
  ): Promise<PushSendResult> {
    this.ensureConfigured(true);

    const body = JSON.stringify(payload);
    let sent = 0;
    let failed = 0;
    const deactivatedIds: string[] = [];

    for (const t of targets) {
      try {
        await webpush.sendNotification(
          {
            endpoint: t.endpoint,
            keys: { p256dh: t.p256dh, auth: t.auth },
          },
          body,
        );
        sent += 1;
      } catch (err: unknown) {
        failed += 1;
        const status = this.readStatusCode(err);
        if (status === 404 || status === 410) {
          deactivatedIds.push(t.id);
        }
        this.logger.warn(
          `Push failed for subscription ${t.id} (status=${status ?? 'unknown'})`,
        );
      }
    }

    return { sent, failed, deactivatedIds };
  }

  private readStatusCode(err: unknown): number | undefined {
    if (err && typeof err === 'object' && 'statusCode' in err) {
      const code = (err as { statusCode: unknown }).statusCode;
      return typeof code === 'number' ? code : undefined;
    }
    return undefined;
  }
}
