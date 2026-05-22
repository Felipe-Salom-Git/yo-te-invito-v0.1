import type { AuditLogsListQuery } from '@yo-te-invito/shared';

export type AdminAuditFiltersState = {
  q: string;
  action: string;
  entityType: string;
  actorUserId: string;
  actorEmail: string;
  from: string;
  to: string;
  page: number;
};

export const ADMIN_AUDIT_DEFAULT_FILTERS: AdminAuditFiltersState = {
  q: '',
  action: '',
  entityType: '',
  actorUserId: '',
  actorEmail: '',
  from: '',
  to: '',
  page: 1,
};

export function parseAdminAuditSearchParams(
  params: URLSearchParams,
): AdminAuditFiltersState {
  return {
    q: params.get('q') ?? '',
    action: params.get('action') ?? '',
    entityType: params.get('entity') ?? params.get('entityType') ?? '',
    actorUserId: params.get('actor') ?? params.get('actorUserId') ?? '',
    actorEmail: params.get('actorEmail') ?? '',
    from: params.get('from') ?? '',
    to: params.get('to') ?? '',
    page: Math.max(1, parseInt(params.get('page') ?? '1', 10) || 1),
  };
}

export function buildAdminAuditSearchParams(
  state: AdminAuditFiltersState,
): URLSearchParams {
  const qs = new URLSearchParams();
  if (state.q.trim()) qs.set('q', state.q.trim());
  if (state.action) qs.set('action', state.action);
  if (state.entityType) qs.set('entity', state.entityType);
  if (state.actorUserId.trim()) qs.set('actor', state.actorUserId.trim());
  if (state.actorEmail.trim()) qs.set('actorEmail', state.actorEmail.trim());
  if (state.from) qs.set('from', state.from);
  if (state.to) qs.set('to', state.to);
  if (state.page > 1) qs.set('page', String(state.page));
  return qs;
}

export function filtersToAdminAuditQuery(
  state: AdminAuditFiltersState,
  limit = 20,
): AuditLogsListQuery {
  const query: AuditLogsListQuery = {
    page: state.page,
    limit,
  };
  if (state.q.trim()) query.q = state.q.trim();
  if (state.action) query.action = state.action as AuditLogsListQuery['action'];
  if (state.entityType) query.entityType = state.entityType;
  if (state.actorUserId.trim()) query.actorUserId = state.actorUserId.trim();
  if (state.actorEmail.trim()) query.actorEmail = state.actorEmail.trim();
  if (state.from) query.dateFrom = state.from;
  if (state.to) query.dateTo = state.to;
  return query;
}
