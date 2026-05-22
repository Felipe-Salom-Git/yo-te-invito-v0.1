import type { PrismaService } from '../../prisma/prisma.service';
import { slugifySubcategoryName } from '../subcategories/subcategory-slug.util';

const MAX_SLUG_LEN = 80;

export function slugifyProducerDisplayName(displayName: string): string {
  const base = slugifySubcategoryName(displayName).slice(0, MAX_SLUG_LEN);
  return base.length >= 2 ? base : 'productora';
}

export async function uniqueProducerProfileSlug(
  prisma: PrismaService,
  displayName: string,
  excludeProfileId?: string,
): Promise<string> {
  const base = slugifyProducerDisplayName(displayName);
  let candidate = base;
  let n = 1;

  while (true) {
    const existing = await prisma.producerProfile.findFirst({
      where: {
        slug: candidate,
        ...(excludeProfileId ? { NOT: { id: excludeProfileId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;

    const suffix = `-${n++}`;
    candidate = `${base.slice(0, Math.max(2, MAX_SLUG_LEN - suffix.length))}${suffix}`;
  }
}
