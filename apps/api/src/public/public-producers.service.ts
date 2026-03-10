import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProducerSummary {
  id: string;
  tenantId: string;
  displayName: string;
  slug: string;
  ratingAvg?: number | null;
  ratingCount?: number;
}

@Injectable()
export class PublicProducersService {
  constructor(private readonly prisma: PrismaService) {}

  async getById(id: string): Promise<ProducerSummary | null> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        tenantId: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) return null;

    const eventCount = await this.prisma.event.count({
      where: { producerId: id, deletedAt: null },
    });
    if (eventCount === 0) return null;

    const displayName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Producer';
    return {
      id: user.id,
      tenantId: user.tenantId,
      displayName,
      slug: user.id,
      ratingAvg: null,
      ratingCount: 0,
    };
  }
}
