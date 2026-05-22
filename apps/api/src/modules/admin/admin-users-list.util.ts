import { Prisma, Role as PrismaRole, UserStatus } from '@prisma/client';
import type { AdminUsersListQuery } from '@yo-te-invito/shared';

export function buildAdminUsersWhere(
  tenantId: string,
  query: AdminUsersListQuery,
): Prisma.UserWhereInput {
  const where: Prisma.UserWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (query.role) {
    where.role = query.role as PrismaRole;
  }
  if (query.status) {
    where.status = query.status as UserStatus;
  }
  if (query.emailVerified === true) {
    where.emailVerified = { not: null };
  } else if (query.emailVerified === false) {
    where.emailVerified = null;
  }
  if (query.createdFrom || query.createdTo) {
    where.createdAt = {};
    if (query.createdFrom) {
      where.createdAt.gte = new Date(query.createdFrom);
    }
    if (query.createdTo) {
      where.createdAt.lte = new Date(query.createdTo);
    }
  }
  if (query.hasProducerProfile === true) {
    where.producerMemberships = { some: {} };
  } else if (query.hasProducerProfile === false) {
    where.producerMemberships = { none: {} };
  }
  if (query.hasGastroProfile === true) {
    where.gastroMemberships = { some: {} };
  } else if (query.hasGastroProfile === false) {
    where.gastroMemberships = { none: {} };
  }
  if (query.hasHotelProfile === true) {
    where.hotelMemberships = { some: {} };
  } else if (query.hasHotelProfile === false) {
    where.hotelMemberships = { none: {} };
  }
  if (query.hasReferrerProfile === true) {
    where.referrerMemberships = { some: {} };
  } else if (query.hasReferrerProfile === false) {
    where.referrerMemberships = { none: {} };
  }

  const q = query.q?.trim();
  if (q) {
    const textOr: Prisma.UserWhereInput[] = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
    const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...and, { OR: textOr }];
  }

  return where;
}
