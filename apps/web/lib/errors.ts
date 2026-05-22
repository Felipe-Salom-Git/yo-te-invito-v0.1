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
      if (msg) return path ? `${path}: ${msg}` : msg;
    }
    const fromBody =
      body && 'message' in body && typeof body.message === 'string' ? body.message : null;
    if (fromBody && fromBody.trim() && fromBody !== 'Validation failed') return fromBody;
    return STATUS_MESSAGES[err.status] ?? err.message ?? `Error (${err.status})`;
  }
  if (err instanceof Error && err.message) return err.message;
  return 'Ocurrió un error. Intenta de nuevo.';
}
