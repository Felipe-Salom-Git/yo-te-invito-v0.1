import type { AdminLegalDocumentListItem } from '@/repositories/interfaces';
import type { LegalListFilter } from './AdminLegalFilters';

export function filterAdminLegalDocuments(
  items: AdminLegalDocumentListItem[],
  filter: LegalListFilter,
): AdminLegalDocumentListItem[] {
  switch (filter) {
    case 'public':
      return items.filter((d) => d.visibility === 'PUBLIC');
    case 'internal':
      return items.filter((d) => d.visibility === 'INTERNAL');
    case 'signup':
      return items.filter((d) => d.isRequiredForSignup);
    case 'checkout':
      return items.filter((d) => d.isRequiredForCheckout);
    case 'portal':
      return items.filter((d) => d.isRequiredForPortalAccess);
    default:
      return items;
  }
}

export function computeLegalListKpis(items: AdminLegalDocumentListItem[]) {
  const pendingPublish = items.filter(
    (d) => !d.publishedVersion || d.draftVersion != null,
  ).length;
  return {
    total: items.length,
    publicCount: items.filter((d) => d.visibility === 'PUBLIC').length,
    internalCount: items.filter((d) => d.visibility === 'INTERNAL').length,
    pendingPublish,
  };
}
