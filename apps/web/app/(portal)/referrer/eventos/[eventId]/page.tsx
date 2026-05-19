'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function ReferrerEventoDetailPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const eventId = (params?.eventId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();
  const { tenantId: hookTenant } = useTenant();
  const tenantId = hookTenant ?? 'tenant-demo';
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: event } = useQuery({
    queryKey: ['events', 'detail', eventId, tenantId],
    queryFn: () => repos.events.getDetail(eventId, tenantId),
    enabled: !!eventId,
  });

  const { data: linksData } = useQuery({
    queryKey: ['referrals', 'user', userId],
    queryFn: () => repos.referrals.listLinksByUser(userId),
    enabled: !!userId,
  });

  const { data: commissions } = useQuery({
    queryKey: ['referralCommissions', userId],
    queryFn: () => repos.referrals.listCommissionsByUser(userId),
    enabled: !!userId,
  });

  const requestMutation = useMutation({
    mutationFn: (referralLinkId: string) => repos.referrals.requestCommission(userId, referralLinkId),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['referralCommissions'] });
      queryClient.invalidateQueries({ queryKey: ['referrals'] });
    },
  });

  const links = (linksData?.links ?? []).filter((l) => l.eventId === eventId);
  const totalSales = links.reduce((s, l) => s + (l.attributedOrdersCount ?? 0), 0);
  const commissionCents = totalSales * 5000;
  const eventCommissions = (commissions ?? []).filter((c) => c.eventId === eventId);
  const hasRequested = eventCommissions.some((c) => c.status === 'REQUESTED' || c.status === 'PAID');
  const linkToRequest = links.find((l) => !eventCommissions.some((c) => c.referralLinkId === l.id && (c.status === 'REQUESTED' || c.status === 'PAID')));

  return (
    <PageContainer>
      <Link href="/referrer/eventos" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Eventos
      </Link>
      <SectionTitle>{event?.title ?? `Evento ${eventId}`}</SectionTitle>
      <p className="mt-2 text-text-muted">
        {event?.city ?? event?.venueName ?? '—'} ·{' '}
        {event?.startAt ? new Date(event.startAt).toLocaleDateString() : '—'}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <p className="text-sm text-text-muted">Ventas atribuidas</p>
          <p className="text-2xl font-bold text-text">{totalSales}</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-muted p-4">
          <p className="text-sm text-text-muted">Comisión (demo: $50/venta)</p>
          <p className="text-2xl font-bold text-accent">${(commissionCents / 100).toLocaleString('es-AR')}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-text">Mis links</h2>
        <ul className="mt-4 space-y-2">
          {links.map((l) => {
            const comm = eventCommissions.find((c) => c.referralLinkId === l.id);
            const salePath = `/checkout/${eventId}?tenantId=${encodeURIComponent(tenantId)}&ref=${encodeURIComponent(l.code)}`;
            const saleUrl =
              typeof window !== 'undefined' ? `${window.location.origin}${salePath}` : salePath;
            return (
              <li key={l.id} className="flex flex-col gap-2 rounded border border-border bg-bg-muted p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="font-medium">{l.code}</span>
                  {l.label && <span className="ml-2 text-text-muted">— {l.label}</span>}
                  <span className="ml-2 text-sm text-text-muted">({l.attributedOrdersCount} ventas)</span>
                  <p className="mt-1 text-xs text-text-muted">Link de venta (checkout)</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      void navigator.clipboard.writeText(saleUrl).then(
                        () => addToast('Link de venta copiado', 'success'),
                        () => addToast('No se pudo copiar', 'error'),
                      )
                    }
                  >
                    Copiar link
                  </Button>
                  {comm?.status === 'PAID' ? (
                    <span className="rounded bg-green-500/20 px-2 py-0.5 text-sm text-green-600">Cobrado</span>
                  ) : comm?.status === 'REQUESTED' ? (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-sm text-amber-600">Solicitado</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => requestMutation.mutate(l.id)}
                      disabled={requestMutation.isPending || (l.attributedOrdersCount ?? 0) === 0}
                    >
                      Solicitar cobro
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-text">Solicitudes de comisión</h2>
        {eventCommissions.length === 0 ? (
          <p className="mt-4 text-text-muted">Ninguna solicitud aún.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {eventCommissions.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded border border-border p-3">
                <span>${(c.amountCents / 100).toLocaleString('es-AR')}</span>
                <span
                  className={`rounded px-2 py-0.5 text-sm ${
                    c.status === 'PAID' ? 'bg-green-500/20 text-green-600' : 'bg-amber-500/20 text-amber-600'
                  }`}
                >
                  {c.status === 'PAID' ? 'Cobrado' : 'Pendiente de confirmación'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageContainer>
  );
}
