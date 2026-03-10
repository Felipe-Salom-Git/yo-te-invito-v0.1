/**
 * Helpers to classify events by lifecycle (past, active, future).
 * Active = event has started but not ended; Future = not yet started; Past = ended.
 */

export function isEventPast(startAt: string, endAt?: string | null): boolean {
  const end = endAt ? new Date(endAt) : new Date(startAt);
  return end < new Date();
}

export function isEventActive(startAt: string, endAt?: string | null): boolean {
  const start = new Date(startAt);
  const end = endAt ? new Date(endAt) : start;
  const now = new Date();
  return start <= now && end >= now;
}

export function isEventFuture(startAt: string): boolean {
  return new Date(startAt) > new Date();
}
