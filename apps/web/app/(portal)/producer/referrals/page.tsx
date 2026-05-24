'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import {
  PageContainer,
  SectionTitle,
  Button,
  Input,
  useToast,
  EmptyState,
  SideSheet,
} from '@/components';
import { CommercialReviewPanel } from '@/components/portal/CommercialReviewPanel';
import { getErrorMessage } from '@/lib/errors';
import { relationshipStatusLabel } from '@/lib/producer/referral-display';
import { ProducerReferralsHelp } from '@/components/producer/referrals/ProducerReferralsHelp';
import { ProducerCommissionPendingNotice } from '@/components/producer/referrals/ProducerCommissionPendingNotice';
import { ReferralLegalDisclaimer } from '@/components/producer/referrals/ReferralLegalDisclaimer';
import { ProducerReferralProposalForm } from '@/components/producer/referrals/ProducerReferralProposalForm';
import { ProducerReferralProposalList } from '@/components/producer/referrals/ProducerReferralProposalList';
import { ProducerReferralAgreementSummary } from '@/components/producer/referrals/ProducerReferralAgreementSummary';
import { ProducerReferralPaymentRequestList } from '@/components/producer/referrals/ProducerReferralPaymentRequestList';
import { ProducerReferralMetricsPanel } from '@/components/producer/referrals/ProducerReferralMetricsPanel';
import { useProducerPaymentRequests } from '@/hooks/useProducerPaymentRequests';
import {
  useProducerReferralProposals,
  useCancelProducerReferralProposal,
} from '@/hooks/useProducerReferralProposals';
import type {
  FreelanceReferrersSort,
  ProducerReferrerRelationship,
  ProducerFreelanceReferrersParams,
} from '@/repositories/interfaces';

/** Solo este origen: el referidor pidió; la productora cierra aceptando/rechazando. */
const REFERRER_INITIATED_ORIGINS = new Set(['REQUESTED_BY_REFERRER']);

const statusLabel = relationshipStatusLabel;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
    ACTIVE: 'bg-accent-surface/70 text-accent-soft border border-accent-muted',
    REJECTED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25',
    BLOCKED: 'bg-red-500/15 text-red-400 border-red-500/25',
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        colors[status] ?? 'border-border text-text-muted'
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

function FreelanceRelationHint({ status }: { status: string | null }) {
  if (status === null) {
    return (
      <span className="inline-block rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-text-muted">
        Sin relación con tu productora
      </span>
    );
  }
  return <StatusBadge status={status} />;
}

const selectClass =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent';

function invalidateReferrerProducerQueries(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['producer', 'referrers'] });
  queryClient.invalidateQueries({ queryKey: ['referrer', 'producer-relationships'] });
  queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
}

function RelationshipCard({
  rel,
  onStatusChange,
  statusBusy,
}: {
  rel: ProducerReferrerRelationship;
  onStatusChange: (referrerProfileId: string, newStatus: string) => void;
  statusBusy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-muted p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Asociación general</p>
          <h3 className="font-semibold text-text">{rel.referrerProfile.displayName}</h3>
        </div>
        <StatusBadge status={rel.status} />
      </div>
      <p className="mt-2 text-xs text-text-muted">Origen: {rel.origin}</p>
      <p className="mb-4 mt-2 text-xs text-text-muted">
        Ventas (perfil): {rel.referrerProfile.completedSales ?? 0} · Score: {rel.referrerProfile.salesScore ?? '—'}
      </p>
      <p className="mb-3 text-xs text-text-muted">
        La asociación general no asigna eventos. Los links de venta por evento se gestionan en la pestaña
        &quot;Links por evento&quot;.
      </p>

      {rel.status === 'PENDING' && REFERRER_INITIATED_ORIGINS.has(rel.origin) && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={statusBusy}
            onClick={() => onStatusChange(rel.referrerProfileId, 'ACTIVE')}
          >
            Aceptar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={statusBusy}
            onClick={() => onStatusChange(rel.referrerProfileId, 'REJECTED')}
          >
            Rechazar
          </Button>
        </div>
      )}

      {rel.status === 'PENDING' && !REFERRER_INITIATED_ORIGINS.has(rel.origin) && (
        <>
          <p className="text-xs font-medium text-amber-500/90">
            Esperando respuesta del referidor (solicitud iniciada por tu productora o desde su link).
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            disabled={statusBusy}
            onClick={() => onStatusChange(rel.referrerProfileId, 'REJECTED')}
          >
            Cancelar solicitud
          </Button>
        </>
      )}

      {rel.status === 'ACTIVE' && (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={statusBusy}
            onClick={() => onStatusChange(rel.referrerProfileId, 'BLOCKED')}
          >
            Bloquear relación
          </Button>
          <CommercialReviewPanel
            mode="producer"
            counterpartyId={rel.referrerProfileId}
            counterpartyLabel={rel.referrerProfile.displayName}
          />
        </>
      )}

      {(rel.status === 'REJECTED' || rel.status === 'BLOCKED') && (
        <p className="text-xs text-text-muted">
          {rel.status === 'BLOCKED'
            ? 'Bloqueada: no se reabre automáticamente.'
            : 'Podés volver a solicitar desde el directorio o el link del referidor.'}
        </p>
      )}
    </div>
  );
}

