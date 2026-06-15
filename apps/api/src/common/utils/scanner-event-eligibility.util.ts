import {
  DEFAULT_EVENT_PUBLIC_TIMEZONE,
  getEventPublicVisibleUntil,
  isTimedEventCategory,
} from './event-public-visibility.util';

export type ScannerOccurrenceEligibility = {
  startAt: Date;
  endAt: Date | null;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED';
};

export type ScannerEventEligibility = {
  startAt: Date | null;
  endAt?: Date | null;
  category: string | null;
};

/** Occurrence still scannable at the door (ACTIVE + within operational visibility window). */
export function isOccurrenceScannable(
  occurrence: ScannerOccurrenceEligibility,
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): boolean {
  if (occurrence.status !== 'ACTIVE') return false;
  const anchor = occurrence.endAt ?? occurrence.startAt;
  return now.getTime() < getEventPublicVisibleUntil(anchor, timeZone).getTime();
}

/** Single-date event still scannable (uses endAt or startAt + 1AM local rule). */
export function isSingleDateEventScannable(
  event: ScannerEventEligibility,
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): boolean {
  if (!event.startAt) return false;
  if (!isTimedEventCategory(event.category)) return true;
  const anchor = event.endAt ?? event.startAt;
  return now.getTime() < getEventPublicVisibleUntil(anchor, timeZone).getTime();
}

/**
 * Producer event eligible for scanner picker:
 * - multi-date: at least one ACTIVE occurrence still scannable;
 * - single-date: not past operational window.
 */
export function isEventScannableForScanner(
  event: ScannerEventEligibility,
  occurrences: readonly ScannerOccurrenceEligibility[],
  now: Date = new Date(),
  timeZone: string = DEFAULT_EVENT_PUBLIC_TIMEZONE,
): boolean {
  const activeOccurrences = occurrences.filter((o) => o.status !== 'CANCELLED');
  if (activeOccurrences.length > 0) {
    return activeOccurrences.some((o) => isOccurrenceScannable(o, now, timeZone));
  }
  return isSingleDateEventScannable(event, now, timeZone);
}
