'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { ReferralLinkSummary } from '@/repositories/interfaces';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const DEV_USER_KEY = 'producer:devUserId';

export default function ReferralsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const producerUserId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const eventId = (params?.eventId as string) ?? '';
  const [devUserId, setDevUserId] = useState('');
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [giftCourtesyQty, setGiftCourtesyQty] = useState(0);
  const [giftTicketTypeId, setGiftTicketTypeId] = useState('');
  const [selectedReferrerIds, setSelectedReferrerIds] = useState<Set<string>>(new Set());
  const [links, setLinks] = useState<ReferralLinkSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', eventId],
    queryFn: () => repos.courtesies.fetchTicketTypes(eventId, producerUserId),
    enabled: !!eventId && !!producerUserId,
  });

  const { data: referrers = [] } = useQuery({
    queryKey: ['referrers'],
    queryFn: () => repos.referrals.listReferrers(),
    enabled: !!eventId,
  });

  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['referralLinks', eventId],
    queryFn: () => repos.referrals.listLinks(eventId, devUserId || producerUserId || ''),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (linksData?.links) setLinks(linksData.links);
  }, [linksData]);

  useEffect(() => {
    const assigned = new Set(
      links.filter((l) => l.referrerId).map((l) => l.referrerId!),
    );
    setSelectedReferrerIds(assigned);
  }, [links]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDevUserId(localStorage.getItem(DEV_USER_KEY) ?? '');
    }
  }, []);

  const saveDevUserId = useCallback((v: string) => {
    setDevUserId(v);
    if (typeof window !== 'undefined') localStorage.setItem(DEV_USER_KEY, v);
  }, []);

  const assignMutation = useMutation({
    mutationFn: (referrerIds: string[]) =>
      repos.referrals.assignReferrersToEvent(eventId, referrerIds),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Referidos asignados correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['referralLinks', eventId] });
      refetchLinks();
    },
  });

  const toggleReferrer = (id: string) => {
    setSelectedReferrerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = () => {
    assignMutation.mutate([...selectedReferrerIds]);
  };

  const { data: commissionRequests } = useQuery({
    queryKey: ['referralCommissions', 'event', eventId],
    queryFn: () => repos.referrals.listCommissionRequestsForEvent(eventId),
    enabled: !!eventId,
  });

  const confirmMutation = useMutation({
    mutationFn: (commissionId: string) =>
      repos.referrals.confirmCommissionPayout(commissionId, producerUserId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
    },
  });

  const loadLinks = useCallback(() => {
    refetchLinks();
  }, [refetchLinks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!eventId || !devUserId || !code.trim()) return;
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await repos.referrals.createLink(
        eventId,
        { code: code.trim(), label: label.trim() || undefined },
        devUserId,
      );
      let msg = `Creado: ${res.url}`;
      if (giftCourtesyQty > 0 && giftTicketTypeId) {
        try {
          const granted = await repos.courtesies.create(
            eventId,
            { mode: 'referral', ticketTypeId: giftTicketTypeId, quantity: giftCourtesyQty, note: code.trim() },
            devUserId,
          );
          msg += ` · ${granted.issued} entradas de cortesía regaladas al referido.`;
        } catch (cErr) {
          msg += ` (cortesías no asignadas: ${cErr instanceof Error ? cErr.message : 'error'})`;
        }
      }
      setSuccess(msg);
      setCode('');
      setLabel('');
      setGiftCourtesyQty(0);
      setGiftTicketTypeId('');
      await loadLinks();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <Link href={eventId ? `/producer/events/${eventId}` : '/producer/events'} className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver al evento
        </Link>
        <h1 className="text-2xl font-bold text-text">Referral links</h1>
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

        <section className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Asignar referidos al evento</h2>
          <p className="mt-1 text-sm text-text-muted">
            Marcá qué referidos pueden promover este evento. Cada uno tendrá su link único.
          </p>
          {referrers.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">No hay referidos en la productora.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {referrers.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`ref-${r.id}`}
                    checked={selectedReferrerIds.has(r.id)}
                    onChange={() => toggleReferrer(r.id)}
                    className="h-4 w-4 rounded border-border text-accent"
                  />
                  <label htmlFor={`ref-${r.id}`} className="cursor-pointer text-text">
                    {[r.firstName, r.lastName].filter(Boolean).join(' ') || r.email}
                  </label>
                  <span className="text-sm text-text-muted">{r.email}</span>
                </li>
              ))}
            </ul>
          )}
          {referrers.length > 0 && (
            <Button
              className="mt-4"
              onClick={handleAssign}
              disabled={assignMutation.isPending}
            >
              {assignMutation.isPending ? 'Guardando…' : 'Guardar asignación'}
            </Button>
          )}
        </section>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-6 rounded-xl border border-border bg-bg-muted p-6"
        >
          <h2 className="font-semibold text-text">Create referral link</h2>

          <div>
            <label className="block text-sm font-medium text-text-muted">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. friend2025"
              className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted">
              Label (opcional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="ej. Campaña Instagram"
              className="mt-1 block w-full rounded border border-border bg-bg px-4 py-2 text-text"
            />
          </div>

          <div className="rounded-lg border border-border bg-bg/50 p-4">
            <h3 className="text-sm font-medium text-text">Regalar entradas de cortesía al referido</h3>
            <p className="mt-1 text-xs text-text-muted">Opcional: al crear el link, asignar N entradas gratis a este referido.</p>
            <div className="mt-3 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs text-text-muted">Cantidad</label>
                <input
                  type="number"
                  min={0}
                  value={giftCourtesyQty || ''}
                  onChange={(e) => setGiftCourtesyQty(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-24 rounded border border-border bg-bg px-2 py-1.5 text-text"
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted">Tipo de entrada</label>
                <select
                  value={giftTicketTypeId}
                  onChange={(e) => setGiftTicketTypeId(e.target.value)}
                  className="mt-1 rounded border border-border bg-bg px-2 py-1.5 text-text"
                >
                  <option value="">—</option>
                  {(ticketTypes ?? []).map((tt) => (
                    <option key={tt.id} value={tt.id}>{tt.name}</option>
                  ))}
                </select>
              </div>
            </div>
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
            {loading ? 'Creating…' : 'Create link'}
          </button>
        </form>

        <section className="mt-10">
          <h2 className="font-semibold text-text">Links</h2>
          <ul className="mt-4 space-y-3">
            {links.length === 0 && (
              <li className="rounded-lg border border-border bg-bg-muted p-4 text-text-muted">
                No links yet
              </li>
            )}
            {links.map((l) => (
              <li
                key={l.id}
                className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
              >
                <div>
                  <span className="font-medium text-text">{l.code}</span>
                  {l.label && (
                    <span className="ml-2 text-text-muted">— {l.label}</span>
                  )}
                </div>
                <span className="rounded bg-border px-2 py-0.5 text-sm font-medium text-text-muted">
                  {l.attributedOrdersCount} orders
                </span>
              </li>
            ))}
          </ul>
        </section>

        {(commissionRequests?.length ?? 0) > 0 && (
          <section className="mt-10">
            <h2 className="font-semibold text-text">Solicitudes de comisión</h2>
            <p className="mt-1 text-sm text-text-muted">
              Los referidos solicitaron cobro. Confirmá para marcarlos como pagados.
            </p>
            <ul className="mt-4 space-y-3">
              {commissionRequests!.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4"
                >
                  <span>${(c.amountCents / 100).toLocaleString('es-AR')} — referrer {c.referrerId}</span>
                  <Button
                    size="sm"
                    onClick={() => confirmMutation.mutate(c.id)}
                    disabled={confirmMutation.isPending}
                  >
                    Confirmar cobro
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
