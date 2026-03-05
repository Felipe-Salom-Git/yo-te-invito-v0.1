import { z } from 'zod';
import { ScanResult } from '../enums';

/**
 * Request body for ticket scan validation
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
 * Response shape for scan validation
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
