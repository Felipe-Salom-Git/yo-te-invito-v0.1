import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogsListQuery, AuditLogItem, AuditLogsListResponse } from '@yo-te-invito/shared';
import { buildAuditLogSummary } from './admin-audit-summary.util';
import { buildAdminAuditWhere } from './admin-audit-list.util';

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: AuditLogsListQuery & { tenantId: string },
  ): Promise<AuditLogsListResponse> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    let actorIdsFromEmail: string[] | undefined;
    if (query.actorEmail?.trim()) {
      const users = await this.prisma.user.findMany({
        where: {
          tenantId: query.tenantId,
          deletedAt: null,
          email: { contains: query.actorEmail.trim(), mode: 'insensitive' },
        },
        select: { id: true },
        take: 50,
      });
      actorIdsFromEmail = users.map((u) => u.id);
    }

    const where = buildAdminAuditWhere(query.tenantId, query, actorIdsFromEmail);

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorIds = [...new Set(data.map((r) => r.actorId))];
    const users =
      actorIds.length > 0
        ? await this.prisma.user.findMany({
            where: {
              tenantId: query.tenantId,
              id: { in: actorIds },
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    const items: AuditLogItem[] = data.map((r) => {
      const user = userById.get(r.actorId);
      const displayName = user
        ? `${user.firstName} ${user.lastName}`.trim() || null
        : null;
      return {
        id: r.id,
        tenantId: r.tenantId,
        actorId: r.actorId,
        actorRole: r.actorRole,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        before: r.before,
        after: r.after,
        metadata: r.metadata,
        createdAt: r.createdAt.toISOString(),
        actorEmail: user?.email ?? null,
        actorDisplayName: displayName,
        summary: buildAuditLogSummary(r.action, r.entityType, r.before, r.after),
      };
    });

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
