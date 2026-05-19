'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRepositories } from '@/repositories/context';
import { PageContainer, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const PRODUCER_INITIATED_ORIGINS = new Set([
  'DISCOVERED_IN_FREELANCE_LIST',
  'INVITED_BY_PRODUCER',
  'FREELANCE_CONTACT',
  'REQUESTED_BY_REFERRER_LINK',
]);

function formatMoneyCents(cents: number) {
  return (cents / 100).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}

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

export default function ReferrerPortalPage() {
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

  const saleLinks = m?.saleLinks ?? [];
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

  return (
    <div className="min-h-[60vh] bg-gradient-to-b from-bg via-bg to-bg-muted/30">
      <PageContainer className="max-w-5xl">
        {/* ——— Cabecera ——— */}
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
                Perfil: <span className="text-text">{profile.status}</span>
                {profile.publicVisibility ? ' · Visible en directorio' : ' · No listado públicamente'}
              </p>
              {(profile.city || profile.region) && (
                <p className="text-sm text-text-muted">{[profile.city, profile.region].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
          <Link href="/referrers" className="text-sm text-text-muted hover:text-accent">
            Directorio público →
          </Link>
        </div>

        {/* ——— Resumen principal ——— */}
        <section className="mb-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">Resumen</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Cifras globales de tu actividad. Los ingresos por link son <span className="text-text">brutos</span> de pedidos
            pagos atribuidos a tus códigos (no comisiones liquidadas).
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
              hint="Códigos /r/… vinculados a tu perfil o usuario."
            />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryStat label="Ventas confirmadas (pedidos)" value={String(paidOrders)} hint="Pedidos PAID atribuidos." />
            <SummaryStat label="Tickets vendidos (vía tus links)" value={String(ticketsSold)} hint="Suma de cantidades en esos pedidos." />
            <SummaryStat
              label="Ingresos brutos (referidos)"
              value={formatMoneyCents(grossCents)}
              hint="Suma de totales de pedido PAID."
              accent
            />
            <SummaryStat
              label="Atribuciones totales"
              value={String(m.attributedOrdersCount)}
              hint="Incluye pedidos aún no pagados o anulados."
            />
          </div>
        </section>

        {/* ——— Solicitudes + relaciones ——— */}
        <section className="mt-10 rounded-2xl border border-amber-500/20 bg-bg-muted/30 p-6">
          <h2 className="text-lg font-semibold text-text">Solicitudes que te requieren</h2>
          <p className="mt-1 text-sm text-text-muted">
            <span className="font-medium text-text">Asociación general</span> con una productora. No es asignación a un
            evento.
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

        <section className="mt-6 rounded-2xl border border-border bg-bg-muted/40 p-6">
          <h2 className="text-lg font-semibold text-text">Productoras con las que estás asociado</h2>
          <p className="mt-1 text-sm text-text-muted">Solo relaciones en estado activo.</p>
          {activeRelationships.length === 0 ? (
            <p className="mt-4 text-sm text-text-muted">
              Cuando aceptes una invitación o la productora acepte tu solicitud, aparecerán aquí.
            </p>
          ) : (
            <ul className="mt-4 flex flex-wrap gap-2">
              {activeRelationships.map((rel) => (
                <li
                  key={rel.id}
                  className="rounded-full border border-accent/30 bg-bg-muted/80 px-4 py-2 text-sm text-text"
                >
                  {rel.producerProfile.displayName}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ——— Rendimiento global (etiqueta explícita) ——— */}
        <section className="mt-10 rounded-2xl border border-border bg-bg-muted/40 p-6">
          <h2 className="text-lg font-semibold text-text">Rendimiento global (tus links)</h2>
          <p className="mt-1 text-sm text-text-muted">
            Agregado de <span className="font-mono text-xs text-accent">/r/&lt;código&gt;</span> a pedidos{' '}
            <span className="text-text">pagados</span>. Separado de comisiones legacy (usuario).
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="text-xs text-text-muted">Pedidos PAID</p>
              <p className="mt-1 text-xl font-semibold text-text">{paidOrders}</p>
            </div>
            <div className="rounded-xl border border-border bg-bg p-4">
              <p className="text-xs text-text-muted">Tickets</p>
              <p className="mt-1 text-xl font-semibold text-text">{ticketsSold}</p>
            </div>
            <div className="rounded-xl border border-accent/25 bg-bg p-4">
              <p className="text-xs text-text-muted">Bruto acumulado</p>
              <p className="mt-1 text-xl font-semibold text-accent">{formatMoneyCents(grossCents)}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Comisiones pagadas (legacy)</p>
              <p className="mt-2 text-xl font-semibold text-accent">{formatMoneyCents(m.commissionsPaidCents)}</p>
              <p className="mt-1 text-xs text-text-muted">Modelo anterior ligado a tu usuario, no al perfil.</p>
            </div>
            <div className="rounded-xl border border-border bg-bg-muted/50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Pendientes / solicitadas</p>
              <p className="mt-2 text-xl font-semibold text-text">{formatMoneyCents(m.commissionsOutstandingCents)}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-text-muted">
            <span>
              Puntuación perfil:{' '}
              <span className="text-text">{profile.salesScore != null ? String(profile.salesScore) : '—'}</span>
            </span>
            <span>
              Ventas históricas (perfil):{' '}
              <span className="text-text">{m.completedSales}</span>
            </span>
          </div>
        </section>

        {/* ——— Eventos asignados (por evento) ——— */}
        <section className="mt-10 rounded-2xl border border-accent/25 bg-bg-muted/40 p-6">
          <h2 className="text-lg font-semibold text-text">Eventos donde estás asignado</h2>
          <p className="mt-1 text-sm text-text-muted">
            <span className="font-medium text-accent">Asignado al evento</span>: la productora te dio un rol comercial
            (link y/o cortesías). Las métricas de cada tarjeta son solo de ese evento.
          </p>
          {assignedEvents.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
              Todavía no tenés asignaciones activas. Las productoras con las que estés{' '}
              <span className="text-text">asociado</span> pueden asignarte desde su panel del evento.
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
                      {(ev.city || ev.venueName) && ` · ${[ev.city, ev.venueName].filter(Boolean).join(' · ')}`}
                    </p>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <p className="text-text-muted">
                        Pedidos PAID (este evento):{' '}
                        <span className="font-medium text-text">{ev.paidAttributedOrdersCount}</span>
                      </p>
                      <p className="text-text-muted">
                        Tickets: <span className="font-medium text-text">{ev.ticketsSoldCount}</span>
                      </p>
                      <p className="text-text-muted">
                        Bruto referido:{' '}
                        <span className="font-medium text-accent">
                          {formatMoneyCents(ev.grossRevenueFromReferralsCents)}
                        </span>
                      </p>
                      <p className="text-text-muted">
                        Cortesías: {ev.courtesyUsedCount}/{ev.courtesyQuota}
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
                          onClick={() =>
                            copyText(`${baseUrl}/r/${ev.referralCode}`, 'Link de venta copiado')
                          }
                        >
                          Copiar link
                        </Button>
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/events/${ev.eventId}`}
                    className="mt-3 inline-block shrink-0 text-sm text-accent hover:underline sm:mt-0"
                  >
                    Ver evento →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ——— Links de venta (acceso rápido) ——— */}
        <section className="mt-10 rounded-2xl border border-border bg-bg-muted/40 p-6">
          <h2 className="text-lg font-semibold text-text">Acceso rápido a links de venta</h2>
          <p className="mt-1 text-sm text-text-muted">
            Cada fila es un evento concreto. &quot;Atribuciones&quot; cuenta todos los pedidos enlazados; &quot;PAID&quot; solo pagados.
          </p>
          {saleLinks.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-text-muted">
              Sin links todavía. Pedí la <span className="text-text">asociación</span> a una productora y que te{' '}
              <span className="text-accent">asignen</span> al evento.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {saleLinks.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-bg-muted/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text">{row.eventTitle}</p>
                    <p className="text-xs text-text-muted">
                      {eventStatusLabel(row.eventStatus)} ·{' '}
                      <span className="font-mono text-accent">{row.code}</span> · PAID: {row.paidAttributedOrdersCount} ·
                      Tickets: {row.ticketsSoldCount} · {formatMoneyCents(row.grossRevenueFromReferralsCents)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => copyText(row.url, 'Link copiado')}>
                      Copiar
                    </Button>
                    <Link href={`/events/${row.eventId}`} className="inline-flex items-center text-sm text-accent hover:underline">
                      Evento
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ——— Identidad y link de asociación ——— */}
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border border-border bg-bg-muted/40 p-6">
            <h2 className="text-lg font-semibold text-text">Tu identidad pública</h2>
            <p className="mt-1 text-sm text-text-muted">
              URL y handle los genera la plataforma. No confundir con links de venta por evento.
            </p>
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
                    className="shrink-0"
                    disabled={!publicProfileUrl}
                    onClick={() => copyText(publicProfileUrl, 'URL copiada')}
                  >
                    Copiar
                  </Button>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-text-muted">Handle</dt>
                <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <code className="block flex-1 rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text">
                    {profile.publicHandle ? `@${profile.publicHandle}` : '—'}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!profile.publicHandle}
                    onClick={() => copyText(profile.publicHandle ?? '', 'Handle copiado')}
                  >
                    Copiar
                  </Button>
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-accent/40 bg-gradient-to-br from-bg-muted to-bg p-6">
            <h2 className="text-lg font-semibold text-text">Link para que productoras te asocien</h2>
            <p className="mt-2 max-w-xl text-sm text-text-muted">
              Inicia solo la <span className="text-text">relación general</span>. No vende entradas ni reemplaza la
              asignación por evento.
            </p>
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
      </PageContainer>
    </div>
  );
}
