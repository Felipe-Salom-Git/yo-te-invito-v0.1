'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  createReferralLink,
  listReferralLinks,
  type ReferralLinkSummary,
} from '@/lib/api/referrals';

const DEV_USER_KEY = 'producer:devUserId';

export default function ReferralsPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';
  const [devUserId, setDevUserId] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [links, setLinks] = useState<ReferralLinkSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevUserId(localStorage.getItem(DEV_USER_KEY) ?? '');
    }
  }, []);

  const saveDevUserId = useCallback((v: string) => {
    setDevUserId(v);
    if (typeof window !== 'undefined') localStorage.setItem(DEV_USER_KEY, v);
  }, []);

  useEffect(() => {
    if (!eventId || !devUserId) return;
    let cancelled = false;
    listReferralLinks(eventId, devUserId)
      .then((r) => {
        if (!cancelled) setLinks(r.links);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [eventId, devUserId]);

  const loadLinks = useCallback(async () => {
    if (!eventId || !devUserId) return;
    try {
      const r = await listReferralLinks(eventId, devUserId);
      setLinks(r.links);
    } catch {}
  }, [eventId, devUserId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !devUserId || !code.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await createReferralLink(
        eventId,
        { code: code.trim(), label: label.trim() || undefined },
        devUserId,
      );
      setSuccess(`Created: ${res.url}`);
      setCode('');
      setLabel('');
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-block text-sm text-slate-600 hover:text-slate-900"
        >
          ← Back to events
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Referral links</h1>
        <p className="mt-1 text-slate-600">Event ID: {eventId || '—'}</p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700">
            Dev User ID (X-Dev-User-Id)
          </label>
          <input
            type="text"
            value={devUserId}
            onChange={(e) => saveDevUserId(e.target.value)}
            placeholder="User ID with ADMIN or PRODUCER role"
            className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2"
          />
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 className="font-semibold text-slate-800">Create referral link</h2>

          <div>
            <label className="block text-sm font-medium text-slate-700">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. friend2025"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Instagram campaign"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-800 py-2 font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create link'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="font-semibold text-slate-800">Links</h2>
          <ul className="mt-4 space-y-3">
            {links.length === 0 && (
              <li className="rounded-lg border border-slate-200 bg-white p-4 text-slate-500">
                No links yet
              </li>
            )}
            {links.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4"
              >
                <div>
                  <span className="font-medium">{l.code}</span>
                  {l.label && (
                    <span className="ml-2 text-slate-500">— {l.label}</span>
                  )}
                </div>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-sm font-medium text-slate-700">
                  {l.attributedOrdersCount} orders
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
