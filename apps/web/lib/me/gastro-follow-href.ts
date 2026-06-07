import { getContentDetailHref } from '@/lib/home/contentRoutes';

/** Canonical public URL for a gastro local (GastroProfile.id). */
export function gastroLocationPublicHref(
  gastroProfileId: string,
  tenantId?: string,
): string {
  return getContentDetailHref(
    { id: gastroProfileId, category: 'gastro', gastroProfileId },
    tenantId,
  );
}
