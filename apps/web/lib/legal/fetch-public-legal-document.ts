import type { PublicLegalDocumentResponse } from '@yo-te-invito/shared';
import { DEFAULT_PUBLIC_LEGAL_TENANT_ID } from './public-legal-config';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001';

/**
 * Server-side fetch for published legal document (ISR-friendly).
 * Returns null when not found, internal, or unpublished.
 */
export async function fetchPublicLegalDocument(
  slug: string,
  tenantId: string = DEFAULT_PUBLIC_LEGAL_TENANT_ID,
): Promise<PublicLegalDocumentResponse | null> {
  const url = new URL(`/public/legal/${encodeURIComponent(slug)}`, API_BASE);
  url.searchParams.set('tenantId', tenantId);

  try {
    const res = await fetch(url.toString(), { next: { revalidate: 60 } });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as PublicLegalDocumentResponse;
  } catch {
    return null;
  }
}
