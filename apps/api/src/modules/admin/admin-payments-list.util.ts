import type { PaymentStatus, Prisma } from '@prisma/client';
import type { AdminPaymentsListQuery } from '@yo-te-invito/shared';

export function buildAdminPaymentsWhere(
  tenantId: string,
  query: AdminPaymentsListQuery,
): Prisma.PaymentWhereInput {
  const where: Prisma.PaymentWhereInput = { tenantId };

  if (query.provider) {
    where.provider = query.provider;
  }
  if (query.status) {
    where.status = query.status as PaymentStatus;
  }

  if (query.reconciliationStatus) {
    where.metadata = {
      path: ['reconciliationStatus'],
      equals: query.reconciliationStatus,
    };
  } else if (query.requiresManualReview === true) {
    where.metadata = {
      path: ['reconciliationStatus'],
      equals: 'REQUIRES_MANUAL_REVIEW',
    };
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

  const q = query.q?.trim();
  if (q) {
    const or: Prisma.PaymentWhereInput[] = [
      { id: { contains: q, mode: 'insensitive' } },
      { orderId: { contains: q, mode: 'insensitive' } },
      { externalReference: { contains: q, mode: 'insensitive' } },
      { externalPaymentId: { contains: q, mode: 'insensitive' } },
      { order: { buyerEmail: { contains: q, mode: 'insensitive' } } },
    ];
    const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...and, { OR: or }];
  }

  return where;
}
