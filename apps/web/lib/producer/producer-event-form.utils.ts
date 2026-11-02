import type { ZodError } from 'zod';
import { PUBLIC_SUMMARY_MAX_LENGTH } from '@yo-te-invito/shared';
import { eventFormSchema, type EventFormData } from '@/lib/schemas/event';
import {
  MODERN_LOCATION_REQUIREMENTS,
  eventFieldsFromLocationValue,
  validateLocationFields,
  validatePresencialEventLocation,
  type LocationFieldErrors,
} from '@/components/location/location.utils';
import type { LocationValue } from '@/components/location/location.types';
import type { ProducerEventMode } from '@/lib/producer/event-mode';
import { EVENT_STATUS_LABELS } from '@/lib/domainLabels';

export const PRODUCER_EVENT_FIELD_LABELS: Record<string, string> = {
  title: 'Título',
  summary: 'Resumen',
  description: 'Descripción',
  startAt: 'Fecha de inicio',
  endAt: 'Fecha de fin',
  province: 'Provincia',
  city: 'Ciudad',
  venueName: 'Nombre del lugar',
  venueAddress: 'Dirección',
  locationMap: 'Mapa / pin',
  coverImageUrl: 'Imagen de portada',
  capacityTotal: 'Capacidad',
  status: 'Estado',
};

export function zodErrorsToFieldMap(error: ZodError): Record<string, string> {
  const errs: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !errs[key]) {
      errs[key] = issue.message;
    }
  }
  return errs;
}

export function validateProducerEventForm(
  form: EventFormData,
): { ok: true; data: EventFormData } | { ok: false; errors: Record<string, string> } {
  const parsed = eventFormSchema.safeParse(form);
  if (!parsed.success) {
    return { ok: false, errors: zodErrorsToFieldMap(parsed.error) };
  }
  if (parsed.data.endAt && parsed.data.startAt) {
    if (new Date(parsed.data.endAt) < new Date(parsed.data.startAt)) {
      return {
        ok: false,
        errors: { endAt: 'La fecha de fin debe ser posterior al inicio.' },
      };
    }
  }
  return { ok: true, data: parsed.data };
}

/** Flat error keys used by the producer form for each location field. */
export const PRODUCER_LOCATION_ERROR_KEYS = {
  province: 'province',
  city: 'city',
  address: 'venueAddress',
  map: 'locationMap',
} as const;

export function producerLocationFieldErrors(errors: Record<string, string>): LocationFieldErrors {
  return {
    province: errors[PRODUCER_LOCATION_ERROR_KEYS.province],
    city: errors[PRODUCER_LOCATION_ERROR_KEYS.city],
    address: errors[PRODUCER_LOCATION_ERROR_KEYS.address],
    map: errors[PRODUCER_LOCATION_ERROR_KEYS.map],
  };
}

export function isLocationValueChanged(a: LocationValue, b: LocationValue): boolean {
  return (
    a.province.trim() !== b.province.trim() ||
    a.city.trim() !== b.city.trim() ||
    a.address.trim() !== b.address.trim() ||
    (a.lat ?? null) !== (b.lat ?? null) ||
    (a.lng ?? null) !== (b.lng ?? null)
  );
}

function hasAnyLocationInput(location: LocationValue): boolean {
  return Boolean(
    location.province.trim() || location.city.trim() || location.address.trim() || location.lat != null,
  );
}

/**
 * G12.4 — Producer event location with the modern picker rules (province + city + address, per field).
 * - `strict` (new events / edited location): full minimum once any field is used or when publishing.
 * - not strict (legacy event, location untouched): previous presencial rule when publishing, so old
 *   events with text-only locations keep opening and saving.
 * Drafts may still omit the location entirely.
 */
export function validateProducerEventLocation(
  location: LocationValue,
  venueName: string | null | undefined,
  opts: { publishing: boolean; strict: boolean },
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (opts.strict && (opts.publishing || hasAnyLocationInput(location))) {
    const fields = validateLocationFields(location, MODERN_LOCATION_REQUIREMENTS);
    for (const [field, key] of Object.entries(PRODUCER_LOCATION_ERROR_KEYS)) {
      const message = fields[field as keyof LocationFieldErrors];
      if (message) errors[key] = message;
    }
    return errors;
  }
  const map = validateLocationFields(location, {}).map;
  if (map) errors[PRODUCER_LOCATION_ERROR_KEYS.map] = map;
  if (opts.publishing) {
    const legacy = validatePresencialEventLocation(location, venueName);
    if (legacy) errors[PRODUCER_LOCATION_ERROR_KEYS.address] = legacy;
  }
  return errors;
}

/** Location check when publishing (pending/approved). Drafts may omit location. */
export function validateProducerEventSubmit(
  form: EventFormData,
  location: LocationValue,
  options: { strictLocation?: boolean } = {},
): { ok: true } | { ok: false; errors: Record<string, string> } {
  const validated = validateProducerEventForm(form);
  if (!validated.ok) return validated;

  const status = mapProducerFormStatusToApi(validated.data.status);
  const locationErrors = validateProducerEventLocation(location, validated.data.venueName, {
    publishing: status === 'PENDING' || status === 'APPROVED',
    strict: options.strictLocation ?? true,
  });
  if (Object.keys(locationErrors).length > 0) {
    return { ok: false, errors: locationErrors };
  }
  return { ok: true };
}

export type EventFormCompletenessItem = {
  id: string;
  label: string;
  done: boolean;
};

