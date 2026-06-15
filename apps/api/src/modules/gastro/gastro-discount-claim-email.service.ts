import { Injectable } from '@nestjs/common';
import { buildGastroDiscountQrPayload } from '@yo-te-invito/shared';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';

function qrImageUrl(qrPayload: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(qrPayload)}`;
}

export type GastroDiscountClaimEmailKind = 'REQUESTED' | 'COURTESY';

export type SendGastroDiscountClaimEmailInput = {
  claimId: string;
  to: string;
  kind: GastroDiscountClaimEmailKind;
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

  async sendClaimEmail(input: SendGastroDiscountClaimEmailInput): Promise<boolean> {
    const baseUrl = (input.webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const accountUrl = `${baseUrl}/me/descuentos`;
    const templateId =
      input.kind === 'COURTESY' ? 'GASTRO_DISCOUNT_QR_COURTESY' : 'GASTRO_DISCOUNT_QR_REQUESTED';

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
          validTo: input.validTo ?? '',
          conditions: input.conditions ?? 'Presentá este QR en el local. Sujeto a disponibilidad del restaurante.',
          accountUrl,
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
