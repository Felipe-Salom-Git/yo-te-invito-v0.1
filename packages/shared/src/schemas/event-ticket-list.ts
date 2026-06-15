import { z } from 'zod';
import { ticketStatusWithTransferSchema } from './ticket-transfer-offer';

export const eventTicketReferralSchema = z.object({
  viaReferral: z.boolean(),
  referrerName: z.string().nullable().optional(),
  referrerEmail: z.string().nullable().optional(),
  referralCode: z.string().nullable().optional(),
});
export type EventTicketReferral = z.infer<typeof eventTicketReferralSchema>;

export const eventTicketScanSchema = z.object({
  scanned: z.boolean(),
  scannedAt: z.string().datetime().nullable().optional(),
  scannedByLabel: z.string().nullable().optional(),
  scanCount: z.number().int().optional(),
  lastScanResult: z.string().nullable().optional(),
});
export type EventTicketScan = z.infer<typeof eventTicketScanSchema>;

/** Operational ticket row for producer portal. */
export const producerEventTicketItemSchema = z.object({
  ticketId: z.string(),
  shortCode: z.string(),
  buyerName: z.string(),
  buyerEmail: z.string().nullable().optional(),
  ticketTypeName: z.string(),
  occurrenceId: z.string().nullable().optional(),
  occurrenceStartAt: z.string().datetime().nullable().optional(),
  occurrenceLabel: z.string().nullable().optional(),
  status: ticketStatusWithTransferSchema,
  issuedAt: z.string().datetime(),
  priceCents: z.number().int().nullable().optional(),
  currency: z.string().optional(),
  referral: eventTicketReferralSchema,
  scan: eventTicketScanSchema,
  qrPayload: z.string().optional(),
});
export type ProducerEventTicketItem = z.infer<typeof producerEventTicketItemSchema>;

export const producerEventTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  status: z.string().optional(),
  occurrenceId: z.string().optional(),
  q: z.string().optional(),
  referrer: z.enum(['true', 'false']).optional(),
  scanned: z.enum(['true', 'false']).optional(),
});
export type ProducerEventTicketsQuery = z.infer<typeof producerEventTicketsQuerySchema>;

export const producerEventTicketsKpisSchema = z.object({
  total: z.number().int(),
  used: z.number().int(),
  available: z.number().int(),
  viaReferral: z.number().int(),
  transferredOrRevoked: z.number().int(),
});
export type ProducerEventTicketsKpis = z.infer<typeof producerEventTicketsKpisSchema>;

export const producerEventTicketsResponseSchema = z.object({
  tickets: z.array(producerEventTicketItemSchema),
  pagination: z.object({
    page: z.number().int(),
    limit: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  }),
  kpis: producerEventTicketsKpisSchema,
});
export type ProducerEventTicketsResponse = z.infer<typeof producerEventTicketsResponseSchema>;

/** Operational ticket row for scanner PWA (no payment fields). */
export const scannerEventTicketItemSchema = z.object({
  ticketId: z.string(),
  shortCode: z.string(),
  qrPayload: z.string(),
  holderName: z.string(),
  ticketTypeName: z.string(),
  occurrenceId: z.string().nullable().optional(),
  occurrenceStartAt: z.string().datetime().nullable().optional(),
  occurrenceLabel: z.string().nullable().optional(),
  status: ticketStatusWithTransferSchema,
  scannedAt: z.string().datetime().nullable().optional(),
  scannedBy: z.string().nullable().optional(),
  scanCount: z.number().int().optional(),
  lastScanResult: z.string().nullable().optional(),
});
export type ScannerEventTicketItem = z.infer<typeof scannerEventTicketItemSchema>;

export const scannerEventTicketsQuerySchema = z.object({
  occurrenceId: z.string().optional(),
  q: z.string().optional(),
  status: z.string().optional(),
  scanned: z.enum(['true', 'false']).optional(),
});
export type ScannerEventTicketsQuery = z.infer<typeof scannerEventTicketsQuerySchema>;

export const scannerEventTicketsResponseSchema = z.object({
  tickets: z.array(scannerEventTicketItemSchema),
  total: z.number().int(),
});
export type ScannerEventTicketsResponse = z.infer<typeof scannerEventTicketsResponseSchema>;
