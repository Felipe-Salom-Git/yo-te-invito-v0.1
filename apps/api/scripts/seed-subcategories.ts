/**
 * Idempotent subcategory catalog for tenant-demo (no users/events).
 * Run: pnpm --filter api run seed:subcategories
 */

import { PrismaClient } from '@prisma/client';
import { slugifySubcategoryName } from '../src/modules/subcategories/subcategory-slug.util';

const prisma = new PrismaClient();
const TENANT_ID = 'tenant-demo';

const SEED: Array<{ category: string; name: string; sortOrder: number }> = [
  { category: 'event', name: 'Fiestas', sortOrder: 0 },
  { category: 'event', name: 'Recitales', sortOrder: 1 },
  { category: 'event', name: 'Teatro', sortOrder: 2 },
  { category: 'event', name: 'Festivales', sortOrder: 3 },
  { category: 'gastro', name: 'Restaurantes', sortOrder: 0 },
  { category: 'gastro', name: 'Bares', sortOrder: 1 },
  { category: 'gastro', name: 'Cafeterías', sortOrder: 2 },
  { category: 'gastro', name: 'Cervecerías', sortOrder: 3 },
  { category: 'rental', name: 'Autos', sortOrder: 0 },
  { category: 'rental', name: 'Bicicletas', sortOrder: 1 },
  { category: 'rental', name: 'Kayaks', sortOrder: 2 },
  { category: 'rental', name: 'Ropa de invierno', sortOrder: 3 },
  { category: 'rental', name: 'Equipos de nieve', sortOrder: 4 },
  { category: 'rental', name: 'Movilidad turística', sortOrder: 5 },
  { category: 'excursion', name: 'Trekking', sortOrder: 0 },
  { category: 'excursion', name: 'Lagos', sortOrder: 1 },
  { category: 'excursion', name: 'Nieve', sortOrder: 2 },
  { category: 'excursion', name: 'Aventura', sortOrder: 3 },
  { category: 'excursion', name: 'City tours', sortOrder: 4 },
];

async function main() {
  for (const row of SEED) {
    const slug = slugifySubcategoryName(row.name);
    await prisma.contentSubcategory.upsert({
      where: {
        tenantId_category_slug: {
          tenantId: TENANT_ID,
          category: row.category,
          slug,
        },
      },
      create: {
        tenantId: TENANT_ID,
        category: row.category,
        name: row.name,
        slug,
        sortOrder: row.sortOrder,
        isActive: true,
      },
      update: {
        name: row.name,
        sortOrder: row.sortOrder,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${SEED.length} subcategories for ${TENANT_ID}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
