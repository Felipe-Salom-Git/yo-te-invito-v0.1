/**
 * Error message extraction for user-facing toasts.
 * Handles ApiClientError (status, body) and generic Error.
 */

import { ApiClientError } from './api/client';

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Solicitud incorrecta',
  401: 'Debes iniciar sesión',
  403: 'No tienes permiso para esta acción',
  404: 'No encontrado',
  422: 'Datos inválidos',
  500: 'Error del servidor. Intenta más tarde.',
};

export function getErrorMessage(err: unknown): string {
  if (err instanceof ApiClientError) {
    const fromBody =
      err.body && typeof err.body === 'object' && 'message' in err.body
        ? String((err.body as { message?: string }).message)
        : null;
    if (fromBody && fromBody.trim()) return fromBody;
    return STATUS_MESSAGES[err.status] ?? err.message ?? `Error (${err.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}
