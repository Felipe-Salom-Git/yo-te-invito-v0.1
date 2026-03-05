const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export interface AuditLogItem {
  id: string;
  tenantId: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  metadata: unknown;
  createdAt: string;
}

export interface AuditLogsResponse {
  data: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAuditLogs(
  page = 1,
  limit = 20,
  devUserId: string
): Promise<AuditLogsResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE}/admin/audit-logs?${params}`, {
    headers: { 'X-Dev-User-Id': devUserId },
  });
  if (!res.ok) throw new Error('Failed to fetch audit logs');
  return res.json();
}

export async function approveEvent(
  eventId: string,
  devUserId: string
): Promise<{ id: string; status: string }> {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}/approve`, {
    method: 'POST',
    headers: { 'X-Dev-User-Id': devUserId },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.message ?? 'Failed to approve event');
  }
  return res.json();
}
