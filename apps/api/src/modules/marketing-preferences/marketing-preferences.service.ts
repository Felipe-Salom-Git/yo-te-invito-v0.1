import { randomBytes } from 'crypto';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCode,
  buildMarketingUnsubscribePreview,
  buildMarketingUnsubscribeResult,
  emptyMeMarketingPreferences,
  isMarketingUnsubscribeTokenShape,
  type MeMarketingPreferences,
  type MarketingPreferenceSource,
  type PatchMeMarketingPreferencesBody,
  type PublicMarketingUnsubscribePreview,
  type PublicMarketingUnsubscribeResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { isWhatsAppCampaignProviderConfigured } from './whatsapp-campaign-provider.util';

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function newUnsubscribeToken(): string {
  return randomBytes(32).toString('hex');
}

@Injectable()
export class MarketingPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(tenantId: string, userId: string): Promise<MeMarketingPreferences> {
    const row = await this.prisma.userMarketingPreference.findFirst({
      where: { tenantId, userId },
    });
    return this.toDto(row);
  }

  async patchMine(
    tenantId: string,
    userId: string,
    body: PatchMeMarketingPreferencesBody,
  ): Promise<MeMarketingPreferences> {
    if (body.whatsappOptIn === true && !isWhatsAppCampaignProviderConfigured()) {
      throw new BadRequestException({
        code: ErrorCode.WHATSAPP_PROVIDER_NOT_CONFIGURED,
        message: 'WhatsApp promotions are not available yet',
      });
    }

    const existing = await this.prisma.userMarketingPreference.findFirst({
      where: { tenantId, userId },
    });
    const now = new Date();
    const data = this.buildPatchData(existing, body, now);

    if (!existing) {
      const created = await this.prisma.userMarketingPreference.create({
        data: {
          tenantId,
          userId,
          ...data,
        },
      });
      return this.toDto(created);
    }

    const updated = await this.prisma.userMarketingPreference.update({
      where: { id: existing.id },
      data,
    });
    return this.toDto(updated);
  }

  async previewUnsubscribeByToken(token: string): Promise<PublicMarketingUnsubscribePreview> {
    const row = await this.findPreferenceByUnsubscribeToken(token);
    return buildMarketingUnsubscribePreview(row.emailOptIn);
  }

  async unsubscribeByToken(token: string): Promise<PublicMarketingUnsubscribeResponse> {
    const row = await this.findPreferenceByUnsubscribeToken(token);

    if (!row.emailOptIn) {
      return buildMarketingUnsubscribeResult(false);
    }

    await this.prisma.userMarketingPreference.update({
      where: { id: row.id },
      data: {
        emailOptIn: false,
        emailOptOutAt: new Date(),
        source: 'UNSUBSCRIBE',
      },
    });
    return buildMarketingUnsubscribeResult(true);
  }

  private async findPreferenceByUnsubscribeToken(token: string) {
    if (!isMarketingUnsubscribeTokenShape(token)) {
      throw new NotFoundException({
        code: ErrorCode.MARKETING_UNSUBSCRIBE_INVALID,
        message: 'Enlace inválido o vencido',
      });
    }

    const row = await this.prisma.userMarketingPreference.findUnique({
      where: { emailUnsubscribeToken: token },
    });
    if (!row) {
      throw new NotFoundException({
        code: ErrorCode.MARKETING_UNSUBSCRIBE_INVALID,
        message: 'Enlace inválido o vencido',
      });
    }
    return row;
  }

  private buildPatchData(
    existing: {
      emailOptIn: boolean;
      emailOptInAt: Date | null;
      emailOptOutAt: Date | null;
      emailUnsubscribeToken: string | null;
      whatsappOptIn: boolean;
      whatsappOptInAt: Date | null;
      whatsappOptOutAt: Date | null;
      source: string;
    } | null,
    body: PatchMeMarketingPreferencesBody,
    now: Date,
  ): {
    emailOptIn: boolean;
    emailOptInAt: Date | null;
    emailOptOutAt: Date | null;
    emailUnsubscribeToken: string | null;
    whatsappOptIn: boolean;
    whatsappOptInAt: Date | null;
    whatsappOptOutAt: Date | null;
    source: MarketingPreferenceSource;
  } {
    let emailOptIn = existing?.emailOptIn ?? false;
    let emailOptInAt = existing?.emailOptInAt ?? null;
    let emailOptOutAt = existing?.emailOptOutAt ?? null;
    let emailUnsubscribeToken = existing?.emailUnsubscribeToken ?? null;
    let source: MarketingPreferenceSource =
      (existing?.source as MarketingPreferenceSource | undefined) ?? 'ACCOUNT';

    if (body.emailOptIn === true && !emailOptIn) {
      emailOptIn = true;
      emailOptInAt = now;
      emailOptOutAt = null;
      emailUnsubscribeToken = newUnsubscribeToken();
      source = 'ACCOUNT';
    } else if (body.emailOptIn === false && emailOptIn) {
      emailOptIn = false;
      emailOptOutAt = now;
      source = 'ACCOUNT';
    }

    let whatsappOptIn = existing?.whatsappOptIn ?? false;
    let whatsappOptInAt = existing?.whatsappOptInAt ?? null;
    let whatsappOptOutAt = existing?.whatsappOptOutAt ?? null;
    if (body.whatsappOptIn === true && !whatsappOptIn) {
      whatsappOptIn = true;
      whatsappOptInAt = now;
      whatsappOptOutAt = null;
      source = 'ACCOUNT';
    } else if (body.whatsappOptIn === false && whatsappOptIn) {
      whatsappOptIn = false;
      whatsappOptOutAt = now;
      source = 'ACCOUNT';
    }

    return {
      emailOptIn,
      emailOptInAt,
      emailOptOutAt,
      emailUnsubscribeToken,
      whatsappOptIn,
      whatsappOptInAt,
      whatsappOptOutAt,
      source,
    };
  }

  private toDto(
    row: {
      emailOptIn: boolean;
      emailOptInAt: Date | null;
      emailOptOutAt: Date | null;
      whatsappOptIn: boolean;
      whatsappOptInAt: Date | null;
      whatsappOptOutAt: Date | null;
      source: string;
    } | null,
  ): MeMarketingPreferences {
    const whatsappAvailable = isWhatsAppCampaignProviderConfigured();
    if (!row) {
      return emptyMeMarketingPreferences(whatsappAvailable);
    }
    return {
      emailOptIn: row.emailOptIn,
      emailOptInAt: iso(row.emailOptInAt),
      emailOptOutAt: iso(row.emailOptOutAt),
      whatsappOptIn: row.whatsappOptIn && whatsappAvailable,
      whatsappOptInAt: iso(row.whatsappOptInAt),
      whatsappOptOutAt: iso(row.whatsappOptOutAt),
      whatsappAvailable,
      source: (row.source as MarketingPreferenceSource) ?? 'ACCOUNT',
    };
  }
}
