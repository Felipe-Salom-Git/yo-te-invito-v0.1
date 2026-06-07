import type { Prisma } from '@prisma/client';

/**
 * Public discovery/detail: hide rental/excursion/gastro events when parent entity is inactive.
 * Gastro without linked profile (legacy general publications) remains visible.
 * Does not affect orders, tickets, or historical records.
 */
export function publicParentEntitiesActiveWhere(): Prisma.EventWhereInput {
  return {
    AND: [
      {
        OR: [
          { category: { not: 'rental' } },
          { rentalLocation: { isActive: true, deletedAt: null } },
        ],
      },
      {
        OR: [
          { category: { not: 'excursion' } },
          { excursionOperator: { isActive: true, deletedAt: null } },
        ],
      },
      {
        OR: [
          { category: { not: 'gastro' } },
          { gastroProfilePublic: { is: null } },
          { gastroProfilePublic: { status: 'ACTIVE' } },
        ],
      },
    ],
  };
}

export function mergePublicParentEntitiesActive(
  where: Prisma.EventWhereInput,
): Prisma.EventWhereInput {
  const clause = publicParentEntitiesActiveWhere();
  const existingAnd = where.AND
    ? Array.isArray(where.AND)
      ? where.AND
      : [where.AND]
    : [];
  return { ...where, AND: [...existingAnd, clause] };
}
