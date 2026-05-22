import type { AdminUsersListQuery } from '@yo-te-invito/shared';
import { Role } from '@yo-te-invito/shared';

export type AdminUsersFiltersState = {
  q: string;
  role: string;
  emailVerified: string;
  status: string;
  hasProducerProfile: boolean;
  hasGastroProfile: boolean;
  hasHotelProfile: boolean;
  hasReferrerProfile: boolean;
  from: string;
  to: string;
  page: number;
};

export const ADMIN_USERS_DEFAULT_FILTERS: AdminUsersFiltersState = {
  q: '',
  role: '',
  emailVerified: '',
  status: '',
  hasProducerProfile: false,
  hasGastroProfile: false,
  hasHotelProfile: false,
  hasReferrerProfile: false,
  from: '',
  to: '',
  page: 1,
};

export function parseAdminUsersSearchParams(
  params: URLSearchParams,
): AdminUsersFiltersState {
  return {
    q: params.get('q') ?? '',
    role: params.get('role') ?? '',
    emailVerified: params.get('emailVerified') ?? '',
    status: params.get('status') ?? '',
    hasProducerProfile: params.get('hasProducer') === '1',
    hasGastroProfile: params.get('hasGastro') === '1',
    hasHotelProfile: params.get('hasHotel') === '1',
    hasReferrerProfile: params.get('hasReferrer') === '1',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

export function buildAdminUsersSearchParams(
  state: AdminUsersFiltersState,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.q.trim()) qs.set('q', state.q.trim());
  if (state.role) qs.set('role', state.role);
  if (state.emailVerified) qs.set('emailVerified', state.emailVerified);
  if (state.status) qs.set('status', state.status);
  if (state.hasProducerProfile) qs.set('hasProducer', '1');
  if (state.hasGastroProfile) qs.set('hasGastro', '1');
  if (state.hasHotelProfile) qs.set('hasHotel', '1');
  if (state.hasReferrerProfile) qs.set('hasReferrer', '1');
  if (state.from) qs.set('from', state.from);
  if (state.to) qs.set('to', state.to);
  if (state.page > 1) qs.set('page', String(state.page));
  return qs;
}

export function filtersToAdminUsersQuery(
  state: AdminUsersFiltersState,
  limit = 20,
): AdminUsersListQuery {
  const query: AdminUsersListQuery = {
    page: state.page,
    limit,
  };
  if (state.q.trim()) query.q = state.q.trim();
  if (state.role && Object.values(Role).includes(state.role as Role)) {
    query.role = state.role as AdminUsersListQuery['role'];
  }
  if (state.emailVerified === 'yes') query.emailVerified = true;
  if (state.emailVerified === 'no') query.emailVerified = false;
  if (state.status) {
    query.status = state.status as AdminUsersListQuery['status'];
  }
  if (state.hasProducerProfile) query.hasProducerProfile = true;
  if (state.hasGastroProfile) query.hasGastroProfile = true;
  if (state.hasHotelProfile) query.hasHotelProfile = true;
  if (state.hasReferrerProfile) query.hasReferrerProfile = true;
  if (state.from) query.createdFrom = state.from;
  if (state.to) query.createdTo = state.to;
  return query;
}
