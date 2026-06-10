import { z } from 'zod';
import { ticketStatusWithTransferSchema } from './ticket-transfer-offer';

/** Row included in operational ticket list (PDF / snapshot). */
export const ticketListRowSchema = z.object({
  ticketId: z.string(),
  buyerName: z.string(),
  ticketType: z.string(),
  status: ticketStatusWithTransferSchema,
  code: z.string(),
  validationStatus: z.string(),
  codeSuffix: z.string(),
});
export type TicketListRow = z.infer<typeof ticketListRowSchema>;

/** GET /scanner/events/:eventId/snapshot — offline preload payload. */
export const offlineSnapshotTicketSchema = z.object({
  ticketId: z.string(),
  status: ticketStatusWithTransferSchema,
  buyerName: z.string(),
  ticketType: z.string(),
  code: z.string(),
  qrPayload: z.string(),
});
export type OfflineSnapshotTicket = z.infer<typeof offlineSnapshotTicketSchema>;

export const offlineSnapshotResponseSchema = z.object({
  snapshotId: z.string(),
  version: z.string(),
  generatedAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
  contentId: z.string(),
  contentType: z.literal('EVENT'),
  eventTitle: z.string(),
  eventStartAt: z.string().datetime().nullable(),
  tickets: z.array(offlineSnapshotTicketSchema),
});
export type OfflineSnapshotResponse = z.infer<typeof offlineSnapshotResponseSchema>;

export const offlineValidationSyncItemSchema = z.object({
  localId: z.string().min(1),
  qrPayload: z.string().min(1),
  scannedAt: z.string().datetime(),
  deviceId: z.string().optional(),
});
export type OfflineValidationSyncItem = z.infer<typeof offlineValidationSyncItemSchema>;

export const offlineValidationSyncBodySchema = z.object({
  snapshotVersion: z.string().min(1),
  contentId: z.string().min(1),
  contentType: z.literal('EVENT'),
  validations: z.array(offlineValidationSyncItemSchema).min(1).max(500),
});
export type OfflineValidationSyncBody = z.infer<typeof offlineValidationSyncBodySchema>;

export const offlineValidationSyncResultCodeSchema = z.enum([
  'synced',
  'already_used',
  'not_found',
  'conflict',
  'rejected',
  'revoked',
  'transferred',
  'forbidden_scope',
  'snapshot_stale',
]);
export type OfflineValidationSyncResultCode = z.infer<
  typeof offlineValidationSyncResultCodeSchema
>;

export const offlineValidationSyncItemResultSchema = z.object({
  localId: z.string(),
  code: offlineValidationSyncResultCodeSchema,
  ticketId: z.string().optional(),
  buyerName: z.string().optional(),
  ticketType: z.string().optional(),
  message: z.string().optional(),
});
export type OfflineValidationSyncItemResult = z.infer<
  typeof offlineValidationSyncItemResultSchema
>;

export const offlineValidationSyncResponseSchema = z.object({
  results: z.array(offlineValidationSyncItemResultSchema),
  summary: z.object({
    synced: z.number().int().nonnegative(),
    conflicts: z.number().int().nonnegative(),
    errors: z.number().int().nonnegative(),
  }),
});
export type OfflineValidationSyncResponse = z.infer<
  typeof offlineValidationSyncResponseSchema
>;
