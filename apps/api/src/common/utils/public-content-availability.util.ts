import type { Prisma } from '@prisma/client';

/**
 * Public discovery/detail: hide rental/excursion events when parent local/operator is inactive.
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
