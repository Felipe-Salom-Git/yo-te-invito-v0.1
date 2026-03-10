'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRepositories } from '@/repositories/context';
import type { CourtesyGrantSummary, TicketTypeResponse } from '@/repositories/interfaces';
import Link from 'next/link';

const DEV_USER_KEY = 'producer:devUserId';

export default function CourtesiesPage() {
  const params = useParams();
  const eventId = (params?.eventId as string) ?? '';
  const [devUserId, setDevUserId] = useState('');
  const [mode, setMode] = useState<'CONSUMES_BATCH' | 'FREE_CAPACITY'>('CONSUMES_BATCH');
  const [ticketTypeId, setTicketTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [ticketTypes, setTicketTypes] = useState<TicketTypeResponse[]>([]);
  const [grants, setGrants] = useState<CourtesyGrantSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const repos = useRepositories();

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
    (async () => {
      try {
        const [tt, g] = await Promise.all([
          repos.courtesies.fetchTicketTypes(eventId, devUserId),
          repos.courtesies.list(eventId, devUserId),
        ]);
        if (!cancelled) {
          setTicketTypes(tt);
          setGrants(g.grants);
          if (tt.length && !ticketTypeId) setTicketTypeId(tt[0]!.id);
        }
      } catch {
        if (!cancelled) setTicketTypes([]);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, devUserId, repos]);

  const loadGrants = useCallback(async () => {
    if (!eventId || !devUserId) return;
    try {
      const g = await repos.courtesies.list(eventId, devUserId);
      setGrants(g.grants);
    } catch {}
  }, [eventId, devUserId, repos]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !devUserId) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const body = {
        mode,
        ticketTypeId: mode === 'CONSUMES_BATCH' ? ticketTypeId || undefined : undefined,
        quantity,
        note: note.trim() || undefined,
      };
      const res = await repos.courtesies.create(eventId, body, devUserId);
      setSuccess(`Created ${res.issued} courtesy ticket(s)`);
      setQuantity(1);
      await loadGrants();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Back to events
        </Link>
        <h1 className="text-2xl font-bold text-text">Courtesies</h1>
        <p className="mt-1 text-text-muted">Event ID: {eventId || '—'}</p>

        <div className="mt-6">
          <label className="block text-sm font-medium text-text-muted">
            Dev User ID (X-Dev-User-Id)
          </label>
          <input
            type="text"
            value={devUserId}
            onChange={(e) => saveDevUserId(e.target.value)}
            placeholder="User ID with ADMIN or PRODUCER role"
            className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">New courtesy grant</h2>

          <div>
            <label className="block text-sm font-medium text-text-muted">Mode</label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as 'CONSUMES_BATCH' | 'FREE_CAPACITY')}
              className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
            >
              <option value="CONSUMES_BATCH">CONSUMES_BATCH (from ticket type)</option>
              <option value="FREE_CAPACITY">FREE_CAPACITY (event capacity)</option>
            </select>
          </div>

          {mode === 'CONSUMES_BATCH' && (
            <div>
              <label className="block text-sm font-medium text-text-muted">
                Ticket type
              </label>
              <select
                value={ticketTypeId}
                onChange={(e) => setTicketTypeId(e.target.value)}
                className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
              >
                <option value="">—</option>
                {ticketTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.capacityAvailable} avail)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-muted">Quantity</label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Press, VIP"
              className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-lg border border-accent/50 bg-accent/10 p-3 text-sm text-accent">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent py-2 font-medium text-bg hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Creating…' : 'Create courtesy'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="font-semibold text-text">Grants</h2>
          <ul className="mt-4 space-y-3">
            {grants.length === 0 && (
              <li className="rounded-lg border border-border bg-bg-muted p-4 text-text-muted">
                No grants yet
              </li>
            )}
            {grants.map((g) => (
              <li key={g.id} className="rounded-lg border border-border bg-bg-muted p-4">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-text">{g.mode}</span>
                  <span className="text-text-muted">
                    {g.issued}/{g.quantity}
                  </span>
                </div>
                {g.ticketTypeId && (
                  <p className="mt-1 text-text-muted">Type: {g.ticketTypeId}</p>
                )}
                {g.note && <p className="mt-1 text-text-muted">{g.note}</p>}
                <p className="mt-1 text-xs text-text-muted/70">
                  {new Date(g.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
