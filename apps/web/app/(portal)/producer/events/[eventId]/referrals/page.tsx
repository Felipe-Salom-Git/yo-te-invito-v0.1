'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { Button, useToast, Input, SideSheet } from '@/components';
import { getErrorMessage } from '@/lib/errors';

function isOperationalAssignmentStatus(s: string): boolean {
  return s === 'ACTIVE' || s === 'PAUSED';
}

function formatMoneyCents(cents: number) {
  return (cents / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });
}

export default function EventReferralsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const producerUserId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const eventId = (params?.eventId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const [assigningRefId, setAssigningRefId] = useState<string | null>(null);
  const [courtesyQuota, setCourtesyQuota] = useState(0);

  const { data: associated = [] } = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: !!eventId,
  });

  const { data: assignmentsData, refetch: refetchAssignments } = useQuery({
    queryKey: ['producer', 'referrers', 'event-assignments', eventId],
    queryFn: () => repos.referrals.listEventAssignments(eventId),
    enabled: !!eventId,
  });

  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['referralLinks', eventId],
    queryFn: () => repos.referrals.listLinks(eventId, producerUserId || ''),
    enabled: !!eventId && !!producerUserId,
  });

  const assignments = assignmentsData?.assignments ?? [];
  const links = linksData?.links ?? [];

  const assignedProfileIdsOperational = new Set(
    assignments.filter((a) => isOperationalAssignmentStatus(a.assignment.status)).map((a) => a.referrerProfile.id),
  );

  const assignMutation = useMutation({
    mutationFn: ({ referrerProfileId, quota }: { referrerProfileId: string; quota: number }) =>
      repos.referrals.assignReferrerToEvent(eventId, referrerProfileId, quota),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (res) => {
      addToast(
        res.alreadyAssigned
          ? 'Ya estaba asignado a este evento; actualizamos cupo de cortesías si lo indicaste.'
          : 'Referidor asignado al evento y link de venta generado.',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers', 'event-assignments', eventId] });
      queryClient.invalidateQueries({ queryKey: ['referralLinks', eventId] });
      refetchAssignments();
      refetchLinks();
      setAssigningRefId(null);
      setCourtesyQuota(0);
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRefId) return;
    assignMutation.mutate({ referrerProfileId: assigningRefId, quota: courtesyQuota });
  };

  const { data: commissionRequests } = useQuery({
    queryKey: ['referralCommissions', 'event', eventId],
    queryFn: () => repos.referrals.listCommissionRequestsForEvent(eventId),
    enabled: !!eventId,
  });

  const { data: eventMetrics } = useQuery({
    queryKey: ['producer', 'event-metrics', eventId],
    queryFn: () => repos.metrics.getEventMetrics(eventId),
    enabled: !!eventId,
  });

  const confirmMutation = useMutation({
    mutationFn: (commissionId: string) =>
      repos.referrals.confirmCommissionPayout(commissionId, producerUserId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Cobro confirmado exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
    },
  });

  const activeAssociated = associated.filter((r) => r.status === 'ACTIVE');

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <Link href={`/producer/events/${eventId}`} className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver al evento
        </Link>
        <h1 className="text-2xl font-bold text-text">Referidos y asignación al evento</h1>
        <p className="mt-2 text-text-muted">
          <span className="font-medium text-text">Asociado</span> = vínculo general con tu productora.{' '}
          <span className="font-medium text-accent">Asignado</span> = participa comercialmente en{' '}
          <em>este</em> evento (link de venta, cortesías por evento).
        </p>

        {eventMetrics?.referralPerformance && eventMetrics.referralPerformance.length > 0 && (
          <section className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
            <h2 className="font-semibold text-text">Ventas por referido (pagos confirmados)</h2>
            <p className="mt-1 text-sm text-text-muted">
              Misma fuente que las métricas del referidor: pedidos <span className="text-text">PAID</span> con código
              atribuido.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-text-muted">
                    <th className="py-2 pr-2">Referidor</th>
                    <th className="py-2 pr-2">Código</th>
                    <th className="py-2 pr-2">Pedidos</th>
                    <th className="py-2 pr-2">Tickets</th>
                    <th className="py-2">Bruto</th>
                  </tr>
                </thead>
                <tbody>
                  {eventMetrics.referralPerformance.map((row) => (
                    <tr key={row.referralLinkId} className="border-b border-border/60">
                      <td className="py-2 pr-2 text-text">{row.referrerDisplayName ?? '—'}</td>
                      <td className="py-2 pr-2 font-mono text-xs text-accent">{row.code}</td>
                      <td className="py-2 pr-2">{row.paidOrdersCount}</td>
                      <td className="py-2 pr-2">{row.ticketsSoldCount}</td>
                      <td className="py-2">{formatMoneyCents(row.grossRevenueCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Asignados a este evento</h2>
          <p className="mt-1 text-sm text-text-muted">
            Listado formal de la capa evento (no reemplaza la relación general en &quot;Mis referidos&quot;).
          </p>
          {assignments.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">Todavía no asignaste referidos a este evento.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {assignments.map((row) => (
                <li
                  key={row.assignment.id}
                  className="rounded-lg border border-border bg-bg p-4 text-sm"
                >
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium text-text">{row.referrerProfile.displayName}</p>
                      {row.referrerProfile.publicHandle && (
                        <p className="text-xs text-text-muted">@{row.referrerProfile.publicHandle}</p>
                      )}
                      <p className="mt-2 text-xs text-text-muted">
                        Estado asignación:{' '}
                        <span className="text-text">{row.assignment.status}</span>
                        {' · '}
                        Cortesías: {row.assignment.courtesyUsedCount}/{row.assignment.courtesyQuota}
                      </p>
                    </div>
                    {row.referralLink && (
                      <div className="text-right text-xs">
                        <span className="font-mono text-accent">{row.referralLink.code}</span>
                        <p className="mt-1 text-text-muted">{row.referralLink.attributedOrdersCount} ventas atribuidas</p>
                        <Button
                          type="button"
                          size="xs"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            void navigator.clipboard.writeText(row.referralLink!.url).then(
                              () => addToast('Link de venta copiado', 'success'),
                              () => addToast('No se pudo copiar', 'error'),
                            );
                          }}
                        >
                          Copiar checkout
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Asociados disponibles para asignar</h2>
          <p className="mt-1 text-sm text-text-muted mb-4">
            Solo referidos con relación general <span className="text-text">ACTIVE</span> pueden pasar a estar{' '}
            <span className="text-accent">asignados</span> a este evento.
          </p>
          {activeAssociated.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">
              No tenés referidos asociados. Gestioná la asociación general en{' '}
              <Link href="/producer/referrals" className="text-accent hover:underline">
                Referidos del panel
              </Link>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {activeAssociated.map((rel) => {
                const operationalHere = assignedProfileIdsOperational.has(rel.referrerProfile.id);
                return (
                  <div
                    key={rel.id}
                    className="flex flex-col gap-4 rounded-lg border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-text">{rel.referrerProfile.displayName}</p>
                      <p className="text-xs text-text-muted">
                        Asociado (general): <span className="text-emerald-400/90">sí</span>
                        {' · '}
                        Asignado (este evento):{' '}
                        {operationalHere ? (
                          <span className="text-accent">sí</span>
                        ) : (
                          <span className="text-text-muted">no</span>
                        )}
                      </p>
                      <p className="mt-1 text-xs text-text-muted">
                        Score: {rel.referrerProfile.salesScore ?? 0} · Ventas previas:{' '}
                        {rel.referrerProfile.completedSales ?? 0}
                      </p>
                    </div>
                    {operationalHere ? (
                      <span className="text-sm font-medium text-accent">Ya asignado a este evento</span>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setAssigningRefId(rel.referrerProfile.id);
                          setCourtesyQuota(0);
                        }}
                      >
                        Asignar al evento
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-text">Todos los links de venta del evento</h2>
          <p className="mt-1 text-sm text-text-muted">
            Incluye links creados por asignación y otros históricos; el listado de arriba es la fuente para &quot;asignado&quot;.
          </p>
          <ul className="mt-4 space-y-3">
            {links.length === 0 && (
              <li className="rounded-lg border border-border border-dashed bg-bg-muted p-4 text-sm text-text-muted">
                Aún no hay links registrados para este evento.
              </li>
            )}
            {links.map((l) => (
              <li
                key={l.id}
                className="flex flex-col gap-4 rounded-lg border border-border bg-bg-muted p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <span className="font-medium text-text">{l.code}</span>
                  {l.label && <span className="ml-2 text-sm text-text-muted">— {l.label}</span>}
                  {l.referrerProfileId != null && (
                    <p className="mt-1 text-xs text-text-muted">Perfil referidor: {l.referrerProfileId.slice(0, 8)}…</p>
                  )}
                  <p className="mt-1 text-xs text-accent">Checkout: ?ref={l.code}</p>
                </div>
                <div className="text-right">
                  <span className="block text-sm font-medium text-text">{l.attributedOrdersCount} ventas</span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {(commissionRequests?.length ?? 0) > 0 && (
          <section className="mt-10">
            <h2 className="font-semibold text-text">Solicitudes de comisión</h2>
            <ul className="mt-4 space-y-3">
              {commissionRequests!.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-muted p-4">
                  <span>
                    ${(c.amountCents / 100).toLocaleString('es-AR')} — referrer {c.referrerId}
                  </span>
                  <Button size="sm" onClick={() => confirmMutation.mutate(c.id)} disabled={confirmMutation.isPending}>
                    Confirmar cobro
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SideSheet isOpen={!!assigningRefId} onClose={() => setAssigningRefId(null)} title="Asignar al evento">
        <form onSubmit={handleAssign} className="space-y-6">
          <p className="text-sm text-text-muted">
            Confirmás la <span className="text-accent">asignación comercial</span> a este evento. La{' '}
            <span className="text-text">asociación general</span> ya debe estar activa.
          </p>
          <div className="rounded-lg border border-border bg-bg-muted/50 p-4">
            <h3 className="mb-2 font-medium text-text">Cortesías para este evento (opcional)</h3>
            <p className="mb-4 text-sm text-text-muted">
              Cupo de entradas gratuitas ligado a esta asignación (no duplica la relación general).
            </p>
            <Input
              label="Cupo de cortesías"
              type="number"
              min={0}
              value={courtesyQuota || ''}
              onChange={(e) => setCourtesyQuota(parseInt(e.target.value, 10) || 0)}
              placeholder="Ej. 10"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-border pt-6">
            <Button type="button" variant="outline" onClick={() => setAssigningRefId(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Guardando…' : 'Confirmar asignación'}
            </Button>
          </div>
        </form>
      </SideSheet>
    </div>
  );
}
