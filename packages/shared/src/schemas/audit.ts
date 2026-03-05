import { z } from 'zod';

export const auditLogsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditLogsListQuery = z.infer<typeof auditLogsListQuerySchema>;

export const auditLogItemSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  actorId: z.string(),
  actorRole: z.string(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  before: z.unknown().nullable(),
  after: z.unknown().nullable(),
  metadata: z.unknown().nullable(),
  createdAt: z.string().datetime(),
});

export type AuditLogItem = z.infer<typeof auditLogItemSchema>;
