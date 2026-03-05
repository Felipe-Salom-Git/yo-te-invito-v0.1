import { z } from 'zod';
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
 * Request body for ticket scan validation (legacy)
 * Cuerpo de petición para validación de escaneo de ticket
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

/**
 * Response shape for scan validation (legacy)
 * Forma de respuesta para validación de escaneo
 */
export const scanResponseSchema = z.object({
  result: z.nativeEnum(ScanResult),
  ticketId: z.string().optional(),
  eventId: z.string().optional(),
  ticketTypeName: z.string().optional(),
  message: z.string().optional(),
});

export type ScanResponse = z.infer<typeof scanResponseSchema>;
