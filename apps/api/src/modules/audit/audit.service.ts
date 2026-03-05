import { Injectable } from '@nestjs/common';
import { Prisma, AuditAction } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface LogActionParams {
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(params: LogActionParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId,
        actorRole: params.actorRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before != null ? (params.before as object) : Prisma.JsonNull,
        after: params.after != null ? (params.after as object) : Prisma.JsonNull,
        metadata: params.metadata != null ? (params.metadata as object) : Prisma.JsonNull,
      },
    });
  }
}