export function computeEventFormCompleteness(
  form: EventFormData,
  location: LocationValue,
  subcategoryId: string,
): EventFormCompletenessItem[] {
  const hasTitle = form.title.trim().length > 0;
  const hasStart = !!form.startAt;
  const hasPlace =
    !!form.venueName?.trim() ||
    !!location.city?.trim() ||
    !!location.address?.trim();
  const hasImage = !!form.coverImageUrl;
  const hasSummaryOrDesc =
    !!form.summary?.trim() || !!form.description?.trim();

  return [
    { id: 'title', label: 'Título del evento', done: hasTitle },
    { id: 'start', label: 'Fecha de inicio', done: hasStart },
    { id: 'place', label: 'Lugar o ciudad', done: hasPlace },
    { id: 'copy', label: 'Resumen o descripción', done: hasSummaryOrDesc },
    { id: 'image', label: 'Imagen de portada', done: hasImage },
    { id: 'subcategory', label: 'Subcategoría (opcional)', done: !!subcategoryId },
  ];
}

export function mapProducerFormStatusToApi(
  status: EventFormData['status'],
): 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAUSED' | 'CANCELLED' {
  const map: Record<EventFormData['status'], 'DRAFT' | 'PENDING' | 'APPROVED'> = {
    draft: 'DRAFT',
    pending: 'PENDING',
    approved: 'APPROVED',
  };
  return map[status] ?? 'DRAFT';
}

export function mapApiStatusToProducerForm(
  status?: string | null,
): EventFormData['status'] {
  const s = (status ?? 'DRAFT').toUpperCase();
  if (s === 'PENDING') return 'pending';
  if (s === 'APPROVED') return 'approved';
  return 'draft';
}

export function eventDetailToFormData(event: {
  title: string;
  description?: string | null;
  summary?: string | null;
  startAt: string;
  endAt?: string | null;
  city?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  capacityTotal?: number | null;
  coverImageUrl?: string | null;
  media?: Array<{ url: string }>;
  geoLat?: number | null;
  geoLng?: number | null;
  isTicketingEnabled?: boolean;
  status?: string | null;
}): EventFormData {
  return {
    title: event.title,
    summary: event.summary ?? '',
    description: event.description ?? '',
    startAt: new Date(event.startAt).toISOString().slice(0, 16),
    endAt: event.endAt ? new Date(event.endAt).toISOString().slice(0, 16) : '',
    city: event.city || '',
    venueName: event.venueName || '',
    venueAddress: event.venueAddress || '',
    capacityTotal: event.capacityTotal ?? null,
    coverImageUrl: event.media?.[0]?.url || event.coverImageUrl || null,
    geoLat: event.geoLat ?? null,
    geoLng: event.geoLng ?? null,
    isTicketingEnabled: event.isTicketingEnabled ?? false,
    status: mapApiStatusToProducerForm(event.status),
  };
}

export function buildUpdatePayload(
  data: EventFormData,
  location: LocationValue,
  subcategoryId: string,
) {
  const loc = eventFieldsFromLocationValue(location);
  return {
    title: data.title,
    summary: data.summary?.trim()
      ? data.summary.trim().slice(0, PUBLIC_SUMMARY_MAX_LENGTH)
      : null,
    description: data.description?.trim() || null,
    startAt: new Date(data.startAt).toISOString(),
    endAt: data.endAt ? new Date(data.endAt).toISOString() : null,
    city: loc.city ?? (data.city || null),
    venueName: data.venueName || null,
    venueAddress: loc.venueAddress ?? (data.venueAddress || null),
    province: loc.province,
    googlePlaceId: loc.googlePlaceId,
    capacityTotal: data.capacityTotal ?? null,
    coverImageUrl: data.coverImageUrl || null,
    geoLat: loc.geoLat ?? data.geoLat ?? null,
    geoLng: loc.geoLng ?? data.geoLng ?? null,
    isTicketingEnabled: data.isTicketingEnabled,
    status: mapProducerFormStatusToApi(data.status),
    subcategoryId: subcategoryId || null,
  };
}

export function statusHintForProducerForm(
  status: string | undefined,
  mode: ProducerEventMode,
): string | null {
  const s = (status ?? 'DRAFT').toUpperCase();
  if (s === 'DRAFT') {
    return 'Guardá como borrador mientras completás la ficha. Cuando esté lista, enviala a revisión.';
  }
  if (s === 'PENDING') {
    return 'Tu evento está en revisión por el equipo. Te notificaremos cuando sea aprobado.';
  }
  if (s === 'APPROVED') {
    return mode === 'TICKETED'
      ? 'Evento publicado. Configurá entradas y tandas desde Gestionar si aún no lo hiciste.'
      : 'Evento publicado como difusión (sin venta de entradas en la plataforma).';
  }
  if (s === 'PAUSED' || s === 'CANCELLED') {
    return `Estado: ${EVENT_STATUS_LABELS[s] ?? s}. Contactá al equipo si necesitás cambios.`;
  }
  return null;
}

export const DEFAULT_EVENT_FORM: EventFormData = {
  title: '',
  summary: '',
  description: '',
  startAt: new Date().toISOString().slice(0, 16),
  endAt: '',
  city: '',
  venueName: '',
  venueAddress: '',
  capacityTotal: null,
  coverImageUrl: null,
  geoLat: null,
  geoLng: null,
  isTicketingEnabled: false,
  status: 'draft',
};