export default function ProducerReferralsPage() {
  const { data: session, status } = useSession();
  const { tenantId: TENANT_ID } = useTenant();
  const PRODUCER_ID = useProducerId();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'metrics' | 'proposals' | 'payment-requests' | 'associated' | 'freelance' | 'events'
  >('metrics');
  const [showProposalSheet, setShowProposalSheet] = useState(false);
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);
  const [freelanceBusyId, setFreelanceBusyId] = useState<string | null>(null);
  const [freelanceSearch, setFreelanceSearch] = useState('');
  const [debouncedFreelanceSearch, setDebouncedFreelanceSearch] = useState('');
  const [freelanceSort, setFreelanceSort] = useState<FreelanceReferrersSort>('default');
  const [freelanceRelationship, setFreelanceRelationship] = useState<
    NonNullable<ProducerFreelanceReferrersParams['relationship']>
  >('any');
  const [freelanceActivity, setFreelanceActivity] = useState<NonNullable<ProducerFreelanceReferrersParams['activity']>>(
    'any',
  );
  const [freelanceAssigned, setFreelanceAssigned] = useState<
    NonNullable<ProducerFreelanceReferrersParams['assignedEvents']>
  >('any');

  const { data: paymentRequestsData } = useProducerPaymentRequests(status === 'authenticated');

  const { data: proposalsData, isLoading: proposalsLoading, isError: proposalsError } =
    useProducerReferralProposals(status === 'authenticated');
  const cancelProposalMutation = useCancelProducerReferralProposal();
  const allProposals = proposalsData?.proposals ?? [];

  const { data: associated = [] } = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: status === 'authenticated',
  });

  const { data: producerReferrerCtx } = useQuery({
    queryKey: ['producer', 'referrers', 'context'],
    queryFn: () => repos.referrals.getProducerReferrerContext(),
    enabled: status === 'authenticated',
  });
  const hasProducerProfile = producerReferrerCtx?.hasProducerProfile === true;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedFreelanceSearch(freelanceSearch.trim()), 320);
    return () => clearTimeout(t);
  }, [freelanceSearch]);

  useEffect(() => {
    if (!hasProducerProfile) setFreelanceRelationship('any');
  }, [hasProducerProfile]);

  const relByReferrerId = useMemo(() => {
    const m = new Map<string, ProducerReferrerRelationship>();
    for (const r of associated) {
      m.set(r.referrerProfileId, r);
    }
    return m;
  }, [associated]);

  const grouped = useMemo(() => {
    const pending: ProducerReferrerRelationship[] = [];
    const active: ProducerReferrerRelationship[] = [];
    const closed: ProducerReferrerRelationship[] = [];
    for (const r of associated) {
      if (r.status === 'PENDING') pending.push(r);
      else if (r.status === 'ACTIVE') active.push(r);
      else closed.push(r);
    }
    return { pending, active, closed };
  }, [associated]);

  const freelanceQueryParams = useMemo(
    (): ProducerFreelanceReferrersParams => ({
      q: debouncedFreelanceSearch || undefined,
      sort: freelanceSort,
      relationship: hasProducerProfile ? freelanceRelationship : 'any',
      activity: freelanceActivity,
      assignedEvents: freelanceAssigned,
    }),
    [
      debouncedFreelanceSearch,
      freelanceSort,
      freelanceRelationship,
      freelanceActivity,
      freelanceAssigned,
      hasProducerProfile,
    ],
  );

  const hasFreelanceFiltersBeyondDefault = useMemo(() => {
    return (
      debouncedFreelanceSearch.length > 0 ||
      freelanceSort !== 'default' ||
      freelanceRelationship !== 'any' ||
      freelanceActivity !== 'any' ||
      freelanceAssigned !== 'any'
    );
  }, [
    debouncedFreelanceSearch,
    freelanceSort,
    freelanceRelationship,
    freelanceActivity,
    freelanceAssigned,
  ]);

  const { data: freelance = [], isFetching: freelanceFetching } = useQuery({
    queryKey: ['producer', 'referrers', 'freelance', freelanceQueryParams],
    queryFn: () => repos.referrals.getFreelanceReferrers(freelanceQueryParams),
    enabled: status === 'authenticated' && activeTab === 'freelance',
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, TENANT_ID],
    queryFn: () => repos.events.list({ tenantId: TENANT_ID, producerId: PRODUCER_ID, limit: 50 }),
    enabled:
      status === 'authenticated' && (activeTab === 'events' || showProposalSheet),
  });
  const events = eventsData?.data ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ referrerProfileId, newStatus }: { referrerProfileId: string; newStatus: string }) =>
      repos.referrals.setAssociationStatus(referrerProfileId, newStatus, 'Panel productor'),
    onSuccess: () => {
      addToast('Estado actualizado', 'success');
      invalidateReferrerProducerQueries(queryClient);
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  const freelanceRequestMutation = useMutation({
    mutationFn: (referrerProfileId: string) => repos.referrals.requestFreelanceAssociation(referrerProfileId),
    onMutate: (id) => setFreelanceBusyId(id),
    onSettled: () => setFreelanceBusyId(null),
    onSuccess: (res) => {
      addToast(
        res.created ? 'Solicitud registrada' : 'Ya existe una relación o solicitud con este referidor',
        'success',
      );
      invalidateReferrerProducerQueries(queryClient);
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
  });

  function freelanceCta(refId: string): {
    label: string;
    disabled: boolean;
    variant: 'primary' | 'outline';
    onClick?: () => void;
  } {
    const rel = relByReferrerId.get(refId);
    const busy = freelanceRequestMutation.isPending && freelanceBusyId === refId;
    if (!rel) {
      return {
        label: busy ? 'Enviando…' : 'Solicitar asociación',
        disabled: busy,
        variant: 'primary',
        onClick: () => freelanceRequestMutation.mutate(refId),
      };
    }
    switch (rel.status) {
      case 'ACTIVE':
        return { label: 'Asociado', disabled: true, variant: 'outline' };
      case 'PENDING':
        return { label: 'Solicitud pendiente', disabled: true, variant: 'outline' };
      case 'REJECTED':
        return {
          label: busy ? 'Enviando…' : 'Volver a solicitar',
          disabled: busy,
          variant: 'primary',
          onClick: () => freelanceRequestMutation.mutate(refId),
        };
      case 'BLOCKED':
        return { label: 'Bloqueada', disabled: true, variant: 'outline' };
      default:
        return { label: '—', disabled: true, variant: 'outline' };
    }
  }

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
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/producer" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Panel
      </Link>
      <SectionTitle>Gestión de referidos</SectionTitle>
      <p className="mb-4 mt-2 max-w-2xl text-text-muted">
        Asociación general productora–referidor (directorio o link del referidor). No implica asignación a un evento ni
        creación de links de venta <span className="font-mono text-xs">/r/</span>.
      </p>

      <div className="mb-6 space-y-4">
        <ReferralLegalDisclaimer />
        <ProducerReferralsHelp variant="global" />
        <ProducerCommissionPendingNotice />
      </div>

      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('metrics')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'metrics' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
          }`}
        >
          Métricas
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('proposals')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'proposals' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
          }`}
        >
          Propuestas ({allProposals.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('payment-requests')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'payment-requests'
              ? 'border-b-2 border-accent text-accent'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Solicitudes de pago ({paymentRequestsData?.paymentRequests?.length ?? '—'})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('associated')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'associated' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
          }`}
        >
          Asociados ({associated.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('freelance')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'freelance' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
          }`}
        >
          Directorio ({activeTab === 'freelance' ? freelance.length : '—'})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
            activeTab === 'events' ? 'border-b-2 border-accent text-accent' : 'text-text-muted hover:text-text'
          }`}
        >
          Links por evento
        </button>
      </nav>

      {activeTab === 'metrics' && (
        <section className="space-y-4">
          <ProducerReferralMetricsPanel />
        </section>
      )}

      {activeTab === 'proposals' && (
        <section className="space-y-6">
          <ProducerReferralAgreementSummary proposals={allProposals} />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-2xl text-sm text-text-muted">
              Propuesta comercial por evento: el referido acepta o rechaza la regla de comisión. La
              plataforma registra y mide; el pago es entre partes.
            </p>
            <Button
              type="button"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setShowProposalSheet(true)}
            >
              Enviar propuesta
            </Button>
          </div>
          {proposalsLoading && <p className="text-sm text-text-muted">Cargando propuestas…</p>}
          {proposalsError && (
            <p className="text-sm text-red-400">No se pudieron cargar las propuestas.</p>
          )}
          {!proposalsLoading && !proposalsError && (
            <ProducerReferralProposalList
              proposals={allProposals}
              cancelBusyId={cancelBusyId}
              onCancel={(id) => {
                if (
                  !window.confirm(
                    '¿Cancelar esta propuesta pendiente? El referido ya no podrá aceptarla.',
                  )
                ) {
                  return;
                }
                setCancelBusyId(id);
                cancelProposalMutation.mutate(id, {
                  onSettled: () => setCancelBusyId(null),
                  onSuccess: () => {
                    addToast('Propuesta cancelada', 'success');
                  },
                  onError: (err) => addToast(getErrorMessage(err), 'error'),
                });
              }}
            />
          )}
        </section>
      )}

      {activeTab === 'payment-requests' && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Solicitudes de pago de referidos</h2>
          <p className="max-w-2xl text-sm text-text-muted">
            Registro comunicacional de pedidos de liquidación externa. Yo Te Invito no transfiere fondos.
          </p>
          <ProducerReferralPaymentRequestList />
        </section>
      )}

      {activeTab === 'associated' && (
        <section className="space-y-8">
          {associated.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                title="Todavía no tenés referidos asociados"
                description="Explorá el directorio o aceptá solicitudes cuando un referidor se vincule con tu productora."
              />
              <Button type="button" variant="outline" onClick={() => setActiveTab('freelance')}>
                Explorar directorio
              </Button>
            </div>
          ) : (
            <>
              {grouped.pending.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Pendientes</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped.pending.map((rel) => (
                      <RelationshipCard
                        key={rel.id}
                        rel={rel}
                        statusBusy={updateStatusMutation.isPending}
                        onStatusChange={(id, s) => updateStatusMutation.mutate({ referrerProfileId: id, newStatus: s })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {grouped.active.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Activas</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped.active.map((rel) => (
                      <RelationshipCard
                        key={rel.id}
                        rel={rel}
                        statusBusy={updateStatusMutation.isPending}
                        onStatusChange={(id, s) => updateStatusMutation.mutate({ referrerProfileId: id, newStatus: s })}
                      />
                    ))}
                  </div>
                </div>
              )}
              {grouped.closed.length > 0 && (
                <div>
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">
                    Rechazadas o bloqueadas
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {grouped.closed.map((rel) => (
                      <RelationshipCard
                        key={rel.id}
                        rel={rel}
                        statusBusy={updateStatusMutation.isPending}
                        onStatusChange={(id, s) => updateStatusMutation.mutate({ referrerProfileId: id, newStatus: s })}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {activeTab === 'freelance' && (
        <section className="space-y-6">
          <div>
            <p className="text-sm text-text-muted">
              Referidores con perfil <span className="text-text">público activo</span>. Podés buscar por nombre,{' '}
              <span className="font-mono text-xs">@handle</span> o slug. El estado mostrado es la{' '}
              <span className="text-text">relación con tu productora</span>; los eventos asignados son globales en la
              plataforma (cualquier productora).
            </p>
            {!hasProducerProfile && (
              <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200/90">
                Sin perfil productor activo no podemos mostrar ni filtrar por relación con tu productora. Los demás
                filtros y la búsqueda siguen funcionando.
              </p>
            )}
            {freelanceFetching && (
              <p className="mt-2 text-xs text-accent">Actualizando resultados…</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-bg-muted/40 p-4">
            <div className="mb-4">
              <Input
                label="Buscar"
                placeholder="Nombre, @handle o slug"
                value={freelanceSearch}
                onChange={(e) => setFreelanceSearch(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block text-xs font-medium text-text-muted">
                Orden
                <select
                  className={`${selectClass} mt-1`}
                  value={freelanceSort}
                  onChange={(e) => setFreelanceSort(e.target.value as FreelanceReferrersSort)}
                >
                  <option value="default">Recomendado (score / ventas perfil)</option>
                  <option value="recent">Más recientes (perfil)</option>
                  <option value="name_asc">Nombre A–Z</option>
                  <option value="name_desc">Nombre Z–A</option>
                  <option value="activity">Más actividad (ventas perfil)</option>
                  <option value="assigned_events">Más eventos asignados</option>
                  <option value="completed_sales">Más ventas (perfil)</option>
                </select>
              </label>
              <label className={`block text-xs font-medium ${hasProducerProfile ? 'text-text-muted' : 'text-text-muted/60'}`}>
                Relación con vos
                <select
                  className={`${selectClass} mt-1 disabled:cursor-not-allowed disabled:opacity-50`}
                  value={hasProducerProfile ? freelanceRelationship : 'any'}
                  disabled={!hasProducerProfile}
                  onChange={(e) =>
                    setFreelanceRelationship(e.target.value as NonNullable<ProducerFreelanceReferrersParams['relationship']>)
                  }
                >
                  <option value="any">Todas</option>
                  <option value="none">Sin relación aún</option>
                  <option value="active">Ya asociados</option>
                  <option value="pending">Pendiente</option>
                  <option value="closed">Rechazada o bloqueada</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-text-muted">
                Actividad (perfil)
                <select
                  className={`${selectClass} mt-1`}
                  value={freelanceActivity}
                  onChange={(e) =>
                    setFreelanceActivity(e.target.value as NonNullable<ProducerFreelanceReferrersParams['activity']>)
                  }
                >
                  <option value="any">Todas</option>
                  <option value="with_sales">Con ventas en perfil (&gt;0)</option>
                  <option value="no_sales">Sin ventas en perfil</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-text-muted">
                Asignación a eventos
                <select
                  className={`${selectClass} mt-1`}
                  value={freelanceAssigned}
                  onChange={(e) =>
                    setFreelanceAssigned(
                      e.target.value as NonNullable<ProducerFreelanceReferrersParams['assignedEvents']>,
                    )
                  }
                >
                  <option value="any">Todas</option>
                  <option value="with">Con eventos asignados (activos)</option>
                  <option value="without">Sin eventos asignados</option>
                </select>
              </label>
            </div>
            {hasFreelanceFiltersBeyondDefault && (
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFreelanceSearch('');
                    setDebouncedFreelanceSearch('');
                    setFreelanceSort('default');
                    setFreelanceRelationship('any');
                    setFreelanceActivity('any');
                    setFreelanceAssigned('any');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>
            )}
          </div>

          {freelance.length === 0 && !hasFreelanceFiltersBeyondDefault ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-text-muted">
              No hay referidores públicos en el directorio por ahora.
            </p>
          ) : freelance.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
              <p className="text-text-muted">No hay resultados con estos criterios.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => {
                  setFreelanceSearch('');
                  setDebouncedFreelanceSearch('');
                  setFreelanceSort('default');
                  setFreelanceRelationship('any');
                  setFreelanceActivity('any');
                  setFreelanceAssigned('any');
                }}
              >
                Restablecer búsqueda y filtros
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {freelance.map((ref) => {
                const cta = freelanceCta(ref.id);
                return (
                  <article
                    key={ref.id}
                    className="flex flex-col rounded-xl border border-border bg-bg-muted/80 p-5 shadow-sm transition-colors hover:border-accent/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-text">{ref.displayName}</h3>
                        {ref.publicHandle && (
                          <p className="font-mono text-xs text-accent">@{ref.publicHandle}</p>
                        )}
                      </div>
                      {hasProducerProfile ? (
                        <FreelanceRelationHint status={ref.relationshipStatusWithProducer} />
                      ) : (
                        <span className="text-[10px] text-text-muted">Relación: N/D</span>
                      )}
                    </div>
                    {ref.bio && (
                      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-text-muted">{ref.bio}</p>
                    )}
                    <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center text-xs">
                      <div>
                        <p className="text-text-muted">Eventos asign.</p>
                        <p className="mt-0.5 font-semibold text-text">{ref.activeAssignedEventsCount}</p>
                        <p className="text-[10px] text-text-muted">(plataforma)</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Ventas perfil</p>
                        <p className="mt-0.5 font-semibold text-text">{ref.completedSales}</p>
                      </div>
                      <div>
                        <p className="text-text-muted">Score</p>
                        <p className="mt-0.5 font-semibold text-amber-400">
                          {ref.salesScore != null ? Number(ref.salesScore).toFixed(1) : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ref.slug && (
                        <Link
                          href={`/referrers/${ref.slug}`}
                          className="text-xs font-medium text-accent hover:underline"
                        >
                          Ver perfil público →
                        </Link>
                      )}
                    </div>
                    <div className="mt-auto flex pt-4">
                      <Button
                        size="sm"
                        variant={cta.variant}
                        disabled={cta.disabled}
                        onClick={cta.onClick}
                        className="w-full sm:w-auto"
                      >
                        {cta.label}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {activeTab === 'events' && (
        <section className="space-y-4">
          <p className="mb-4 text-sm text-text-muted">
            Asignación por evento y links de venta (distinto de la asociación general de esta pantalla).
          </p>
          <ul className="space-y-3">
            {events.map((ev) => (
              <li key={ev.id}>
                <Link
                  href={`/producer/events/${ev.id}/referrals`}
                  className="block rounded-lg border border-border bg-bg-muted p-4 transition-colors hover:border-accent"
                >
                  <p className="font-medium text-text">{ev.title}</p>
                  <p className="text-sm text-text-muted">
                    {ev.city ?? ev.venueName ?? '—'} · Referidos del evento
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          {events.length === 0 && (
            <EmptyState
              title="Sin eventos para asignar referidos"
              description="Creá un evento y después configurá referidos por evento desde esta sección."
              actionLabel="Crear evento"
              actionHref="/producer/events/new"
            />
          )}
        </section>
      )}
      <SideSheet
        isOpen={showProposalSheet}
        onClose={() => setShowProposalSheet(false)}
        title="Enviar propuesta comercial"
      >
        <ProducerReferralProposalForm
          eventOptions={events.map((ev) => ({ id: ev.id, title: ev.title }))}
          referrers={associated
            .filter((r) => r.status === 'ACTIVE')
            .map((r) => ({
              id: r.referrerProfileId,
              displayName: r.referrerProfile.displayName,
              publicHandle: r.referrerProfile.publicHandle,
            }))}
          onSuccess={() => {
            addToast('Propuesta enviada', 'success');
            setShowProposalSheet(false);
          }}
          onCancel={() => setShowProposalSheet(false)}
        />
      </SideSheet>
    </PageContainer>
  );
}
