import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AdminConfigPatch, PlatformConfig } from '@yo-te-invito/shared';

@Injectable()
export class AdminConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async get(tenantId: string): Promise<PlatformConfig> {
    const row = await this.prisma.platformConfig.findUnique({
      where: { tenantId },
    });
    if (!row) {
      return {
        contact: { email: '', phone: '', address: '' },
        categories: [
          { id: 'event', label: 'Eventos' },
          { id: 'gastro', label: 'Restaurants' },
          { id: 'rental', label: 'Rentals' },
          { id: 'excursion', label: 'Excursiones' },
        ],
      };
    }
    const categories = Array.isArray(row.categories)
      ? (row.categories as Array<{ id: string; label: string }>)
      : [];
    return {
      contact: {
        email: row.contactEmail ?? '',
        phone: row.contactPhone ?? '',
        address: row.contactAddress ?? '',
      },
      categories: categories.map((c) => ({ id: String(c?.id ?? ''), label: String(c?.label ?? '') })),
    };
  }

  async update(tenantId: string, patch: AdminConfigPatch): Promise<PlatformConfig> {
    const existing = await this.prisma.platformConfig.findUnique({ where: { tenantId } });
    const data: {
      contactEmail?: string | null;
      contactPhone?: string | null;
      contactAddress?: string | null;
      categories?: Array<{ id: string; label: string }>;
    } = {};
    if (patch.contact) {
      if (patch.contact.email !== undefined) data.contactEmail = patch.contact.email || null;
      if (patch.contact.phone !== undefined) data.contactPhone = patch.contact.phone || null;
      if (patch.contact.address !== undefined) data.contactAddress = patch.contact.address || null;
    }
    if (patch.categories !== undefined) {
      data.categories = patch.categories;
    }
    if (existing) {
      await this.prisma.platformConfig.update({
        where: { tenantId },
        data: {
          ...data,
          categories: data.categories,
        },
      });
    } else {
      const cat = data.categories ?? patch.categories;
      await this.prisma.platformConfig.create({
        data: {
          tenantId,
          contactEmail: data.contactEmail ?? patch.contact?.email ?? null,
          contactPhone: data.contactPhone ?? patch.contact?.phone ?? null,
          contactAddress: data.contactAddress ?? patch.contact?.address ?? null,
          categories: cat ? JSON.parse(JSON.stringify(cat)) : undefined,
        },
      });
    }
    return this.get(tenantId);
  }
}
