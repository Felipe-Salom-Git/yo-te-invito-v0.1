import type { LegalDocumentKey } from '@yo-te-invito/shared';

/**
 * Markdown files in docs/legal/ → LegalDocument.key
 * Excludes: 00_INDICE (índice interno), LEGAL_ADMIN_MODULE.md (doc técnica)
 */
export const LEGAL_CONTENT_FILE_TO_KEY: Record<string, LegalDocumentKey> = {
  '01_TERMINOS_Y_CONDICIONES_GENERALES.md': 'terms_general',
  '02_POLITICA_DE_PRIVACIDAD.md': 'privacy_policy',
  '03_POLITICA_COMPRA_CANCELACION_REEMBOLSO.md': 'purchase_refund_policy',
  '04_CONDICIONES_PRODUCTORES.md': 'producer_terms',
  '05_CONDICIONES_GASTRONOMICOS.md': 'gastro_terms',
  '06_CONDICIONES_RENTALS.md': 'rental_terms',
  '07_CONDICIONES_HOTELES.md': 'hotel_terms',
  '08_CONDICIONES_REFERIDOS.md': 'referrer_terms',
  '09_CONDICIONES_TRANSFERENCIA_TICKETS.md': 'ticket_transfer_terms',
  '10_PROCEDIMIENTO_INTERNO_SOPORTE.md': 'support_internal_procedure',
};

export const LEGAL_CONTENT_EXCLUDED_FILES = new Set([
  '00_INDICE_LEGAL_Y_RESPONSABILIDADES.md',
  'LEGAL_ADMIN_MODULE.md',
]);

export const EXPECTED_LEGAL_CONTENT_KEYS: LegalDocumentKey[] = [
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
];
