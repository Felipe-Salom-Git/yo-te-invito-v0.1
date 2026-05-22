import { AuditAction, Prisma } from '@prisma/client';
import type { AuditLogsListQuery } from '@yo-te-invito/shared';

export function buildAdminAuditWhere(
  tenantId: string,
  query: AuditLogsListQuery,
  actorIdsFromEmail?: string[],
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = { tenantId };

  if (query.action) {
    where.action = query.action;
  }
  if (query.entityType?.trim()) {
    where.entityType = { equals: query.entityType.trim(), mode: 'insensitive' };
  }
  if (query.actorUserId) {
    where.actorId = query.actorUserId;
  } else if (actorIdsFromEmail && actorIdsFromEmail.length > 0) {
    where.actorId = { in: actorIdsFromEmail };
  } else if (query.actorEmail?.trim() && actorIdsFromEmail?.length === 0) {
    where.actorId = { in: [] };
  }

  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) {
      where.createdAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.createdAt.lte = new Date(query.dateTo);
    }
  }

  const q = query.q?.trim();
  if (q) {
    const textOr: Prisma.AuditLogWhereInput[] = [
      { entityId: { contains: q, mode: 'insensitive' } },
      { entityType: { contains: q, mode: 'insensitive' } },
      { actorRole: { contains: q, mode: 'insensitive' } },
    ];
    if (Object.values(AuditAction).includes(q as AuditAction)) {
      textOr.push({ action: q as AuditAction });
    } else {
      const matched = Object.values(AuditAction).filter((a) =>
        a.toLowerCase().includes(q.toLowerCase()),
      );
      if (matched.length > 0) {
        textOr.push({ action: { in: matched } });
      }
    }
    const and = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...and, { OR: textOr }];
  }

  return where;
}
