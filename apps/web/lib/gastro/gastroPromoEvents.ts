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
import {
  MODERN_LOCATION_REQUIREMENTS,
  eventFieldsFromLocationValue,
  hasLocationFieldErrors,
  locationValueFromEventFields,
  validateLocationFields,
  type LocationFieldErrors,
} from '@/components/location/location.utils';
import { EMPTY_LOCATION_VALUE, type LocationValue } from '@/components/location/location.types';

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

export type GastroLocalEventCard = {
  id: string;
  title: string;
  href: string;
  imageUrl: string | null;
  date: string;
  time: string;
  excerpt: string | null;
};

const EXCERPT_MAX = 140;

/**
 * G12.2-D — compact cards for the «Eventos» block of /gastronomicos/:id. Only events organized by
 * THIS local (defensive, on top of the API `gastroProfileId` filter), soonest first.
 */
export function toGastroLocalEventCards(
  locationId: string,
  events: Array<{
    id: string;
    title: string;
    startAt: string;
    coverImageUrl?: string | null;
    description?: string | null;
    gastroOrganizer?: { id: string } | null;
  }>,
): GastroLocalEventCard[] {
  return events
    .filter((e) => e.gastroOrganizer?.id === locationId)
    .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
    .map((e) => {
      const when = formatGastroPromoEventWhen(e.startAt);
      const text = e.description?.trim() || null;
      return {
        id: e.id,
        title: e.title,
        href: gastroPromoEventPublicHref(e.id),
        imageUrl: e.coverImageUrl ?? null,
        date: when.date,
        time: when.time,
        excerpt: text && text.length > EXCERPT_MAX ? `${text.slice(0, EXCERPT_MAX - 1).trimEnd()}…` : text,
      };
    });
}


export const GASTRO_PROMO_EVENT_LOCATION_MODE = { LOCAL: 'local', CUSTOM: 'custom' } as const;
export type GastroPromoEventLocationMode =
  (typeof GASTRO_PROMO_EVENT_LOCATION_MODE)[keyof typeof GASTRO_PROMO_EVENT_LOCATION_MODE];

export type GastroPromoEventFormState = {
  title: string;
  description: string;
  galleryUrls: string[];
  startLocal: string;
  endLocal: string;
  /** G12.4 — `local` (default): the local's location; `custom`: modern location picker. */
  locationMode: GastroPromoEventLocationMode;
  /** Optional venue name for a custom location (e.g. «Plaza del Centro Cívico»). */
  venueName: string;
  location: LocationValue;
  subcategoryId: string;
  tagIds: string[];
};

export const EMPTY_GASTRO_PROMO_EVENT_FORM: GastroPromoEventFormState = {
  title: '',
  description: '',
  galleryUrls: [],
  startLocal: '',
  endLocal: '',
  locationMode: GASTRO_PROMO_EVENT_LOCATION_MODE.LOCAL,
  venueName: '',
  location: EMPTY_LOCATION_VALUE,
  subcategoryId: '',
  tagIds: [],
};

/**
 * Switching modes never mixes values: back to `local` discards the custom picker state; to
 * `custom` starts from an empty picker (the local's pin is not reused as a custom venue).
 */
export function switchGastroPromoEventLocationMode(
  form: GastroPromoEventFormState,
  mode: GastroPromoEventLocationMode,
): GastroPromoEventFormState {
  if (form.locationMode === mode) return form;
  return { ...form, locationMode: mode, venueName: '', location: EMPTY_LOCATION_VALUE };
}

export function gastroPromoEventToForm(event: GastroPromoEventResponse): GastroPromoEventFormState {
  const custom = !event.usesLocalLocation;
  return {
    title: event.title,
    description: event.description ?? '',
    galleryUrls: event.galleryUrls,
    startLocal: isoToDatetimeLocalInput(event.startAt),
    endLocal: event.endAt ? isoToDatetimeLocalInput(event.endAt) : '',
    locationMode: custom ? GASTRO_PROMO_EVENT_LOCATION_MODE.CUSTOM : GASTRO_PROMO_EVENT_LOCATION_MODE.LOCAL,
    venueName: custom ? (event.venueName ?? '') : '',
    location: custom ? locationValueFromEventFields(event) : EMPTY_LOCATION_VALUE,
    subcategoryId: event.subcategoryId ?? '',
    tagIds: event.tags.map((t) => t.id),
  };
}

export type GastroPromoEventFormErrors = Partial<
  Record<'title' | 'startLocal' | 'endLocal', string>
> & { location?: LocationFieldErrors };

export type GastroPromoEventFormResult =
  | { ok: true; data: Omit<GastroPromoEventCreateInput, 'profileId' | 'submitForReview'> }
  | { ok: false; errors: GastroPromoEventFormErrors };

/** Validates the portal form and maps it to the API body (same rules as the Zod schema). */
export function buildGastroPromoEventPayload(form: GastroPromoEventFormState): GastroPromoEventFormResult {
  const errors: GastroPromoEventFormErrors = {};
  const title = form.title.trim();
  if (title.length < 3) errors.title = 'El título debe tener al menos 3 caracteres';
  const start = form.startLocal ? new Date(form.startLocal) : null;
  if (!start || Number.isNaN(start.getTime())) errors.startLocal = 'Indicá fecha y hora del evento';
  const end = form.endLocal ? new Date(form.endLocal) : null;
  if (end && start && end < start) errors.endLocal = 'La fecha de fin no puede ser anterior al inicio';
  const custom = form.locationMode === GASTRO_PROMO_EVENT_LOCATION_MODE.CUSTOM;
  if (custom) {
    const locationErrors = validateLocationFields(form.location, MODERN_LOCATION_REQUIREMENTS);
    if (hasLocationFieldErrors(locationErrors)) errors.location = locationErrors;
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const gallery = form.galleryUrls.filter(Boolean);
  const venue = custom
    ? { useLocalLocation: false, venueName: form.venueName.trim() || null, ...eventFieldsFromLocationValue(form.location) }
    : { useLocalLocation: true };
  return {
    ok: true,
    data: {
      title,
      description: form.description.trim() || null,
      galleryUrls: gallery,
      coverImageUrl: gallery[0] ?? null,
      startAt: localInputToIso(form.startLocal),
      endAt: form.endLocal ? localInputToIso(form.endLocal) : null,
      ...venue,
      subcategoryId: form.subcategoryId || null,
      tagIds: form.tagIds,
    },
  };
}