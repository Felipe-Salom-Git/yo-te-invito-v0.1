import { Injectable } from '@nestjs/common';
import {
  buildGastroDiscountQrPayload,
  GASTRO_DISCOUNT_TIMEZONE,
} from '@yo-te-invito/shared';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

function qrImageUrl(qrPayload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}`;
}

function formatValidToLabel(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('es-AR', { timeZone: GASTRO_DISCOUNT_TIMEZONE });
}

export type GastroDiscountClaimEmailKind = 'REQUESTED' | 'COURTESY';

export type SendGastroDiscountClaimEmailInput = {
  claimId: string;
  accessToken: string;
  to: string;
  kind: GastroDiscountClaimEmailKind;
  recipientUserId?: string | null;
  userName?: string | null;
  gastroName: string;
  discountTitle: string;
  discountDescription?: string | null;
  discountLabel?: string | null;
  qrPayload: string;
  qrCode: string;
  validTo?: string | null;
  conditions?: string | null;
  courtesyMessage?: string | null;
  webBaseUrl?: string;
};

@Injectable()
export class GastroDiscountClaimEmailService {
  constructor(
    private readonly email: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  buildQrPayload(discountId: string, qrToken: string): string {
    return buildGastroDiscountQrPayload(discountId, qrToken);
  }

  buildClaimUrl(baseUrl: string, claimId: string, accessToken: string): string {
    const params = new URLSearchParams({ token: accessToken });
    return `${baseUrl}/descuentos/reclamo/${claimId}?${params.toString()}`;
  }

  async sendClaimEmail(input: SendGastroDiscountClaimEmailInput): Promise<boolean> {
    const baseUrl = (input.webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const claimUrl = this.buildClaimUrl(baseUrl, input.claimId, input.accessToken);
    const accountUrl = `${baseUrl}/me/descuentos`;
    const hasAccount = Boolean(input.recipientUserId);
    const templateId =
      input.kind === 'COURTESY' ? 'GASTRO_DISCOUNT_QR_COURTESY' : 'GASTRO_DISCOUNT_QR_REQUESTED';
    const validToLabel = formatValidToLabel(input.validTo);

    let emailSentAt: Date | null = null;
    let emailSendError: string | null = null;
    let sent = false;

    if (!this.email.isConfigured()) {
      emailSendError = 'Email service not configured';
    } else {
      sent = await this.email.sendTemplate({
        templateId,
        to: input.to,
        variables: {
          userName: input.userName ?? 'ahí',
          recipientEmail: input.to,
          gastroName: input.gastroName,
          discountTitle: input.discountTitle,
          discountDescription: input.discountDescription ?? '',
          discountLabel: input.discountLabel ?? input.discountTitle,
          qrImageUrl: qrImageUrl(input.qrPayload),
          qrCode: input.qrCode,
          validTo: validToLabel,
          conditions:
            input.conditions ??
            'Presentá este QR en el local para aplicar el beneficio. Este cupón es de uso único.',
          claimUrl,
          accountUrl,
          hasAccount,
          courtesyMessage: input.courtesyMessage ?? '',
        },
      });
      if (sent) emailSentAt = new Date();
      else emailSendError = 'Failed to send email';
    }

    await this.prisma.gastroDiscountClaim.update({
      where: { id: input.claimId },
      data: { emailSentAt, emailSendError },
    });

    return sent;
  }
}
