/**
 * Public Rentals copy and imagery — equipos y movilidad (no alojamiento).
 * Single source for gateway, home, categoría, explore y detalle.
 */

import { PROFILE_RESPONSIBILITY_COPY } from '@/components/auth/register/register-wizard-responsibility-copy';

export const RENTAL_PUBLIC_TAGLINE =
  'Alquiler de autos, bicis, kayaks, ropa de invierno y equipos turísticos.';

export const RENTAL_PUBLIC_SUBTITLE =
  'Equipos y movilidad para disfrutar Bariloche.';

export const RENTAL_PUBLIC_CTA_LOCAL = 'Consultá disponibilidad con el local.';

/** Primary action on rental product detail (opens WhatsApp when configured). */
export const RENTAL_DETAIL_CTA_BUTTON = 'Consultar disponibilidad';

/** Poster-style uppercase (gateway tile). */
export const RENTAL_GATEWAY_DESCRIPTION =
  'ALQUILER DE AUTOS, BICIS, KAYAKS, ROPA DE INVIERNO Y EQUIPOS TURÍSTICOS.';

/** Kayaks / aventura en lago — no casas ni hoteles. */
export const RENTAL_GATEWAY_IMAGE =
  'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80';

export const RENTAL_GATEWAY_IMAGE_ALT = 'Kayaks y equipos de aventura en el lago';

export const RENTAL_RELATED_SECTION_TITLE = 'Más equipos y movilidad';

export const RENTAL_CATEGORY_EMPTY_MESSAGE =
  'Todavía no hay equipos de alquiler publicados. Probá otra subcategoría o explorá el catálogo completo.';

export const RENTAL_EXPLORE_EMPTY_HINT =
  'No encontramos equipos con esos filtros. Probá otra subcategoría o quitá fechas (no aplican a alquiler de equipos).';

/** Clarifies rental vertical vs hotels / accommodation (public surfaces). */
export const RENTAL_NOT_ACCOMMODATION_NOTE =
  'Equipos y movilidad: autos, bicis, kayaks, ropa de nieve y aventura. No es alojamiento, cabañas ni reservas hoteleras.';

export const RENTAL_PROVIDER_CTA_TITLE = '¿Tenés un local de alquiler?';

export const RENTAL_PROVIDER_CTA_BODY =
  'Sumá tus equipos, vehículos o servicios de alquiler a Yo Te Invito. Contactanos para evaluar el alta de tu comercio.';

/** UX responsabilidad rental (Slice 11) — ver `register-wizard-responsibility-copy.ts` */
export const RENTAL_PROVIDER_RESPONSIBILITY_NOTE = PROFILE_RESPONSIBILITY_COPY.RENTAL_CONTACT;

export const RENTAL_PROVIDER_CTA_BUTTON = 'Contactar a Yo Te Invito';

export const RENTAL_PROVIDER_CTA_MAIL_SUBJECT = 'Consulta alta comercio rental — Yo Te Invito';
