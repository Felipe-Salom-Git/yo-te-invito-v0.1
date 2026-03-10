'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAuditLogs, type AuditLogItem } from '@/lib/api/admin';

const DEV_USER_KEY = 'admin:devUserId';

export default function AdminAuditPage() {
  const [devUserId, setDevUserId] = useState('');
  const [data, setData] = useState<{
    data: AuditLogItem[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevUserId(localStorage.getItem(DEV_USER_KEY) ?? '');
    }
  }, []);

  const saveDevUserId = (v: string) => {
    setDevUserId(v);
    if (typeof window !== 'undefined') localStorage.setItem(DEV_USER_KEY, v);
  };

  useEffect(() => {
    if (!devUserId) return;
    setLoading(true);
    fetchAuditLogs(page, 20, devUserId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [devUserId, page]);

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl">
        <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-text">Audit logs</h1>

        <div className="mt-6">
          <label className="block text-sm font-medium text-text-muted">
            Dev User ID (ADMIN role)
          </label>
          <input
            type="text"
            value={devUserId}
            onChange={(e) => saveDevUserId(e.target.value)}
            placeholder="X-Dev-User-Id"
            className="mt-1 block w-full max-w-md rounded border border-border bg-bg px-4 py-2 text-text"
          />
        </div>

        {loading && <p className="mt-4 text-text-muted">Loading…</p>}

        {data && !loading && (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Time</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Entity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Actor</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">Before</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-text-muted">After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.data.map((r) => (
                    <tr key={r.id} className="bg-bg-muted/50">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-text-muted">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-text">{r.action}</td>
                      <td className="px-4 py-2 text-sm text-text-muted">
                        {r.entityType} {r.entityId}
                      </td>
                      <td className="px-4 py-2 text-sm text-text-muted">{r.actorRole}</td>
                      <td className="max-w-xs truncate px-4 py-2 text-xs text-text-muted">
                        {r.before != null ? JSON.stringify(r.before) : '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-xs text-text-muted">
                        {r.after != null ? JSON.stringify(r.after) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {data.meta.totalPages > 1 && (
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border"
                >
                  Previous
                </button>
                <span className="text-sm text-text-muted">
                  Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  className="rounded border border-border bg-bg-muted px-3 py-1 text-sm disabled:opacity-50 hover:bg-border"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {data && data.data.length === 0 && !loading && (
          <p className="mt-6 text-text-muted">No audit logs</p>
        )}
      </div>
    </div>
  );
}
