import { z } from 'zod';

export const adminDeepDeleteEntityTypeSchema = z.enum([
  'USER',
  'PRODUCER',
  'GASTRO',
  'HOTEL',
  'EVENT',
  'EXCURSION_OPERATOR',
  'RENTAL_LOCATION',
]);

export const adminDeepDeleteImpactSeveritySchema = z.enum([
  'info',
  'warning',
  'critical',
  'blocker',
]);

export const adminDeepDeleteImpactActionSchema = z.enum([
  'delete',
  'soft_delete',
  'detach',
  'keep',
  'block',
]);

export const adminDeepDeleteImpactItemSchema = z.object({
  type: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
  severity: adminDeepDeleteImpactSeveritySchema,
  action: adminDeepDeleteImpactActionSchema,
  adminPath: z.string().optional(),
  description: z.string().optional(),
});

export const adminDeepDeletePreflightSchema = z.object({
  entityType: adminDeepDeleteEntityTypeSchema,
  entityId: z.string(),
  entityLabel: z.string(),
  canDelete: z.boolean(),
  requiresForce: z.boolean(),
  requiresExtraConfirmation: z.boolean(),
  summary: z.object({
    deleteCount: z.number().int().min(0),
    softDeleteCount: z.number().int().min(0),
    criticalCount: z.number().int().min(0),
    blockerCount: z.number().int().min(0),
  }),
  impacts: z.array(adminDeepDeleteImpactItemSchema),
});

export const adminDeepDeleteBodySchema = z.object({
  force: z.boolean().optional(),
  confirmationText: z.string(),
  acknowledgedCriticalHistory: z.boolean().optional(),
});

export const adminDeepDeleteResponseSchema = z.object({
  entityType: adminDeepDeleteEntityTypeSchema,
  entityId: z.string(),
  deleted: z.literal(true),
  mode: z.enum(['hard', 'soft']),
});

export type AdminDeepDeleteEntityType = z.infer<typeof adminDeepDeleteEntityTypeSchema>;
export type AdminDeepDeleteImpactSeverity = z.infer<typeof adminDeepDeleteImpactSeveritySchema>;
export type AdminDeepDeleteImpactItem = z.infer<typeof adminDeepDeleteImpactItemSchema>;
export type AdminDeepDeletePreflight = z.infer<typeof adminDeepDeletePreflightSchema>;
export type AdminDeepDeleteBody = z.infer<typeof adminDeepDeleteBodySchema>;
export type AdminDeepDeleteResponse = z.infer<typeof adminDeepDeleteResponseSchema>;
