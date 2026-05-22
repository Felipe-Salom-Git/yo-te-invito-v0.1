'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import {
  PageContainer,
  SectionTitle,
  Breadcrumbs,
  Button,
  Input,
  SideSheet,
  EmptyState,
  PageLoader,
  useToast,
} from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { referralKeys } from '@/lib/query/keys';
import {
  commissionStatusLabel,
  eventAssignmentStatusLabel,
  formatMoneyCents,
} from '@/lib/producer/referral-display';
import { ProducerReferralsHelp } from './ProducerReferralsHelp';
import { ProducerCommissionPendingNotice } from './ProducerCommissionPendingNotice';
import { ReferralLinkRow } from './ReferralLinkRow';
import { CopyReferralLinkButton } from './CopyReferralLinkButton';
import { ProducerReferralProposalForm } from './ProducerReferralProposalForm';
import { ProducerReferralProposalList } from './ProducerReferralProposalList';
import { ProducerReferralAgreementSummary } from './ProducerReferralAgreementSummary';
import { ProducerEventReferralMetricsPanel } from './ProducerEventReferralMetricsPanel';
import {
  useProducerReferralProposals,
  useCancelProducerReferralProposal,
} from '@/hooks/useProducerReferralProposals';
import { useProducerEventReferralMetrics } from '@/hooks/useProducerReferralMetrics';

type TabId = 'proposals' | 'assigned' | 'links' | 'metrics' | 'commissions';

function isOperationalAssignmentStatus(s: string): boolean {
  return s === 'ACTIVE' || s === 'PAUSED';
}

type Props = {
  eventId: string;
};

