import {
  LEGAL_KEY_TO_SLUG,
  LEGAL_SLUG_TO_KEY,
  type LegalDocumentKey,
} from '@yo-te-invito/shared';

export { LEGAL_SLUG_TO_KEY, LEGAL_KEY_TO_SLUG };

/** Public slugs only — excludes internal documents. */
export const PUBLIC_LEGAL_SLUGS = Object.keys(LEGAL_SLUG_TO_KEY);

export function isPublicLegalSlug(slug: string): slug is keyof typeof LEGAL_SLUG_TO_KEY {
  return slug in LEGAL_SLUG_TO_KEY;
}

export function publicLegalSlugToKey(slug: string): LegalDocumentKey | null {
  return isPublicLegalSlug(slug) ? LEGAL_SLUG_TO_KEY[slug] : null;
}

const SEO_DESCRIPTIONS: Record<string, string> = {
  terminos: 'Términos y condiciones generales de uso de Yo Te Invito.',
  privacidad: 'Política de privacidad y tratamiento de datos en Yo Te Invito.',
  'compras-cancelaciones-reembolsos':
    'Política de compra, cancelación y reembolso de entradas y servicios.',
  productores: 'Condiciones para productores y productoras en Yo Te Invito.',
  gastronomicos: 'Condiciones para locales gastronómicos en Yo Te Invito.',
  rentals: 'Condiciones para proveedores de rentals y equipos.',
  hoteles: 'Condiciones para establecimientos hoteleros.',
  referidos: 'Condiciones para el programa de referidos.',
  'transferencia-tickets': 'Condiciones para la transferencia de tickets entre usuarios.',
};

export function publicLegalSeoDescription(slug: string): string {
  return (
    SEO_DESCRIPTIONS[slug] ??
    'Documentación legal de Yo Te Invito.'
  );
}

export const DEFAULT_PUBLIC_LEGAL_TENANT_ID =
  process.env.NEXT_PUBLIC_DEFAULT_TENANT_ID ?? 'tenant-demo';
