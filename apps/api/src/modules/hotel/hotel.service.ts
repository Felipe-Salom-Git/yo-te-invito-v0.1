import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HotelService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(tenantId: string, userId: string) {
    const row = await this.prisma.userHotelMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: {
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!row) {
      return { profile: null as null };
    }

    const p = row.profile;
    return {
      profile: {
        id: p.id,
        displayName: p.displayName,
        websiteUrl: p.websiteUrl,
        bookingUrl: p.bookingUrl,
        socialLinks: p.socialLinks,
        city: p.city,
        starCategory: p.starCategory,
      },
    };
  }
}
