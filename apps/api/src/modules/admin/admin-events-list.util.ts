import { EventStatus, Prisma } from '@prisma/client';
import type { AdminEventsListQuery, AdminEventsListView } from '@yo-te-invito/shared';

const STATUS_MAP: Record<string, EventStatus> = {
  draft: 'DRAFT',
  pending: 'PENDING',
  approved: 'APPROVED',
  paused: 'PAUSED',
  cancelled: 'CANCELLED',
};

export function resolveAdminEventStatus(
  query: Pick<AdminEventsListQuery, 'status' | 'pendingOnly' | 'view'>,
): EventStatus | undefined {
  if (query.status) {
    return STATUS_MAP[query.status];
  }
  if (query.pendingOnly) {
    return 'PENDING';
  }
  if (!query.view || query.view === 'all' || query.view === 'active' || query.view === 'past') {
    return undefined;
  }
  if (query.view === 'pending') return 'PENDING';
  if (query.view === 'approved') return 'APPROVED';
  if (query.view === 'rejected') return 'CANCELLED';
  return undefined;
}

export function buildAdminEventsWhere(
  tenantId: string,
  query: AdminEventsListQuery,
  now = new Date(),
): Prisma.EventWhereInput {
  const where: Prisma.EventWhereInput = {
    tenantId,
    deletedAt: null,
  };

  const status = resolveAdminEventStatus(query);
  if (status) {
    where.status = status;
  }

  if (query.category) {
    where.category = query.category;
  }
  if (query.subcategoryId) {
    where.subcategoryId = query.subcategoryId;
  }
  if (query.city?.trim()) {
    where.city = { contains: query.city.trim(), mode: 'insensitive' };
  }
  if (query.producerProfileId) {
    where.producerProfileId = query.producerProfileId;
  }
  if (query.dateFrom || query.dateTo) {
    where.startAt = {};
    if (query.dateFrom) {
      where.startAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.startAt.lte = new Date(query.dateTo);
    }
  }

  const q = query.q?.trim();
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { city: { contains: q, mode: 'insensitive' } },
      { venueName: { contains: q, mode: 'insensitive' } },
      {
        producerProfile: {
          displayName: { contains: q, mode: 'insensitive' },
        },
      },
    ];
  }

  applyViewLifecycleFilter(where, query.view, now);
  return where;
}

function applyViewLifecycleFilter(
  where: Prisma.EventWhereInput,
  view: AdminEventsListView | undefined,
  now: Date,
): void {
  if (!view || view === 'all' || view === 'pending' || view === 'approved' || view === 'rejected') {
    return;
  }

  if (view === 'active') {
    where.status = 'APPROVED';
    where.startAt = { lte: now };
    const lifecycle: Prisma.EventWhereInput = {
      OR: [{ endAt: { gte: now } }, { endAt: null }],
    };
    where.AND = Array.isArray(where.AND)
      ? [...where.AND, lifecycle]
      : where.AND
        ? [where.AND, lifecycle]
        : [lifecycle];
    return;
  }

  if (view === 'past') {
    const lifecycle: Prisma.EventWhereInput = {
      OR: [{ endAt: { lt: now } }, { endAt: null, startAt: { lt: now } }],
    };
    where.AND = Array.isArray(where.AND)
      ? [...where.AND, lifecycle]
      : where.AND
        ? [where.AND, lifecycle]
        : [lifecycle];
  }
}

export function buildAdminEventsOrderBy(
  query: Pick<AdminEventsListQuery, 'pendingOnly' | 'view'>,
): Prisma.EventOrderByWithRelationInput[] {
  if (query.pendingOnly || query.view === 'pending') {
    return [{ createdAt: 'desc' }];
  }
  return [{ createdAt: 'desc' }, { startAt: 'asc' }];
}
