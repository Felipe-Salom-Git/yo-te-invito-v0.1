/**
 * Error message extraction for user-facing toasts.
 * Handles ApiClientError (status, body) and generic Error.
 */

import { ApiClientError } from './api/client';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Solicitud incorrecta',
  401: 'Tu sesión expiró. Volvé a iniciar sesión para continuar.',
  403: 'No tienes permiso para esta acción',
  404: 'No encontrado',
  422: 'Datos inválidos',
  500: 'Error del servidor. Intenta más tarde.',
};

const ERROR_CODE_MESSAGES: Record<string, string> = {
  EMAIL_ALREADY_EXISTS: 'Ya existe un usuario con ese email.',
  PRODUCER_PROFILE_NOT_FOUND: 'No tenés una productora activa asociada a tu cuenta.',
  GASTRO_PROFILE_NOT_FOUND: 'No tenés un local gastronómico activo asociado a tu cuenta.',
  FORBIDDEN: 'No tenés permiso para esta acción.',
  INVALID_PASSWORD: 'INVALID_PASSWORD',
  OCCURRENCE_REQUIRED: 'Seleccioná para qué fecha es esta entrada.',
  USER_DELETE_BLOCKED:
    'No se puede eliminar este usuario porque tiene publicaciones o historial asociado.',
};

export function isApiNotFoundError(err: unknown): boolean {
  return err instanceof ApiClientError && err.status === 404;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const body = err.body && typeof err.body === 'object' ? (err.body as Record<string, unknown>) : null;
    const details = body?.details;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0] as { path?: unknown[]; message?: string };
      const path =
        Array.isArray(first.path) && first.path.length > 0
          ? first.path.join('.')
          : null;
      const msg = first.message?.trim();
      if (msg) {
        if (msg.includes('open must be before close')) {
          return 'El horario de apertura debe ser anterior al horario de cierre.';
        }
        return path ? `${path}: ${msg}` : msg;
      }
    }
    const fromBody =
      body && 'message' in body && typeof body.message === 'string' ? body.message : null;
    const code = body && 'code' in body && typeof body.code === 'string' ? body.code : null;
    if (code && ERROR_CODE_MESSAGES[code]) return ERROR_CODE_MESSAGES[code];
    if (fromBody?.trim()) {
      const lower = fromBody.toLowerCase();
      if (lower.includes('invalid or expired token')) {
        return 'Tu sesión expiró. Volvé a iniciar sesión para continuar.';
      }
      if (fromBody !== 'Validation failed') return fromBody;
    }
    return STATUS_MESSAGES[err.status] ?? err.message ?? `Error (${err.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}
