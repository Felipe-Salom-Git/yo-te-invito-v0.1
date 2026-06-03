import type { AdminPaymentsListQuery } from '@yo-te-invito/shared';

export type AdminPaymentsFiltersState = {
  q: string;
  provider: '' | 'DEMO' | 'GETNET' | 'MERCADOPAGO';
  status: string;
  requiresManualReview: boolean;
  createdFrom: string;
  createdTo: string;
  page: number;
};

export const ADMIN_PAYMENTS_DEFAULT_FILTERS: AdminPaymentsFiltersState = {
  q: '',
  provider: '',
  status: '',
  requiresManualReview: false,
  createdFrom: '',
  createdTo: '',
  page: 1,
};

export function filtersToAdminPaymentsQuery(
  filters: AdminPaymentsFiltersState,
  pageSize = 20,
): AdminPaymentsListQuery {
  return {
    page: filters.page,
    pageSize,
    ...(filters.q.trim() ? { q: filters.q.trim() } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.status.trim() ? { status: filters.status.trim() } : {}),
    ...(filters.requiresManualReview ? { requiresManualReview: true } : {}),
    ...(filters.createdFrom ? { createdFrom: new Date(filters.createdFrom).toISOString() } : {}),
    ...(filters.createdTo ? { createdTo: new Date(filters.createdTo).toISOString() } : {}),
  };
}
