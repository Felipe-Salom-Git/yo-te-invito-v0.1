import { z } from 'zod';

/**
 * G12.2 — Promotional events created by a gastro local (reuse `Event`, no ticketing).
 * G12.2 — Eventos publicitarios creados por un local gastronómico (reutilizan `Event`, sin ticketera).
 */

export const EVENT_OWNER_KIND = {
  PRODUCER: 'PRODUCER',
  GASTRO: 'GASTRO',
  /** Admin general publications / legacy rows / local page-events (no profile owner). */
  PLATFORM: 'PLATFORM',
} as const;
export type EventOwnerKind = (typeof EVENT_OWNER_KIND)[keyof typeof EVENT_OWNER_KIND];

/** Owner of an Event row. Producer and gastro owners never coexist (DB CHECK). */
export function resolveEventOwnerKind(event: {
  producerProfileId?: string | null;
  gastroProfileId?: string | null;
}): EventOwnerKind {
  if (event.gastroProfileId) return EVENT_OWNER_KIND.GASTRO;
  if (event.producerProfileId) return EVENT_OWNER_KIND.PRODUCER;
  return EVENT_OWNER_KIND.PLATFORM;
}

/** Gastro promo events are managed only from the gastro portal (never producer / ticketing APIs). */
export function isGastroPromoEvent(event: { gastroProfileId?: string | null }): boolean {
  return Boolean(event.gastroProfileId);
}

export const eventGastroOrganizerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  logoUrl: z.string().nullable().optional(),
});
export type EventGastroOrganizer = z.infer<typeof eventGastroOrganizerSchema>;
