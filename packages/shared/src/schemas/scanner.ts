import { z } from 'zod';
import { ticketStatusWithTransferSchema } from './ticket-transfer-offer';
import { ScanResult } from '../enums';

/**
 * Query schema for POST /scanner/validate
 */
export const validateTicketQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type ValidateTicketQuery = z.infer<typeof validateTicketQuerySchema>;

/**
 * Body schema for POST /scanner/validate
 */
export const validateTicketBodySchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  qrPayload: z.string().min(1, 'qrPayload is required'),
  deviceId: z.string().optional(),
  /** Multi-date events: validate ticket against selected show date. */
  occurrenceId: z.string().min(1).optional(),
});
export type ValidateTicketBody = z.infer<typeof validateTicketBodySchema>;

/**
 * Response schema for POST /scanner/validate
 */
export const validateTicketResponseSchema = z.object({
  isValid: z.boolean(),
  ticketId: z.string().optional(),
  ticketTypeName: z.string().optional(),
  message: z.string(),
});
export type ValidateTicketResponse = z.infer<typeof validateTicketResponseSchema>;

/**
 * Body schema for POST /scanner/scan (authenticated)
 */
export const scanBodySchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
  qrPayload: z.string().min(1, 'qrPayload is required'),
  deviceId: z.string().optional(),
  occurrenceId: z.string().min(1).optional(),
});
export type ScanBody = z.infer<typeof scanBodySchema>;

/**
 * Response schema for POST /scanner/scan
 */
export const scanResponseSchema = z.object({
  result: z.enum(['OK', 'ALREADY_USED', 'INVALID', 'REVOKED', 'WRONG_OCCURRENCE']),
  ticketId: z.string().optional(),
  ticketTypeName: z.string().optional(),
  message: z.string().optional(),
});
export type ScanResponse = z.infer<typeof scanResponseSchema>;

/**
 * Params schema for GET /scanner/events/:eventId/tickets
 */
export const eventTicketsParamsSchema = z.object({
  eventId: z.string().min(1, 'eventId is required'),
});
export type EventTicketsParams = z.infer<typeof eventTicketsParamsSchema>;

/**
 * Ticket item for offline preload
 */
export const offlineTicketSchema = z.object({
  ticketId: z.string(),
  qrPayload: z.string(),
  status: ticketStatusWithTransferSchema,
});
export type OfflineTicket = z.infer<typeof offlineTicketSchema>;

/**
 * Response schema for GET /scanner/events/:eventId/tickets
 */
export const eventTicketsResponseSchema = z.object({
  tickets: z.array(offlineTicketSchema),
});
export type EventTicketsResponse = z.infer<typeof eventTicketsResponseSchema>;

/**
 * Request body for ticket scan validation (legacy)
 */
export const scanRequestSchema = z.object({
  qrCode: z.string().min(1, 'qrCode is required'),
  metadata: z
    .object({
      deviceId: z.string().optional(),
      scannerVersion: z.string().optional(),
      doorLocation: z.string().optional(),
    })
    .optional(),
});

export type ScanRequest = z.infer<typeof scanRequestSchema>;

/** Query for GET /scanner/events/:eventId/logs */
export const scannerLogsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
export type ScannerLogsQuery = z.infer<typeof scannerLogsQuerySchema>;

/** Scan log item */
export const ticketScanLogItemSchema = z.object({
  id: z.string(),
  ticketId: z.string().nullable(),
  eventId: z.string(),
  qrPayload: z.string(),
  result: z.enum(['OK', 'ALREADY_USED', 'INVALID', 'REVOKED']),
  scannedAt: z.string().datetime(),
});
export type TicketScanLogItem = z.infer<typeof ticketScanLogItemSchema>;

/** Event selectable in scanner PWA (producer parent). */
export const scannerScanTargetEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  startAt: z.string().datetime().nullable(),
  city: z.string().nullable(),
  status: z.string(),
  ticketsValid: z.number().int().nonnegative().optional(),
  scanCount: z.number().int().nonnegative().optional(),
});
export type ScannerScanTargetEvent = z.infer<typeof scannerScanTargetEventSchema>;

/** Gastro discount selectable in scanner PWA. */
export const scannerScanTargetDiscountSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  validFrom: z.string().datetime().nullable(),
  validTo: z.string().datetime().nullable(),
  validationCount: z.number().int().nonnegative().optional(),
});
export type ScannerScanTargetDiscount = z.infer<typeof scannerScanTargetDiscountSchema>;

/** GET /scanner/scan-targets — scoped list for active scanner account. */
export const scannerScanTargetsResponseSchema = z.object({
  parentProfileType: z.enum([
    'PRODUCER',
    'GASTRO',
    'EXCURSION_OPERATOR',
    'RENTAL_LOCATION',
  ]),
  parentProfileId: z.string(),
  parentDisplayName: z.string().nullable(),
  events: z.array(scannerScanTargetEventSchema),
  discounts: z.array(scannerScanTargetDiscountSchema),
});
export type ScannerScanTargetsResponse = z.infer<typeof scannerScanTargetsResponseSchema>;
