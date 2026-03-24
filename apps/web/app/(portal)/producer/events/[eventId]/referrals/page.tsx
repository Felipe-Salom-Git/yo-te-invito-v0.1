'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { ReferralLinkSummary } from '@/repositories/interfaces';
import { Button, useToast, Input, SideSheet } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function EventReferralsPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const producerUserId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const eventId = (params?.eventId as string) ?? '';
  const [links, setLinks] = useState<ReferralLinkSummary[]>([]);
  const repos = useRepositories();
  const { addToast } = useToast();

  const [assigningRefId, setAssigningRefId] = useState<string | null>(null);
  const [courtesyQuota, setCourtesyQuota] = useState(0);

  const { data: associated = [] } = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: !!eventId,
  });

  const { data: linksData, refetch: refetchLinks } = useQuery({
    queryKey: ['referralLinks', eventId],
    queryFn: () => repos.referrals.listLinks(eventId, producerUserId || ''),
    enabled: !!eventId && !!producerUserId,
  });

  useEffect(() => {
    if (linksData?.links) setLinks(linksData.links);
  }, [linksData]);

  const assignMutation = useMutation({
    mutationFn: ({ referrerProfileId, quota }: { referrerProfileId: string; quota: number }) =>
      repos.referrals.assignReferrerToEvent(eventId, referrerProfileId, quota),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Referido asignado y link generado correctamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['referralLinks', eventId] });
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

  const confirmMutation = useMutation({
    mutationFn: (commissionId: string) =>
      repos.referrals.confirmCommissionPayout(commissionId, producerUserId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Cobro confirmado exitosamente', 'success');
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
    },
  });

  const activeAssociated = associated.filter(r => r.status === 'ACTIVE');

  return (
    <div className="p-8">
      <div className="mx-auto max-w-2xl">
        <Link href={`/producer/events/${eventId}`} className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver al evento
        </Link>
        <h1 className="text-2xl font-bold text-text">Referidos del Evento</h1>
        <p className="mt-2 text-text-muted">Gestioná los links de ventas y accesos de cortesía.</p>

        <section className="mt-8 rounded-xl border border-border bg-bg-muted p-6">
          <h2 className="font-semibold text-text">Equipo de Ventas (Referidos Asociados)</h2>
          <p className="mt-1 text-sm text-text-muted mb-4">
            Seleccioná un referido de tu equipo para generarle un link de ventas único para este evento.
          </p>
          {activeAssociated.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">No tenés referidos asociados. Agregalos desde la pestaña Referidos de tu panel.</p>
          ) : (
            <div className="space-y-3">
              {activeAssociated.map((rel) => {
                const alreadyAssigned = links.some(l => l.referrerId === rel.referrerProfile.id || l.label === rel.referrerProfile.displayName);
                return (
                  <div key={rel.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-bg">
                    <div>
                      <p className="font-medium text-text">{rel.referrerProfile.displayName}</p>
                      <p className="text-xs text-text-muted">Score: {rel.referrerProfile.salesScore ?? 0} | Ventas previas: {rel.referrerProfile.completedSales ?? 0}</p>
                    </div>
                    {alreadyAssigned ? (
                      <span className="text-sm font-medium text-accent">Link Generado ✓</span>
                    ) : (
                      <Button size="sm" onClick={() => { setAssigningRefId(rel.referrerProfile.id); setCourtesyQuota(0); }}>
                        Habilitar Link
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10">
          <h2 className="font-semibold text-text">Links de Ventas Generados</h2>
          <ul className="mt-4 space-y-3">
            {links.length === 0 && (
              <li className="rounded-lg border border-border bg-bg-muted p-4 text-text-muted text-sm border-dashed">
                Aún no hay links creados para este evento.
              </li>
            )}
            {links.map((l) => (
              <li key={l.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-lg border border-border bg-bg-muted p-4 gap-4">
                <div>
                  <span className="font-medium text-text">{l.code}</span>
                  {l.label && <span className="ml-2 text-sm text-text-muted">— {l.label}</span>}
                  <p className="mt-1 text-xs text-accent">URL para venta: /checkout/{eventId}?ref={l.code}</p>
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
                  <span>${(c.amountCents / 100).toLocaleString('es-AR')} — referrer {c.referrerId}</span>
                  <Button size="sm" onClick={() => confirmMutation.mutate(c.id)} disabled={confirmMutation.isPending}>
                    Confirmar cobro
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <SideSheet isOpen={!!assigningRefId} onClose={() => setAssigningRefId(null)} title="Asignar Referido">
        <form onSubmit={handleAssign} className="space-y-6">
          <div className="rounded-lg border border-border bg-bg-muted/50 p-4">
            <h3 className="font-medium text-text mb-2">Entradas de Cortesía (Opcional)</h3>
            <p className="text-sm text-text-muted mb-4">
              Podés otorgar un cupo de entradas gratis para que este referido las regale automáticamente a través de su Dashboard.
            </p>
            <Input
              label="Cupo de Cortesías"
              type="number"
              min={0}
              value={courtesyQuota || ''}
              onChange={(e) => setCourtesyQuota(parseInt(e.target.value, 10) || 0)}
              placeholder="Ej. 10"
            />
          </div>

          <div className="pt-6 border-t border-border flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setAssigningRefId(null)}>Cancelar</Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Generando...' : 'Confirmar Asignación'}
            </Button>
          </div>
        </form>
      </SideSheet>
    </div>
  );
}
