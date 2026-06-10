import { Injectable } from '@nestjs/common';
import { ProfileStatus } from '@prisma/client';
import type {
  AdminHotelProfilesListQuery,
  AdminHotelProfilesListResponse,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminHotelProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  private toStatus(status: ProfileStatus): AdminHotelProfilesListResponse['data'][number]['status'] {
    return status as AdminHotelProfilesListResponse['data'][number]['status'];
  }

  async list(
    tenantId: string,
    query: AdminHotelProfilesListQuery,
  ): Promise<AdminHotelProfilesListResponse> {
    const where: {
      tenantId: string;
      status?: ProfileStatus | { not: ProfileStatus };
    } = { tenantId };

    if (query.status) {
      where.status = query.status as ProfileStatus;
    } else if (!query.includeInactive) {
      where.status = { not: 'DRAFT' };
    }

    const rows = await this.prisma.hotelProfile.findMany({
      where,
      orderBy: [{ status: 'asc' }, { displayName: 'asc' }],
      select: {
        id: true,
        displayName: true,
        city: true,
        status: true,
        publicEventId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: rows.map((row) => ({
        id: row.id,
        displayName: row.displayName,
        city: row.city,
        status: this.toStatus(row.status),
        publicEventId: row.publicEventId,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
}
