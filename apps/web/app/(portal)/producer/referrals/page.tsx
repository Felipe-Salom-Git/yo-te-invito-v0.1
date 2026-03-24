'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function ProducerReferralsPage() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'associated' | 'freelance' | 'events'>('associated');

  const { data: associated = [] } = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: status === 'authenticated' && activeTab === 'associated',
  });

  const { data: freelance = [] } = useQuery({
    queryKey: ['producer', 'referrers', 'freelance'],
    queryFn: () => repos.referrals.getFreelanceReferrers(),
    enabled: status === 'authenticated' && activeTab === 'freelance',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled: status === 'authenticated' && activeTab === 'events',
  });
  const events = eventsData?.data ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ referrerProfileId, newStatus }: { referrerProfileId: string; newStatus: string }) =>
      repos.referrals.setAssociationStatus(referrerProfileId, newStatus, 'Status updated via dashboard'),
    onSuccess: () => {
      addToast('Estado de asociación actualizado', 'success');
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers', 'associated'] });
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers', 'freelance'] });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const requestAssociationMutation = useMutation({
    mutationFn: (referrerProfileId: string) =>
      repos.referrals.setAssociationStatus(referrerProfileId, 'REQUESTED'),
    onSuccess: () => {
      addToast('Solicitud enviada al referido', 'success');
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers', 'freelance'] });
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers', 'associated'] });
      setActiveTab('associated');
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  if (status === 'loading') {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">Iniciar sesión</Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/producer" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Panel
      </Link>
      <SectionTitle>Gestión de Referidos</SectionTitle>
      <p className="mt-2 text-text-muted mb-6">
        Administrá tu equipo de ventas, aceptá solicitudes y asigná referidos a tus eventos.
      </p>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        <button
          onClick={() => setActiveTab('associated')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'associated' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
            }`}
        >
          Mis Referidos ({activeTab === 'associated' ? associated.length : '-'})
        </button>
        <button
          onClick={() => setActiveTab('freelance')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'freelance' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
            }`}
        >
          Mercado Freelance ({activeTab === 'freelance' ? freelance.length : '-'})
        </button>
        <button
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 font-medium transition-colors ${activeTab === 'events' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
            }`}
        >
          Asignar por Evento
        </button>
      </div>

      {/* ASSOCIATED TAB */}
      {activeTab === 'associated' && (
        <section className="space-y-4">
          {associated.length === 0 ? (
            <p className="text-text-muted">No tenés referidos asociados ni solicitudes pendientes.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {associated.map((rel) => (
                <div key={rel.id} className="rounded-xl border border-border bg-bg-muted p-5">
                  <h3 className="font-semibold text-text">{rel.referrerProfile.displayName}</h3>
                  <p className="text-sm text-text-muted mt-1">Estado: <span className="font-medium text-accent">{rel.status}</span></p>
                  <p className="text-sm text-text-muted">Origen: {rel.origin}</p>
                  <p className="text-xs text-text-muted mt-2 mb-4">Ventas: {rel.referrerProfile.completedSales ?? 0} | Puntuación: {rel.referrerProfile.salesScore ?? 0}</p>

                  {rel.status === 'REQUESTED' && rel.origin === 'REFERRER' && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updateStatusMutation.mutate({ referrerProfileId: rel.referrerProfileId, newStatus: 'ACTIVE' })}>
                        Aceptar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ referrerProfileId: rel.referrerProfileId, newStatus: 'REJECTED' })}>
                        Rechazar
                      </Button>
                    </div>
                  )}
                  {rel.status === 'ACTIVE' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ referrerProfileId: rel.referrerProfileId, newStatus: 'INACTIVE' })}>
                      Deshabilitar
                    </Button>
                  )}
                  {rel.status === 'INACTIVE' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatusMutation.mutate({ referrerProfileId: rel.referrerProfileId, newStatus: 'ACTIVE' })}>
                      Rehabilitar
                    </Button>
                  )}
                  {rel.status === 'REQUESTED' && rel.origin === 'PRODUCER' && (
                    <p className="text-xs text-amber-500 font-medium">Esperando respuesta del referido</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* FREELANCE TAB */}
      {activeTab === 'freelance' && (
        <section className="space-y-4">
          <p className="text-sm text-text-muted mb-4">Explorá referidos disponibles para vender entradas en la plataforma y enviales una solicitud.</p>
          {freelance.length === 0 ? (
            <p className="text-text-muted">No hay referidos freelance disponibles en este momento.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freelance.map((ref) => (
                <div key={ref.id} className="rounded-xl border border-border bg-bg-muted p-5 flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-text">{ref.displayName}</h3>
                    {ref.bio && <p className="text-sm text-text-muted mt-2 line-clamp-2">{ref.bio}</p>}
                    <div className="mt-3 flex gap-4 text-sm mb-4">
                      <div>
                        <span className="block text-text-muted text-xs">Ventas Total</span>
                        <span className="font-medium text-text">{ref.completedSales}</span>
                      </div>
                      <div>
                        <span className="block text-text-muted text-xs">Score</span>
                        <span className="font-medium text-amber-400">★ {(ref.salesScore ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    disabled={requestAssociationMutation.isPending}
                    onClick={() => requestAssociationMutation.mutate(ref.id)}
                  >
                    Enviar Solicitud
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* EVENTS TAB (Assignments) */}
      {activeTab === 'events' && (
        <section className="space-y-4">
          <p className="text-sm text-text-muted mb-4">Seleccioná un evento para habilitar referidos asociados y generar links de venta.</p>
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/producer/events/${ev.id}/referrals`}
                  className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent"
                >
                  <p className="font-medium text-text">{ev.title}</p>
                  <p className="text-sm text-text-muted">
                    {ev.city ?? ev.venueName ?? '—'} · Ver referidos activos en este evento
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {events.length === 0 && (
            <p className="text-text-muted">No tenés eventos. Creá uno desde la pestaña Eventos.</p>
          )}
        </section>
      )}
    </PageContainer>
  );
}
