import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuditLogsListQuery, AuditLogItem } from '@yo-te-invito/shared';

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminAuditService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    query: AuditLogsListQuery & { tenantId: string },
  ): Promise<AuditLogsResponse> {
    const where = { tenantId: query.tenantId };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const items: AuditLogItem[] = data.map((r: { id: string; tenantId: string; actorId: string; actorRole: string; action: string; entityType: string; entityId: string; before: unknown; after: unknown; metadata: unknown; createdAt: Date }) => ({
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
    }));

    return {
      data: items,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }
}
