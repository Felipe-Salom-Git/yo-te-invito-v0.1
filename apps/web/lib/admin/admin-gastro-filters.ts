import type { AdminGastroLocationListItem } from '@/repositories/interfaces';

export type AdminGastroOwnerFilter = '' | 'yes' | 'no';
export type AdminGastroPublicFilter = '' | 'yes' | 'no';

export type AdminGastroFiltersState = {
  search: string;
  status: string;
  pendingDiscounts: boolean;
  hasOwner: AdminGastroOwnerFilter;
  hasPublic: AdminGastroPublicFilter;
  city: string;
  page: number;
};

export const ADMIN_GASTRO_DEFAULT_FILTERS: AdminGastroFiltersState = {
  search: '',
  status: '',
  pendingDiscounts: false,
  hasOwner: '',
  hasPublic: '',
  city: '',
  page: 1,
};

export function parseAdminGastroSearchParams(
  params: URLSearchParams,
): AdminGastroFiltersState {
  const hasOwner = params.get('hasOwner');
  const hasPublic = params.get('hasPublic');
  return {
    search: params.get('search') ?? '',
    status: params.get('status') ?? '',
    pendingDiscounts: params.get('pendingDiscounts') === '1',
    hasOwner: hasOwner === 'yes' || hasOwner === 'no' ? hasOwner : '',
    hasPublic: hasPublic === 'yes' || hasPublic === 'no' ? hasPublic : '',
    city: params.get('city') ?? '',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

export function buildAdminGastroSearchParams(
  state: AdminGastroFiltersState,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.search.trim()) qs.set('search', state.search.trim());
  if (state.status) qs.set('status', state.status);
  if (state.pendingDiscounts) qs.set('pendingDiscounts', '1');
  if (state.hasOwner) qs.set('hasOwner', state.hasOwner);
  if (state.hasPublic) qs.set('hasPublic', state.hasPublic);
  if (state.city.trim()) qs.set('city', state.city.trim());
  if (state.page > 1) qs.set('page', String(state.page));
  return qs;
}

export function filtersToAdminGastroListQuery(
  state: AdminGastroFiltersState,
  limit = 100,
): {
  search?: string;
  status?: string;
  hasPendingDiscounts?: boolean;
  page?: number;
  limit?: number;
} {
  return {
    ...(state.search.trim() ? { search: state.search.trim() } : {}),
    ...(state.status ? { status: state.status } : {}),
    ...(state.pendingDiscounts ? { hasPendingDiscounts: true } : {}),
    page: state.page,
    limit,
  };
}

/** Client-side filters not supported by list API (owner, public ficha, city). */
export function applyAdminGastroClientFilters(
  items: AdminGastroLocationListItem[],
  state: AdminGastroFiltersState,
): AdminGastroLocationListItem[] {
  let out = items;
  if (state.hasOwner === 'yes') {
    out = out.filter((l) => Boolean(l.owner.userId));
  } else if (state.hasOwner === 'no') {
    out = out.filter((l) => !l.owner.userId);
  }
  if (state.hasPublic === 'yes') {
    out = out.filter((l) => Boolean(l.publicEventId));
  } else if (state.hasPublic === 'no') {
    out = out.filter((l) => !l.publicEventId);
  }
  const cityQ = state.city.trim().toLowerCase();
  if (cityQ) {
    out = out.filter((l) => (l.city ?? '').toLowerCase().includes(cityQ));
  }
  return out;
}
