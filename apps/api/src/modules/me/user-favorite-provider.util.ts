import type { FavoriteEntityType, FavoriteProviderType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export function mapCategory(cat: string | null): string {
  const c = (cat ?? 'event').toLowerCase();
  if (['event', 'gastro', 'rental', 'excursion', 'hotel'].includes(c)) return c;
  return 'event';
}

export function mapEntityType(category: string): FavoriteEntityType {
  if (category === 'gastro') return 'gastro';
  if (category === 'rental') return 'rental';
  if (category === 'excursion') return 'excursion';
  if (category === 'hotel') return 'hotel';
  return 'event';
}

export async function resolveFavoriteProvider(
  prisma: PrismaService,
  event: {
    id: string;
    tenantId: string;
    category: string | null;
    producerProfileId: string | null;
    rentalLocationId: string | null;
    excursionOperatorId: string | null;
  },
): Promise<{ providerType: FavoriteProviderType; providerId: string }> {
  const category = mapCategory(event.category);

  if (category === 'rental' && event.rentalLocationId) {
    return { providerType: 'rental_location', providerId: event.rentalLocationId };
  }
  if (category === 'excursion' && event.excursionOperatorId) {
    return { providerType: 'excursion_operator', providerId: event.excursionOperatorId };
  }
  if (category === 'gastro') {
    const gastro = await prisma.gastroProfile.findFirst({
      where: { publicEventId: event.id },
      select: { id: true },
    });
    if (gastro) return { providerType: 'gastro', providerId: gastro.id };
  }
  if (event.producerProfileId) {
    return { providerType: 'producer', providerId: event.producerProfileId };
  }
  return { providerType: 'platform', providerId: event.tenantId };
}
