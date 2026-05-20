import type { ProducerEventMode } from '@yo-te-invito/shared';

export type { ProducerEventMode };

export const PRODUCER_EVENT_MODE_QUERY = {
  publicity: 'publicity',
  ticketed: 'ticketed',
} as const;

export type ProducerEventModeQuery =
  (typeof PRODUCER_EVENT_MODE_QUERY)[keyof typeof PRODUCER_EVENT_MODE_QUERY];

export function parseProducerEventModeFromQuery(
  value: string | null | undefined,
): ProducerEventMode | null {
  if (value === PRODUCER_EVENT_MODE_QUERY.publicity) return 'PUBLICITY_ONLY';
  if (value === PRODUCER_EVENT_MODE_QUERY.ticketed) return 'TICKETED';
  return null;
}

export function producerEventModeToQuery(mode: ProducerEventMode): ProducerEventModeQuery {
  return mode === 'PUBLICITY_ONLY'
    ? PRODUCER_EVENT_MODE_QUERY.publicity
    : PRODUCER_EVENT_MODE_QUERY.ticketed;
}

export function deriveEventModeFromEvent(event: {
  isGeneralPublication?: boolean;
  eventMode?: ProducerEventMode;
}): ProducerEventMode {
  if (event.eventMode) return event.eventMode;
  return event.isGeneralPublication ? 'PUBLICITY_ONLY' : 'TICKETED';
}
