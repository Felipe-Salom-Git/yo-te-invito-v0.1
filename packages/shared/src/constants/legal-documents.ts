/**
 * Legal document keys, public slugs and seed metadata (Slice Legal Admin 2).
 */

export const LEGAL_DOCUMENT_KEYS = [
  'terms_general',
  'privacy_policy',
  'purchase_refund_policy',
  'producer_terms',
  'gastro_terms',
  'rental_terms',
  'hotel_terms',
  'referrer_terms',
  'ticket_transfer_terms',
  'support_internal_procedure',
] as const;

export type LegalDocumentKey = (typeof LEGAL_DOCUMENT_KEYS)[number];

/** Public URL slug → document key (no entry for internal-only documents). */
export const LEGAL_SLUG_TO_KEY: Record<string, LegalDocumentKey> = {
  terminos: 'terms_general',
  privacidad: 'privacy_policy',
  'compras-cancelaciones-reembolsos': 'purchase_refund_policy',
  productores: 'producer_terms',
  gastronomicos: 'gastro_terms',
  rentals: 'rental_terms',
  hoteles: 'hotel_terms',
  referidos: 'referrer_terms',
  'transferencia-tickets': 'ticket_transfer_terms',
};

export const LEGAL_KEY_TO_SLUG: Partial<Record<LegalDocumentKey, string>> = Object.fromEntries(
  Object.entries(LEGAL_SLUG_TO_KEY).map(([slug, key]) => [key, slug]),
) as Partial<Record<LegalDocumentKey, string>>;

export type LegalDocumentSeedDefinition = {
  key: LegalDocumentKey;
  title: string;
  description?: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  appliesToProfiles: string[];
  isRequiredForSignup: boolean;
  isRequiredForCheckout: boolean;
  isRequiredForPortalAccess: boolean;
};

export const LEGAL_DOCUMENT_SEED_DEFINITIONS: LegalDocumentSeedDefinition[] = [
  {
    key: 'terms_general',
    title: 'Términos y condiciones generales',
    visibility: 'PUBLIC',
    appliesToProfiles: ['USER', 'PRODUCER', 'GASTRO', 'HOTEL', 'REFERRER'],
    isRequiredForSignup: true,
    isRequiredForCheckout: true,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'privacy_policy',
    title: 'Política de privacidad',
    visibility: 'PUBLIC',
    appliesToProfiles: ['USER', 'PRODUCER', 'GASTRO', 'HOTEL', 'REFERRER'],
    isRequiredForSignup: true,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: false,
  },
  {
    key: 'purchase_refund_policy',
    title: 'Política de compra, cancelación y reembolso',
    visibility: 'PUBLIC',
    appliesToProfiles: ['USER'],
    isRequiredForSignup: false,
    isRequiredForCheckout: true,
    isRequiredForPortalAccess: false,
  },
  {
    key: 'producer_terms',
    title: 'Condiciones para productores y productoras',
    visibility: 'PUBLIC',
    appliesToProfiles: ['PRODUCER'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'gastro_terms',
    title: 'Condiciones para gastronómicos',
    visibility: 'PUBLIC',
    appliesToProfiles: ['GASTRO'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'rental_terms',
    title: 'Condiciones para rentals y proveedores de equipos',
    visibility: 'PUBLIC',
    appliesToProfiles: ['RENTAL'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'hotel_terms',
    title: 'Condiciones para hoteles',
    visibility: 'PUBLIC',
    appliesToProfiles: ['HOTEL'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'referrer_terms',
    title: 'Condiciones para referidos',
    visibility: 'PUBLIC',
    appliesToProfiles: ['REFERRER'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'ticket_transfer_terms',
    title: 'Condiciones de transferencia de tickets',
    visibility: 'PUBLIC',
    appliesToProfiles: ['USER'],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: true,
  },
  {
    key: 'support_internal_procedure',
    title: 'Procedimientos internos de soporte',
    description: 'Uso interno del equipo de administración y soporte.',
    visibility: 'INTERNAL',
    appliesToProfiles: [],
    isRequiredForSignup: false,
    isRequiredForCheckout: false,
    isRequiredForPortalAccess: false,
  },
];

export const LEGAL_DOCUMENT_PLACEHOLDER_MARKDOWN = `# Documento pendiente de revisión

Este documento debe ser completado y publicado desde el panel de administración.`;
