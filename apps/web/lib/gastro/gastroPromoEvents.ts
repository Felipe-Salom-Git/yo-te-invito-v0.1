/**
 * G12.2 — Gastro promotional events: portal form ↔ API payload and lifecycle labels.
 * G12.2 — Eventos publicitarios del local: formulario ↔ payload y etiquetas de estado.
 */
import {
  GASTRO_PROMO_EVENT_SUBMITTABLE_STATUSES,
  type GastroPromoEventCreateInput,
  type GastroPromoEventResponse,
  type GastroPromoEventStatus,
} from '@yo-te-invito/shared';
import { isoToDatetimeLocalInput, localInputToIso } from '@/lib/producer/datetime-local';

export const GASTRO_CONTENT_TAB = { PUBLICATIONS: 'publicaciones', EVENTS: 'eventos' } as const;
export type GastroContentTab = (typeof GASTRO_CONTENT_TAB)[keyof typeof GASTRO_CONTENT_TAB];

export function resolveGastroContentTab(raw: string | null | undefined): GastroContentTab {
  return raw === GASTRO_CONTENT_TAB.EVENTS ? GASTRO_CONTENT_TAB.EVENTS : GASTRO_CONTENT_TAB.PUBLICATIONS;
}

export const GASTRO_PROMO_EVENT_STATUS_LABEL: Record<GastroPromoEventStatus, string> = {
  DRAFT: 'Borrador',
  PENDING: 'En revisión',
  APPROVED: 'Publicado',
  PAUSED: 'Pausado por administración',
  CANCELLED: 'Rechazado / cancelado',
};

export const GASTRO_PROMO_EVENT_STATUS_HINT: Record<GastroPromoEventStatus, string> = {
  DRAFT: 'Solo vos lo ves. Envialo a revisión para publicarlo.',
  PENDING: 'Administración lo está revisando. Se publica al aprobarse.',
  APPROVED: 'Visible en Eventos y en la ficha del local hasta su fecha.',
  PAUSED: 'Oculto del público por administración.',
  CANCELLED: 'No se publica. Podés corregirlo y volver a enviarlo.',
};

export function canSubmitGastroPromoEvent(status: GastroPromoEventStatus): boolean {
  return GASTRO_PROMO_EVENT_SUBMITTABLE_STATUSES.includes(status);
}

export function gastroPromoEventPublicHref(eventId: string): string {
  return `/events/${eventId}`;
}

/** «sáb 10 dic · 22:00» (es-AR, local time). */
export function formatGastroPromoEventWhen(startAt: string): { date: string; time: string; label: string } {
  const d = new Date(startAt);
  const date = d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return { date, time, label: `${date} · ${time}` };
}

export type GastroPromoEventFormState = {
  title: string;
  description: string;
  galleryUrls: string[];
  startLocal: string;
  endLocal: string;
  /** false → custom venue fields below; true → the local's own name / address. */
  atLocal: boolean;
  venueName: string;
  venueAddress: string;
  city: string;
  subcategoryId: string;
  tagIds: string[];
};

export const EMPTY_GASTRO_PROMO_EVENT_FORM: GastroPromoEventFormState = {
  title: '',
  description: '',
  galleryUrls: [],
  startLocal: '',
  endLocal: '',
  atLocal: true,
  venueName: '',
  venueAddress: '',
  city: '',
  subcategoryId: '',
  tagIds: [],
};

export function gastroPromoEventToForm(
  event: GastroPromoEventResponse,
  local: { displayName: string; address: string | null },
): GastroPromoEventFormState {
  const atLocal =
    (event.venueName ?? '') === local.displayName && (event.venueAddress ?? '') === (local.address ?? '');
  return {
    title: event.title,
    description: event.description ?? '',
    galleryUrls: event.galleryUrls,
    startLocal: isoToDatetimeLocalInput(event.startAt),
    endLocal: event.endAt ? isoToDatetimeLocalInput(event.endAt) : '',
    atLocal,
    venueName: atLocal ? '' : (event.venueName ?? ''),
    venueAddress: atLocal ? '' : (event.venueAddress ?? ''),
    city: atLocal ? '' : (event.city ?? ''),
    subcategoryId: event.subcategoryId ?? '',
    tagIds: event.tags.map((t) => t.id),
  };
}

export type GastroPromoEventFormResult =
  | { ok: true; data: Omit<GastroPromoEventCreateInput, 'profileId' | 'submitForReview'> }
  | { ok: false; errors: Partial<Record<keyof GastroPromoEventFormState, string>> };

/** Validates the portal form and maps it to the API body (same rules as the Zod schema). */
export function buildGastroPromoEventPayload(form: GastroPromoEventFormState): GastroPromoEventFormResult {
  const errors: Partial<Record<keyof GastroPromoEventFormState, string>> = {};
  const title = form.title.trim();
  if (title.length < 3) errors.title = 'El título debe tener al menos 3 caracteres';
  const start = form.startLocal ? new Date(form.startLocal) : null;
  if (!start || Number.isNaN(start.getTime())) errors.startLocal = 'Indicá fecha y hora del evento';
  const end = form.endLocal ? new Date(form.endLocal) : null;
  if (end && start && end < start) errors.endLocal = 'La fecha de fin no puede ser anterior al inicio';
  if (!form.atLocal && !form.venueName.trim()) errors.venueName = 'Indicá el lugar del evento';
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const gallery = form.galleryUrls.filter(Boolean);
  return {
    ok: true,
    data: {
      title,
      description: form.description.trim() || null,
      galleryUrls: gallery,
      coverImageUrl: gallery[0] ?? null,
      startAt: localInputToIso(form.startLocal),
      endAt: form.endLocal ? localInputToIso(form.endLocal) : null,
      // null → API defaults to the local's name / address / city / province.
      venueName: form.atLocal ? null : form.venueName.trim(),
      venueAddress: form.atLocal ? null : form.venueAddress.trim() || null,
      city: form.atLocal ? null : form.city.trim() || null,
      subcategoryId: form.subcategoryId || null,
      tagIds: form.tagIds,
    },
  };
}
