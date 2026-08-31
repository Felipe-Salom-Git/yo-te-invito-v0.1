import { BadRequestException } from '@nestjs/common';
import { ErrorCode, canSendWhatsAppCampaign } from '@yo-te-invito/shared';

/**
 * WhatsApp campaign adapter. V3.3 has no Meta/Twilio/BSP SDK.
 * Callers must treat send as impossible until a real provider is wired here.
 */
export function sendCampaignWhatsApp(_input: {
  toE164: string;
  templateName?: string;
  locale?: string;
  variables?: Record<string, string>;
}): never {
  void _input;
  throw new BadRequestException({
    code: ErrorCode.WHATSAPP_PROVIDER_NOT_CONFIGURED,
    message: 'WhatsApp campaign provider is not configured',
  });
}

export function assertWhatsAppCampaignAdapterReady(): void {
  if (!canSendWhatsAppCampaign()) {
    sendCampaignWhatsApp({ toE164: '' });
  }
}
