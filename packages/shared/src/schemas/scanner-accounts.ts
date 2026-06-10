import { z } from 'zod';

export const scannerParentProfileTypeSchema = z.enum([
  'PRODUCER',
  'GASTRO',
  'EXCURSION_OPERATOR',
  'RENTAL_LOCATION',
]);
export type ScannerParentProfileType = z.infer<typeof scannerParentProfileTypeSchema>;

export const scannerAccountSummarySchema = z.object({
  id: z.string(),
  scannerUserId: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  userStatus: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']),
  isActive: z.boolean(),
  parentProfileType: scannerParentProfileTypeSchema,
  parentProfileId: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type ScannerAccountSummary = z.infer<typeof scannerAccountSummarySchema>;

export const scannerAccountsListResponseSchema = z.object({
  data: z.array(scannerAccountSummarySchema),
});
export type ScannerAccountsListResponse = z.infer<typeof scannerAccountsListResponseSchema>;

export const scannerAccountSelfResponseSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  parentProfileType: scannerParentProfileTypeSchema,
  parentProfileId: z.string(),
  parentDisplayName: z.string().nullable(),
  isActive: z.boolean(),
});
export type ScannerAccountSelfResponse = z.infer<typeof scannerAccountSelfResponseSchema>;

export const adminScannerAccountsListQuerySchema = z.object({
  parentProfileType: scannerParentProfileTypeSchema.optional(),
  parentProfileId: z.string().optional(),
});
export type AdminScannerAccountsListQuery = z.infer<typeof adminScannerAccountsListQuerySchema>;

/** Admin-only link of an existing SCANNER user to a parent profile (Slice 5.1 QA; portal create in 5.2). */
export const linkScannerAccountBodySchema = z.object({
  scannerUserId: z.string().min(1),
  parentProfileType: scannerParentProfileTypeSchema,
  parentProfileId: z.string().min(1),
});
export type LinkScannerAccountBody = z.infer<typeof linkScannerAccountBodySchema>;
