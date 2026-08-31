import { z } from 'zod';

/** Normalize scanner username for storage and lookup (case-insensitive). */
export function normalizeScannerUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export const scannerUsernameSchema = z
  .string()
  .trim()
  .min(3, 'El usuario debe tener al menos 3 caracteres')
  .max(32, 'El usuario no puede superar 32 caracteres')
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    'Solo letras, números, punto, guión y guión bajo',
  )
  .transform(normalizeScannerUsername);

export type ScannerUsername = z.infer<typeof scannerUsernameSchema>;
