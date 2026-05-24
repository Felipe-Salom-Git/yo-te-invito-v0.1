'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRepositories } from '@/repositories/context';
import { PageContainer, Button, Tabs, useToast } from '@/components';
import { CommercialReviewPanel } from '@/components/portal/CommercialReviewPanel';
import { ReferrerProposalInbox } from '@/components/referrer/ReferrerProposalInbox';
import { ReferrerActiveLinks } from '@/components/referrer/ReferrerActiveLinks';
import { ReferrerCommissionSummary } from '@/components/referrer/ReferrerCommissionSummary';
import { ReferrerPaymentRequestPanel } from '@/components/referrer/ReferrerPaymentRequestPanel';
import { ReferrerReferralMetricsPanel } from '@/components/referrer/ReferrerReferralMetricsPanel';
import { ReferrerOnboardingChecklist } from '@/components/onboarding/ReferrerOnboardingChecklist';
import { ReferrerLegalDisclaimer } from '@/components/referrer/ReferrerLegalDisclaimer';
import { formatMoneyCents } from '@/lib/producer/referral-display';
import { getErrorMessage } from '@/lib/errors';

const PRODUCER_INITIATED_ORIGINS = new Set([
  'DISCOVERED_IN_FREELANCE_LIST',
  'INVITED_BY_PRODUCER',
  'FREELANCE_CONTACT',
  'REQUESTED_BY_REFERRER_LINK',
]);

function eventStatusLabel(s: string): string {
  const map: Record<string, string> = {
    DRAFT: 'Borrador',
    PENDING: 'En revisión',
    APPROVED: 'Publicado',
    PAUSED: 'Pausado',
    CANCELLED: 'Cancelado',
  };
  return map[s] ?? s;
}