export function ProducerEventReferralsPageClient({ eventId }: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { tenantId } = useTenant();
  const { addToast } = useToast();
  const t = tenantId ?? 'tenant-demo';

  const [activeTab, setActiveTab] = useState<TabId>('proposals');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [assigningRefId, setAssigningRefId] = useState<string | null>(null);
  const [courtesyQuota, setCourtesyQuota] = useState(0);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ['event', 'producer', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId,
  });

  const { data: associated = [], isLoading: assocLoading } = useQuery({
    queryKey: ['producer', 'referrers', 'associated'],
    queryFn: () => repos.referrals.getAssociatedReferrers(),
    enabled: !!eventId,
  });

  const { data: assignmentsData, isLoading: assignLoading } = useQuery({
    queryKey: referralKeys.eventAssignments(eventId),
    queryFn: () => repos.referrals.listEventAssignments(eventId),
    enabled: !!eventId,
  });

  const { data: linksData, isLoading: linksLoading } = useQuery({
    queryKey: referralKeys.eventLinks(eventId),
    queryFn: () => repos.referrals.listLinks(eventId, ''),
    enabled: !!eventId,
  });

  const { data: eventReferralMetrics } = useProducerEventReferralMetrics(eventId, !!eventId);

  const { data: commissionRequests = [] } = useQuery({
    queryKey: referralKeys.eventCommissions(eventId),
    queryFn: () => repos.referrals.listCommissionRequestsForEvent(eventId),
    enabled: !!eventId,
  });

  const { data: proposalsData, isLoading: proposalsLoading } = useProducerReferralProposals(!!eventId);
  const cancelProposalMutation = useCancelProducerReferralProposal();
  const [cancelBusyId, setCancelBusyId] = useState<string | null>(null);

  const eventProposals = useMemo(
    () => (proposalsData?.proposals ?? []).filter((p) => p.eventId === eventId),
    [proposalsData?.proposals, eventId],
  );

  const assignments = assignmentsData?.assignments ?? [];
  const links = linksData?.links ?? [];
  const hasCommissions = commissionRequests.length > 0;
  const metricsReferrerCount = eventReferralMetrics?.byReferrer.length ?? 0;

  const profileNameById = new Map(
    assignments.map((a) => [a.referrerProfile.id, a.referrerProfile.displayName]),
  );

  const assignedProfileIdsOperational = new Set(
    assignments
      .filter((a) => isOperationalAssignmentStatus(a.assignment.status))
      .map((a) => a.referrerProfile.id),
  );

  const activeAssociated = associated.filter((r) => r.status === 'ACTIVE');

  const assignMutation = useMutation({
    mutationFn: ({ referrerProfileId, quota }: { referrerProfileId: string; quota: number }) =>
      repos.referrals.assignReferrerToEvent(eventId, referrerProfileId, quota),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (res) => {
      addToast(
        res.alreadyAssigned
          ? 'Ya estaba asignado; actualizamos el cupo de cortesías si lo indicaste.'
          : 'Referidor asignado. Link de venta listo para copiar.',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: referralKeys.eventAssignments(eventId) });
      queryClient.invalidateQueries({ queryKey: referralKeys.eventLinks(eventId) });
      setAssigningRefId(null);
      setCourtesyQuota(0);
      setActiveTab('assigned');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (commissionId: string) =>
      repos.referrals.confirmCommissionPayout(commissionId, ''),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      addToast('Pago externo registrado', 'success');
      queryClient.invalidateQueries({ queryKey: referralKeys.eventCommissions(eventId) });
    },
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningRefId) return;
    if (courtesyQuota < 0) {
      addToast('El cupo de cortesías no puede ser negativo.', 'error');
      return;
    }
    assignMutation.mutate({ referrerProfileId: assigningRefId, quota: courtesyQuota });
  };

  const isLoading = eventLoading || assocLoading || assignLoading;

  if (isLoading) {
    return <PageLoader />;
  }

  const eventTitle = event?.title ?? 'Evento';

  const referrerOptions = activeAssociated.map((r) => ({
    id: r.referrerProfile.id,
    displayName: r.referrerProfile.displayName,
    publicHandle: r.referrerProfile.publicHandle,
  }));

  const handleCancelProposal = (proposalId: string) => {
    if (
      !window.confirm(
        '¿Cancelar esta propuesta pendiente? El referido ya no podrá aceptarla.',
      )
    ) {
      return;
    }
    setCancelBusyId(proposalId);
    cancelProposalMutation.mutate(proposalId, {
      onSettled: () => setCancelBusyId(null),
      onSuccess: () => addToast('Propuesta cancelada', 'success'),
      onError: (err) => addToast(getErrorMessage(err), 'error'),
    });
  };

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'proposals', label: 'Propuestas', count: eventProposals.length },
    { id: 'assigned', label: 'Asignados', count: assignments.length },
    { id: 'links', label: 'Links', count: links.length },
    { id: 'metrics', label: 'Métricas', count: metricsReferrerCount || undefined },
  ];
  if (hasCommissions) {
    tabs.push({ id: 'commissions', label: 'Solicitudes', count: commissionRequests.length });
  }

  return (
    <PageContainer>
      <Breadcrumbs
        items={[
          { label: 'Mis eventos', href: '/producer/events' },
          { label: eventTitle, href: `/producer/events/${eventId}` },
          { label: 'Referidos' },
        ]}
      />

      <SectionTitle>Referidos del evento</SectionTitle>
      <p className="mt-2 max-w-2xl text-sm text-text-muted">
        Asigná referidos asociados a <span className="font-medium text-text">{eventTitle}</span>,
        copiá links de venta y revisá atribuciones. Las cortesías directas del evento están en{' '}
        <Link href={`/producer/events/${eventId}/courtesies`} className="text-accent hover:underline">
          Cortesías
        </Link>
        .
      </p>

      <div className="mt-6 space-y-4">
        <ProducerReferralsHelp variant="event" />
        <ProducerCommissionPendingNotice />
      </div>

      <nav className="-mx-1 mt-8 flex gap-1 overflow-x-auto border-b border-border px-1 pb-px">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`shrink-0 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-b-2 border-accent text-accent'
                : 'text-text-muted hover:text-text'
            }`}
          >
            {tab.label}
            {tab.count != null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </nav>

      {activeTab === 'proposals' && (
        <section className="mt-6 space-y-6">
          <ProducerReferralAgreementSummary
            proposals={eventProposals}
            paymentRequestsPending={commissionRequests.filter((c) => c.status === 'REQUESTED').length}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-text">Propuestas comerciales</h2>
              <p className="mt-1 text-sm text-text-muted">
                Enviá una propuesta con regla de comisión. Si el referido acepta, se activa el link
                de venta automáticamente.
              </p>
            </div>
            <Button
              type="button"
              className="w-full shrink-0 sm:w-auto"
              onClick={() => setShowProposalForm(true)}
              disabled={referrerOptions.length === 0}
            >
              Enviar propuesta
            </Button>
          </div>
          {proposalsLoading ? (
            <p className="text-sm text-text-muted">Cargando propuestas…</p>
          ) : (
            <ProducerReferralProposalList
              proposals={eventProposals}
              onCancel={handleCancelProposal}
              cancelBusyId={cancelBusyId}
              emptyTitle="Sin propuestas para este evento"
              emptyDescription="Enviá una propuesta a un referido asociado para promocionar este evento con comisión pactada."
            />
          )}
        </section>
      )}

      {activeTab === 'assigned' && (
        <section className="mt-6 space-y-8">
          <div>
            <h2 className="font-semibold text-text">Asignados a este evento</h2>
            <p className="mt-1 text-sm text-text-muted">
              Cada asignación activa incluye un link de venta. El cupo de cortesías es por asignación
              (distinto del otorgamiento directo en Cortesías).
            </p>
            {assignments.length === 0 ? (
              <div className="mt-6">
                <EmptyState
                  title="Sin referidos asignados"
                  description="Asociá referidos en el panel general y luego asignalos a este evento."
                  actionLabel="Ir a referidos"
                  actionHref="/producer/referrals"
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {assignments.map((row) => (
                  <li
                    key={row.assignment.id}
                    className="rounded-xl border border-border bg-bg-muted/30 p-4 sm:p-5"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold text-text">{row.referrerProfile.displayName}</p>
                        {row.referrerProfile.publicHandle ? (
                          <p className="font-mono text-xs text-accent">
                            @{row.referrerProfile.publicHandle}
                          </p>
                        ) : null}
                        <p className="mt-2 text-sm text-text-muted">
                          Asignación:{' '}
                          <span className="text-text">
                            {eventAssignmentStatusLabel(row.assignment.status)}
                          </span>
                          {' · '}
                          Cortesías: {row.assignment.courtesyUsedCount}/
                          {row.assignment.courtesyQuota}
                        </p>
                        <p className="mt-1 text-xs text-text-muted">
                          Ventas perfil: {row.referrerProfile.completedSales ?? 0} · Score:{' '}
                          {row.referrerProfile.salesScore ?? '—'}
                        </p>
                      </div>
                      {row.referralLink ? (
                        <div className="flex flex-col gap-2 sm:items-end">
                          <span className="font-mono text-sm text-accent">{row.referralLink.code}</span>
                          <p className="text-xs text-text-muted">
                            {row.referralLink.attributedOrdersCount} ventas atribuidas
                          </p>
                          <CopyReferralLinkButton
                            text={row.referralLink.url}
                            onCopied={() => addToast('Link copiado', 'success')}
                            onError={() => addToast('No se pudo copiar', 'error')}
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-amber-200/90">Sin link de venta</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-border bg-bg-muted/40 p-4 sm:p-5">
            <h2 className="font-semibold text-text">Asociados disponibles para asignar</h2>
            <p className="mt-1 text-sm text-text-muted">
              Solo referidos con relación general <span className="text-text">ACTIVE</span>.
            </p>
            {activeAssociated.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  title="No hay referidos asociados"
                  description="Gestioná la asociación general antes de asignar a este evento."
                  actionLabel="Mis referidos"
                  actionHref="/producer/referrals"
                />
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {activeAssociated.map((rel) => {
                  const operationalHere = assignedProfileIdsOperational.has(rel.referrerProfile.id);
                  return (
                    <li
                      key={rel.id}
                      className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium text-text">{rel.referrerProfile.displayName}</p>
                        <p className="text-xs text-text-muted">
                          Asignado a este evento:{' '}
                          {operationalHere ? (
                            <span className="text-accent">sí</span>
                          ) : (
                            <span>no</span>
                          )}
                        </p>
                      </div>
                      {operationalHere ? (
                        <span className="text-sm font-medium text-accent">Ya asignado</span>
                      ) : (
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => {
                            setAssigningRefId(rel.referrerProfile.id);
                            setCourtesyQuota(0);
                          }}
                        >
                          Asignar al evento
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      )}

      {activeTab === 'links' && (
        <section className="mt-6">
          <h2 className="font-semibold text-text">Links de venta del evento</h2>
          <p className="mt-1 text-sm text-text-muted">
            Incluye links por asignación y otros históricos del evento.
          </p>
          {linksLoading ? (
            <p className="mt-4 text-sm text-text-muted">Cargando links…</p>
          ) : links.length === 0 ? (
            <div className="mt-6 space-y-4 text-center">
              <EmptyState
                title="Sin links de referido"
                description="Asigná un referido al evento para generar el primer link automáticamente."
              />
              <Button type="button" variant="outline" onClick={() => setActiveTab('assigned')}>
                Ir a asignados
              </Button>
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {links.map((l) => (
                <ReferralLinkRow
                  key={l.id}
                  eventId={eventId}
                  tenantId={t}
                  link={l}
                  referrerName={
                    l.referrerProfileId
                      ? profileNameById.get(l.referrerProfileId) ?? null
                      : null
                  }
                  onCopySuccess={() => addToast('Link copiado', 'success')}
                  onCopyError={() => addToast('No se pudo copiar el link', 'error')}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {activeTab === 'metrics' && (
        <section className="mt-6">
          <h2 className="font-semibold text-text">Métricas de referidos (evento)</h2>
          <p className="mt-1 text-sm text-text-muted">
            Solo pedidos <span className="text-text">pagados</span> atribuidos a links de referido. La comisión
            generada es referencia según acuerdos; no es saldo.
          </p>
          <div className="mt-6">
            <ProducerEventReferralMetricsPanel eventId={eventId} />
          </div>
        </section>
      )}

      {activeTab === 'commissions' && hasCommissions && (
        <section className="mt-6">
          <h2 className="font-semibold text-text">Solicitudes de pago</h2>
          <p className="mt-1 text-sm text-text-muted">
            El referido puede solicitar el pago a tu productora fuera de la plataforma. Registrar acá
            no transfiere dinero.
          </p>
          <ul className="mt-4 space-y-3">
            {commissionRequests.map((c) => (
              <li
                key={c.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">
                    {formatMoneyCents(c.amountCents)}{' '}
                    <span className="text-sm font-normal text-text-muted">
                      (monto registrado en la solicitud)
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Estado: {commissionStatusLabel(c.status)} · Referidor: {c.referrerId.slice(0, 8)}…
                  </p>
                </div>
                {c.status === 'REQUESTED' ? (
                  <Button
                    size="sm"
                    disabled={confirmMutation.isPending}
                    onClick={() => confirmMutation.mutate(c.id)}
                  >
                    Registrar pago externo
                  </Button>
                ) : (
                  <span className="text-sm text-text-muted">{commissionStatusLabel(c.status)}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <SideSheet
        isOpen={showProposalForm}
        onClose={() => setShowProposalForm(false)}
        title="Enviar propuesta comercial"
      >
        <ProducerReferralProposalForm
          eventId={eventId}
          eventTitle={eventTitle}
          referrers={referrerOptions}
          onSuccess={() => {
            addToast('Propuesta enviada al referido', 'success');
            setShowProposalForm(false);
          }}
          onCancel={() => setShowProposalForm(false)}
        />
      </SideSheet>

      <SideSheet
        isOpen={!!assigningRefId}
        onClose={() => setAssigningRefId(null)}
        title="Asignar referido al evento"
      >
        <form onSubmit={handleAssign} className="space-y-6">
          <p className="text-sm text-text-muted">
            Se creará o actualizará la asignación comercial y el link de venta. La asociación general
            debe estar activa.
          </p>
          <div className="rounded-lg border border-border bg-bg-muted/50 p-4">
            <h3 className="font-medium text-text">Cortesías del evento (opcional)</h3>
            <p className="mb-4 mt-1 text-sm text-text-muted">
              Cupo ligado a esta asignación (el referidor consume desde su cupo; distinto de Cortesías
              → otorgamiento directo).
            </p>
            <Input
              label="Cupo de cortesías"
              type="number"
              min={0}
              value={courtesyQuota || ''}
              onChange={(e) => setCourtesyQuota(Math.max(0, parseInt(e.target.value, 10) || 0))}
              placeholder="0 si no aplica"
            />
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-6 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setAssigningRefId(null)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={assignMutation.isPending}>
              {assignMutation.isPending ? 'Guardando…' : 'Confirmar asignación'}
            </Button>
          </div>
        </form>
      </SideSheet>
    </PageContainer>
  );
}
