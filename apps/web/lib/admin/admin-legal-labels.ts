import type { LegalDocumentKeyValue } from '@yo-te-invito/shared';

export const LEGAL_PROFILE_OPTIONS = [
  'USER',
  'PRODUCER',
  'GASTRO',
  'HOTEL',
  'REFERRER',
  'RENTAL',
] as const;

export function legalDocumentKeyLabel(key: string): string {
  const labels: Record<string, string> = {
    terms_general: 'Términos generales',
    privacy_policy: 'Privacidad',
    purchase_refund_policy: 'Compra y reembolsos',
    producer_terms: 'Productores',
    gastro_terms: 'Gastronómicos',
    rental_terms: 'Rentals',
    hotel_terms: 'Hoteles',
    referrer_terms: 'Referidos',
    ticket_transfer_terms: 'Transferencia tickets',
    support_internal_procedure: 'Soporte interno',
  };
  return labels[key] ?? key;
}

export function legalVisibilityLabel(visibility: 'PUBLIC' | 'INTERNAL'): string {
  return visibility === 'PUBLIC' ? 'Público' : 'Interno';
}

export function legalVersionStatusLabel(status: string): string {
  switch (status) {
    case 'DRAFT':
      return 'Borrador';
    case 'PUBLISHED':
      return 'Publicada';
    case 'ARCHIVED':
      return 'Archivada';
    default:
      return status;
  }
}

export function formatLegalDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function isLegalDocumentKey(value: string): value is LegalDocumentKeyValue {
  return [
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
  ].includes(value);
}
