import type { AdminEventsListQuery, AdminEventsListView } from '@yo-te-invito/shared';

export type AdminEventsFiltersState = {
  q: string;
  status: string;
  category: string;
  subcategoryId: string;
  city: string;
  producerProfileId: string;
  from: string;
  to: string;
  view: AdminEventsListView;
  page: number;
  pendingOnly: boolean;
};

export const ADMIN_EVENTS_DEFAULT_FILTERS: AdminEventsFiltersState = {
  q: '',
  status: '',
  category: '',
  subcategoryId: '',
  city: '',
  producerProfileId: '',
  from: '',
  to: '',
  view: 'all',
  page: 1,
  pendingOnly: false,
};

const VIEWS: AdminEventsListView[] = [
  'all',
  'pending',
  'approved',
  'rejected',
  'active',
  'past',
];

function parseView(raw: string | null): AdminEventsListView {
  if (raw && VIEWS.includes(raw as AdminEventsListView)) {
    return raw as AdminEventsListView;
  }
  return 'all';
}

export function parseAdminEventsSearchParams(
  params: URLSearchParams,
): AdminEventsFiltersState {
  const pendingOnly = params.get('pendingOnly') === '1' || params.get('pendingOnly') === 'true';
  const view = pendingOnly ? 'pending' : parseView(params.get('view'));
  return {
    q: params.get('q') ?? '',
    status: params.get('status') ?? '',
    category: params.get('category') ?? '',
    subcategoryId: params.get('subcategoryId') ?? '',
    city: params.get('city') ?? '',
    producerProfileId: params.get('producerProfileId') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    view,
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
    pendingOnly,
  };
}

export function buildAdminEventsSearchParams(
  state: AdminEventsFiltersState,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.q.trim()) qs.set('q', state.q.trim());
  if (state.status) qs.set('status', state.status);
  if (state.category) qs.set('category', state.category);
  if (state.subcategoryId) qs.set('subcategoryId', state.subcategoryId);
  if (state.city.trim()) qs.set('city', state.city.trim());
  if (state.producerProfileId) qs.set('producerProfileId', state.producerProfileId);
  if (state.from) qs.set('from', state.from);
  if (state.to) qs.set('to', state.to);
  if (state.view && state.view !== 'all') qs.set('view', state.view);
  if (state.pendingOnly) qs.set('pendingOnly', '1');
  if (state.page > 1) qs.set('page', String(state.page));
  return qs;
}

export function filtersToAdminEventsQuery(
  state: AdminEventsFiltersState,
  limit = 20,
): AdminEventsListQuery {
  const query: AdminEventsListQuery = {
    page: state.page,
    limit,
  };
  if (state.q.trim()) query.q = state.q.trim();
  if (state.status) {
    query.status = state.status as AdminEventsListQuery['status'];
  }
  if (state.category) {
    query.category = state.category as AdminEventsListQuery['category'];
  }
  if (state.subcategoryId) query.subcategoryId = state.subcategoryId;
  if (state.city.trim()) query.city = state.city.trim();
  if (state.producerProfileId) query.producerProfileId = state.producerProfileId;
  if (state.from) query.dateFrom = state.from;
  if (state.to) query.dateTo = state.to;
  if (state.pendingOnly) query.pendingOnly = true;
  if (state.view && state.view !== 'all') query.view = state.view;
  return query;
}

export const ADMIN_EVENT_VIEW_TABS: Array<{ id: AdminEventsListView; label: string }> = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Aprobados' },
  { id: 'rejected', label: 'Rechazados' },
  { id: 'active', label: 'Activos' },
  { id: 'past', label: 'Pasados' },
  { id: 'all', label: 'Todos' },
];
