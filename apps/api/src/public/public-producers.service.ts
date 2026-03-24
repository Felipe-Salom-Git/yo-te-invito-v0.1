import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProducerSummary {
  id: string;
  tenantId: string;
  slug: string | null;
  displayName: string;
  shortDescription: string | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  city: string | null;
  country: string | null;
  ratingAvg: number | null;
  ratingCount: number;
}

export interface ProducerDetail extends ProducerSummary {
  longDescription: string | null;
  primaryPhone: string | null;
  secondaryPhone: string | null;
  primaryEmail: string | null;
  secondaryEmail: string | null;
  whatsapp: string | null;
  socialLinks: any;
  events: any[];
}

@Injectable()
export class PublicProducersService {
  constructor(private readonly prisma: PrismaService) { }

  async getPublicList(page: number, limit: number, city?: string): Promise<{ producers: ProducerSummary[]; total: number }> {
    const whereClause: any = {
      status: 'ACTIVE',
    };
    if (city) {
      whereClause.city = { equals: city, mode: 'insensitive' };
    }

    const [producers, total] = await Promise.all([
      this.prisma.producerProfile.findMany({
        where: whereClause,
        select: {
          id: true,
          tenantId: true,
          slug: true,
          displayName: true,
          shortDescription: true,
          logoUrl: true,
          coverImageUrl: true,
          city: true,
          country: true,
          ratingAvg: true,
          ratingCount: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { ratingAvg: 'desc' },
      }),
      this.prisma.producerProfile.count({ where: whereClause }),
    ]);

    return { producers, total };
  }

  async getBySlugOrId(identifier: string): Promise<ProducerDetail | null> {
    const profile = await this.prisma.producerProfile.findFirst({
      where: {
        status: 'ACTIVE',
        OR: [
          { slug: identifier },
          { id: identifier },
        ]
      },
      include: {
        events: {
          where: { status: 'APPROVED', deletedAt: null },
          orderBy: { startAt: 'asc' },
          select: {
            id: true,
            title: true,
            startAt: true,
            city: true,
            status: true,
            coverImageUrl: true,
          }
        }
      }
    });

    if (!profile) return null;

    return {
      id: profile.id,
      tenantId: profile.tenantId,
      slug: profile.slug,
      displayName: profile.displayName,
      shortDescription: profile.shortDescription,
      longDescription: profile.longDescription,
      logoUrl: profile.logoUrl,
      coverImageUrl: profile.coverImageUrl,
      primaryPhone: profile.primaryPhone,
      secondaryPhone: profile.secondaryPhone,
      primaryEmail: profile.primaryEmail,
      secondaryEmail: profile.secondaryEmail,
      whatsapp: profile.whatsapp,
      city: profile.city,
      country: profile.country,
      socialLinks: profile.socialLinks,
      ratingAvg: profile.ratingAvg,
      ratingCount: profile.ratingCount,
      events: profile.events,
    };
  }
}
