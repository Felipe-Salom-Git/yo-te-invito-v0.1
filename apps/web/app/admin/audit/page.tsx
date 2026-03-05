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
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Audit logs</h1>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700">
            Dev User ID (ADMIN role)
          </label>
          <input
            type="text"
            value={devUserId}
            onChange={(e) => saveDevUserId(e.target.value)}
            placeholder="X-Dev-User-Id"
            className="mt-1 block w-full max-w-md rounded-lg border border-slate-300 px-4 py-2"
          />
        </div>

        {loading && <p className="mt-4 text-slate-600">Loading…</p>}

        {data && !loading && (
          <>
            <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Time
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Action
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Entity
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Actor
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      Before
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500">
                      After
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {data.data.map((r) => (
                    <tr key={r.id} className="bg-white">
                      <td className="whitespace-nowrap px-4 py-2 text-sm text-slate-600">
                        {new Date(r.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium text-slate-900">
                        {r.action}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {r.entityType} {r.entityId}
                      </td>
                      <td className="px-4 py-2 text-sm text-slate-600">
                        {r.actorRole}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-xs text-slate-500">
                        {r.before != null
                          ? JSON.stringify(r.before)
                          : '—'}
                      </td>
                      <td className="max-w-xs truncate px-4 py-2 text-xs text-slate-500">
                        {r.after != null
                          ? JSON.stringify(r.after)
                          : '—'}
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
                  className="rounded bg-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-600">
                  Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= data.meta.totalPages}
                  className="rounded bg-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}

        {data && data.data.length === 0 && !loading && (
          <p className="mt-6 text-slate-500">No audit logs</p>
        )}
      </div>
    </main>
  );
}
