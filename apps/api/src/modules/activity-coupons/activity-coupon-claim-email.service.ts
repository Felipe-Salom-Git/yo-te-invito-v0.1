import { Injectable, Logger } from '@nestjs/common';
import {
  GASTRO_DISCOUNT_TIMEZONE,
  shouldSendActivityCouponClaimEmail,
} from '@yo-te-invito/shared';
import { EmailService } from '../../email/email.service';

function qrImageUrl(qrPayload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}`;
}

function formatValidToLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { timeZone: GASTRO_DISCOUNT_TIMEZONE });
}

export type SendActivityCouponClaimEmailInput = {
  claimId: string;
  accessToken: string;
  to: string | null | undefined;
  recipientUserId?: string | null;
  userName?: string | null;
  operatorName: string;
  eventTitle: string;
  couponTitle: string;
  benefitLabel?: string | null;
  qrPayload: string;
  shortCodeDisplay: string;
  validTo?: string | null;
  webBaseUrl?: string;
};

export type SendActivityCouponClaimEmailResult = {
  sent: boolean;
  skipped: boolean;
  error?: string;
};

@Injectable()
export class ActivityCouponClaimEmailService {
  private readonly logger = new Logger(ActivityCouponClaimEmailService.name);

  constructor(private readonly email: EmailService) {}

  buildClaimUrl(baseUrl: string, claimId: string, accessToken: string): string {
    const params = new URLSearchParams({ token: accessToken });
    return `${baseUrl}/excursiones/cupones/reclamo/${claimId}?${params.toString()}`;
  }

  async sendClaimEmail(
    input: SendActivityCouponClaimEmailInput,
  ): Promise<SendActivityCouponClaimEmailResult> {
    if (!shouldSendActivityCouponClaimEmail(input.to)) {
      return { sent: false, skipped: true };
    }
    const to = input.to!.trim();
    const baseUrl = (input.webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const claimUrl = this.buildClaimUrl(baseUrl, input.claimId, input.accessToken);
    const accountUrl = `${baseUrl}/me/descuentos`;
    const hasAccount = Boolean(input.recipientUserId);

    if (!this.email.isConfigured()) {
      this.logger.warn(
        `Activity coupon claim email skipped (not configured): claim=${input.claimId} to=${to}`,
      );
      return { sent: false, skipped: false, error: 'Email service not configured' };
    }

    const result = await this.email.sendTemplateResult({
      templateId: 'ACTIVITY_COUPON_QR',
      to,
      variables: {
        userName: input.userName ?? 'ahí',
        operatorName: input.operatorName,
        eventTitle: input.eventTitle,
        couponTitle: input.couponTitle,
        benefitLabel: input.benefitLabel ?? input.couponTitle,
        qrImageUrl: qrImageUrl(input.qrPayload),
        shortCode: input.shortCodeDisplay,
        validTo: formatValidToLabel(input.validTo),
        claimUrl,
        accountUrl,
        hasAccount,
      },
    });

    if (!result.ok) {
      const error = result.message ?? result.errorCode;
      this.logger.warn(
        `Activity coupon claim email failed: claim=${input.claimId} to=${to} error=${error}`,
      );
      return { sent: false, skipped: false, error };
    }
    return { sent: true, skipped: false };
  }
}