function SummaryStat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-4 shadow-sm ${
        accent ? 'border-accent/40 bg-accent/5' : 'border-border bg-bg-muted/50'
      }`}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? 'text-accent' : 'text-text'}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

export function ReferrerPortalPageClient() {
  const { status } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: dash, isLoading: dashLoading } = useQuery({
    queryKey: ['referrer', 'dashboard'],
    queryFn: () => repos.profiles.getReferrerDashboard(),
    enabled: status === 'authenticated',
  });

  const { data: producerRels = [] } = useQuery({
    queryKey: ['referrer', 'producer-relationships'],
    queryFn: () => repos.referrals.listReferrerProducerRelationships(),
    enabled: status === 'authenticated',
  });

  const respondMutation = useMutation({
    mutationFn: (args: { producerProfileId: string; next: 'ACTIVE' | 'REJECTED' }) =>
      repos.referrals.respondToProducerAssociation(args.producerProfileId, args.next),
    onSuccess: () => {
      addToast('Estado actualizado', 'success');
      queryClient.invalidateQueries({ queryKey: ['referrer', 'producer-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers'] });
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const profile = dash?.profile;
  const m = dash?.metrics;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const associationUrl =
    profile?.associationLinkToken && baseUrl
      ? `${baseUrl}/referrers/join/${profile.associationLinkToken}`
      : '';

  const publicProfileUrl =
    profile?.publicProfilePath && baseUrl ? `${baseUrl}${profile.publicProfilePath}` : '';

  const copyText = async (text: string, okMsg: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      addToast(okMsg, 'success');
    } catch {
      addToast('No se pudo copiar', 'error');
    }
  };

  const pendingNeedReferrer = producerRels.filter(
    (r) => r.status === 'PENDING' && PRODUCER_INITIATED_ORIGINS.has(r.origin),
  );
  const pendingWaitingProducer = producerRels.filter(
    (r) => r.status === 'PENDING' && !PRODUCER_INITIATED_ORIGINS.has(r.origin),
  );
  const activeRelationships = producerRels.filter((r) => r.status === 'ACTIVE');

  const assignedEvents = m?.assignedEvents ?? [];
  const paidOrders = m?.paidAttributedOrdersCount ?? 0;
  const ticketsSold = m?.ticketsSoldViaPaidReferralsCount ?? 0;
  const grossCents = m?.grossRevenueFromPaidReferralsCents ?? 0;
  const activeProducers = m?.activeProducerRelationshipsCount ?? 0;
  const pendingProducers = m?.pendingProducerRelationshipsCount ?? 0;

  if (status === 'loading' || dashLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (!profile || !m) {
    return (
      <PageContainer>
        <p className="text-text-muted">No encontramos un perfil de referidor.</p>
        <Link href="/cuenta/solicitar-referrer" className="mt-4 inline-block text-accent hover:underline">
          Crear perfil
        </Link>
      </PageContainer>
    );
  }

  const miActividadContent = (
    <div className="space-y-10">
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Resumen</h2>
        <p className="mt-1 max-w-2xl text-sm text-text-muted">
          Cifras globales de tu actividad. Los ingresos por link son brutos de pedidos pagos atribuidos
          (no comisiones liquidadas).
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat
            label="Productoras (asociación activa)"
            value={String(activeProducers)}
            hint="Vínculo general, no implica cada evento."
          />
          <SummaryStat
            label="Solicitudes pendientes"
            value={String(pendingProducers)}
            hint="Relaciones que siguen en trámite."
          />
          <SummaryStat
            label="Eventos asignados"
            value={String(m.assignedEventsCount)}
            hint="Te habilitaron comercialmente en estos eventos."
            accent
          />
          <SummaryStat
            label="Links de venta activos"
            value={String(m.activeEventReferralLinksCount)}
            hint="Códigos /r/… vinculados a tu perfil."
          />
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryStat label="Ventas confirmadas (pedidos)" value={String(paidOrders)} />
          <SummaryStat label="Tickets vendidos (vía tus links)" value={String(ticketsSold)} />
          <SummaryStat
            label="Ingresos brutos (referidos)"
            value={formatMoneyCents(grossCents)}
            accent
          />
          <SummaryStat
            label="Atribuciones totales"
            value={String(m.attributedOrdersCount)}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-amber-500/20 bg-bg-muted/30 p-6">
        <h2 className="text-lg font-semibold text-text">Solicitudes que te requieren</h2>
        <p className="mt-1 text-sm text-text-muted">
          Asociación general con una productora (no es asignación a un evento).
        </p>
        {pendingNeedReferrer.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-5 text-sm text-text-muted">
            No tenés invitaciones pendientes de tu respuesta.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {pendingNeedReferrer.map((rel) => (
              <li
                key={rel.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-bg-muted/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-text">{rel.producerProfile.displayName}</p>
                  <p className="text-xs text-text-muted">Origen: {rel.origin}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={respondMutation.isPending}
                    onClick={() =>
                      respondMutation.mutate({ producerProfileId: rel.producerProfileId, next: 'ACTIVE' })
                    }
                  >
                    Aceptar asociación
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={respondMutation.isPending}
                    onClick={() =>
                      respondMutation.mutate({ producerProfileId: rel.producerProfileId, next: 'REJECTED' })
                    }
                  >
                    Rechazar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {pendingWaitingProducer.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-text-muted">Esperando a la productora</h3>
            <ul className="mt-2 space-y-2">
              {pendingWaitingProducer.map((rel) => (
                <li key={rel.id} className="text-sm text-text-muted">
                  <span className="text-text">{rel.producerProfile.displayName}</span> — {rel.origin}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-border bg-bg-muted/40 p-6">
        <h2 className="text-lg font-semibold text-text">Productoras asociadas</h2>
        {activeRelationships.length === 0 ? (
          <p className="mt-4 text-sm text-text-muted">Sin relaciones activas todavía.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {activeRelationships.map((rel) => (
              <li key={rel.id} className="rounded-xl border border-accent/30 bg-bg-muted/80 p-4">
                <p className="font-medium text-text">{rel.producerProfile.displayName}</p>
                <CommercialReviewPanel
                  mode="referrer"
                  counterpartyId={rel.producerProfileId}
                  counterpartyLabel={rel.producerProfile.displayName}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-accent/25 bg-bg-muted/40 p-6">
        <h2 className="text-lg font-semibold text-text">Eventos asignados</h2>
        {assignedEvents.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
            Todavía no tenés asignaciones activas por evento.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {assignedEvents.map((ev) => (
              <li
                key={ev.eventId}
                className="rounded-xl border border-border bg-bg-muted/50 p-4 sm:flex sm:items-start sm:justify-between sm:gap-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-text">{ev.title}</p>
                  <p className="mt-1 text-xs text-text-muted">
                    {eventStatusLabel(ev.eventStatus)} · {new Date(ev.startAt).toLocaleString('es-AR')}
                  </p>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <p className="text-text-muted">
                      Pedidos PAID: <span className="font-medium text-text">{ev.paidAttributedOrdersCount}</span>
                    </p>
                    <p className="text-text-muted">
                      Bruto:{' '}
                      <span className="font-medium text-accent">
                        {formatMoneyCents(ev.grossRevenueFromReferralsCents)}
                      </span>
                    </p>
                  </div>
                  {ev.referralCode && (
                    <p className="mt-2 font-mono text-sm text-accent">
                      Código: {ev.referralCode}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="ml-3 align-middle"
                        onClick={() => copyText(`${baseUrl}/r/${ev.referralCode}`, 'Link copiado')}
                      >
                        Copiar link
                      </Button>
                    </p>
                  )}
                </div>
                <Link href={`/events/${ev.eventId}`} className="mt-3 text-sm text-accent hover:underline sm:mt-0">
                  Ver evento →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-bg-muted/40 p-6">
          <h2 className="text-lg font-semibold text-text">Tu identidad pública</h2>
          <dl className="mt-4 space-y-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Perfil público</dt>
              <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text">
                  {publicProfileUrl || '—'}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!publicProfileUrl}
                  onClick={() => copyText(publicProfileUrl, 'URL copiada')}
                >
                  Copiar
                </Button>
              </dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-bg-muted to-bg p-6">
          <h2 className="text-lg font-semibold text-text">Link para que productoras te asocien</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="block flex-1 truncate rounded-lg border border-border bg-bg px-3 py-2 text-xs text-text-muted">
              {associationUrl || '…'}
            </code>
            <Button type="button" onClick={() => copyText(associationUrl, 'Copiado')} disabled={!associationUrl}>
              Copiar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-bg via-bg to-bg-muted/30">
      <PageContainer className="max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 border-b border-border pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-bg-muted text-2xl font-semibold text-accent">
              {profile.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                profile.displayName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Panel referidor</p>
              <h1 className="text-2xl font-semibold tracking-tight text-text">{profile.displayName}</h1>
              <p className="mt-1 text-sm text-text-muted">
                Propuestas comerciales, links de venta y comisiones generadas.
              </p>
            </div>
          </div>
          <Link href="/referrers" className="text-sm text-text-muted hover:text-accent">
            Directorio público →
          </Link>
        </div>

        <ReferrerLegalDisclaimer className="mb-6" />

        {dash ? <ReferrerOnboardingChecklist dashboard={dash} className="mb-6" /> : null}

        <Tabs
          defaultValue="metrics"
          className="overflow-x-auto"
          tabs={[
            {
              id: 'metrics',
              label: 'Métricas',
              content: (
                <section className="rounded-2xl border border-border bg-bg-muted/40 p-4 sm:p-6">
                  <ReferrerReferralMetricsPanel />
                </section>
              ),
            },
            {
              id: 'proposals',
              label: 'Propuestas',
              content: (
                <section className="rounded-2xl border border-border bg-bg-muted/40 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-text">Propuestas recibidas</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Propuestas comerciales de productoras. Al aceptar, se activa tu link de referido para el
                    evento.
                  </p>
                  <div className="mt-6">
                    <ReferrerProposalInbox />
                  </div>
                </section>
              ),
            },
            {
              id: 'links',
              label: 'Links activos',
              content: (
                <section className="rounded-2xl border border-border bg-bg-muted/40 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-text">Links activos</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Promocioná eventos con tu código. Las ventas atribuidas alimentan la comisión generada.
                  </p>
                  <div className="mt-6">
                    <ReferrerActiveLinks />
                  </div>
                </section>
              ),
            },
            {
              id: 'commissions',
              label: 'Comisiones',
              content: (
                <section className="rounded-2xl border border-border bg-bg-muted/40 p-4 sm:p-6">
                  <h2 className="text-lg font-semibold text-text">Comisiones generadas</h2>
                  <p className="mt-1 text-sm text-text-muted">
                    Medición según acuerdos y ventas atribuidas. No es saldo ni dinero en cuenta de Yo Te Invito.
                  </p>
                  <div className="mt-6">
                    <ReferrerPaymentRequestPanel />
                  </div>
                </section>
              ),
            },
            {
              id: 'activity',
              label: 'Mi actividad',
              content: miActividadContent,
            },
          ]}
        />
      </PageContainer>
    </div>
  );
}
