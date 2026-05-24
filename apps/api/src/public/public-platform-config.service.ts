import { Injectable } from '@nestjs/common';
import type { PublicPlatformConfigResponse } from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicPlatformConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublic(tenantId: string): Promise<PublicPlatformConfigResponse> {
    const row = await this.prisma.platformConfig.findUnique({
      where: { tenantId },
      select: {
        contactEmail: true,
        contactPhone: true,
        contactAddress: true,
      },
    });

    if (!row) {
      return this.emptyPublic();
    }

    return {
      supportEmail: this.nullIfBlank(row.contactEmail),
      supportPhone: this.nullIfBlank(row.contactPhone),
      whatsappPhone: null,
      address: this.nullIfBlank(row.contactAddress),
      instagramUrl: null,
      websiteUrl: null,
    };
  }

  private emptyPublic(): PublicPlatformConfigResponse {
    return {
      supportEmail: null,
      supportPhone: null,
      whatsappPhone: null,
      address: null,
      instagramUrl: null,
      websiteUrl: null,
    };
  }

  private nullIfBlank(value: string | null | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }
}
