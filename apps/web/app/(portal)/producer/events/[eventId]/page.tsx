'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, Badge, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const TENANT_ID = 'tenant-demo';

export default function ProducerEventManagePage() {
  const params = useParams();
  const { data: session } = useSession();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const eventId = (params?.eventId as string) ?? '';
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [showTTForm, setShowTTForm] = useState(false);
  const [ttName, setTTName] = useState('');
  const [ttPrice, setTTPrice] = useState(0);
  const [ttCap, setTTCap] = useState(100);
  const [ttSaleStart, setTTSaleStart] = useState('');
  const [ttSaleEnd, setTTSaleEnd] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<string>('ALL');

  const { data: tickets } = useQuery({
    queryKey: ['tickets', 'event', eventId],
    queryFn: () => repos.tickets.listByEvent(eventId),
    enabled: !!eventId,
  });

  const createTT = useMutation({
    mutationFn: () =>
      repos.ticketTypes.create(eventId, {
        name: ttName,
        price: ttPrice,
        capacityAvailable: ttCap,
        saleStart: ttSaleStart || null,
        saleEnd: ttSaleEnd || null,
      }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticketTypes', eventId] });
      setShowTTForm(false);
      setTTName('');
      setTTPrice(0);
      setTTCap(100);
      setTTSaleStart('');
      setTTSaleEnd('');
    },
  });

  const { data: event, isLoading } = useQuery({
    queryKey: ['event', 'producer', eventId],
    queryFn: () => repos.events.getDetailForProducer(eventId),
    enabled: !!eventId,
  });

  const { data: ticketTypes } = useQuery({
    queryKey: ['ticketTypes', 'producer', eventId],
    queryFn: () => repos.courtesies.fetchTicketTypes(eventId, userId),
    enabled: !!eventId && !!userId,
  });

  if (isLoading || !eventId) return <PageContainer><p className="text-text-muted">Loading…</p></PageContainer>;
  if (!event) return <PageContainer><p className="text-red-400">Evento no encontrado</p></PageContainer>;

  return (
    <PageContainer>
      <Link href="/producer/events" className="mb-4 inline-block text-sm text-text-muted hover:text-text">← Eventos</Link>
      <div className="flex flex-wrap items-center gap-2">
        <SectionTitle>{event.title}</SectionTitle>
        <Badge variant={event.status === 'APPROVED' ? 'accent' : event.status === 'PENDING' ? 'default' : 'muted'}>
          {event.status ?? 'DRAFT'}
        </Badge>
      </div>
      <p className="mt-2 text-text-muted">{event.venueName ?? event.city ?? '—'} · {new Date(event.startAt).toLocaleDateString('es-AR')}</p>

      <section className="mt-8">
        <h2 className="font-semibold text-text">Tickets vendidos</h2>
        <div className="mt-2 flex gap-2">
          {['ALL', 'VALID', 'USED', 'REVOKED'].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setTicketStatusFilter(s)}
              className={`rounded px-2 py-1 text-sm ${ticketStatusFilter === s ? 'bg-accent text-bg' : 'bg-bg-muted text-text-muted'}`}
            >
              {s}
            </button>
          ))}
        </div>
        {tickets && tickets.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {(ticketStatusFilter === 'ALL' ? tickets : tickets.filter((t) => t.status === ticketStatusFilter)).map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded border border-border bg-bg-muted px-4 py-2 text-sm">
                <span>{t.id}</span>
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-border">{t.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-text-muted">Sin tickets</p>
        )}
      </section>

      <nav className="mt-8 flex flex-wrap gap-4">
        <Link href={`/producer/events/${eventId}/courtesies`} className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Courtesías
        </Link>
        <Link href={`/producer/events/${eventId}/referrals`} className="rounded border border-accent px-4 py-2 text-accent hover:bg-accent/10">
          Referidos
        </Link>
        <Link href="/producer/payouts" className="rounded border border-border px-4 py-2 text-text-muted hover:bg-bg-muted">
          Solicitar retiro
        </Link>
      </nav>

      <section className="mt-8">
        <h2 className="font-semibold text-text">Tandas / Tipos de entrada ({ticketTypes?.length ?? 0})</h2>
        <p className="mt-1 text-sm text-text-muted">
          Cada tanda tiene cupo, precio y disponibilidad. La venta des cuenta automáticamente.
        </p>
        {ticketTypes && ticketTypes.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse rounded border border-border">
              <thead>
                <tr className="bg-bg-muted text-left text-sm">
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Nombre</th>
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Precio</th>
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Cupo</th>
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Vendidas</th>
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Disponibles</th>
                  <th className="border-b border-border px-4 py-2 font-medium text-text">Progreso</th>
                </tr>
              </thead>
              <tbody>
                {ticketTypes.map((tt) => {
                  const capTotal = (tt.capacityTotal ?? tt.capacityAvailable) as number;
                  const capAvail = tt.capacityAvailable ?? 0;
                  const sold = Math.max(0, capTotal - capAvail);
                  const pct = capTotal > 0 ? Math.round((sold / capTotal) * 100) : 0;
                  return (
                    <tr key={tt.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium text-text">{tt.name}</td>
                      <td className="px-4 py-3 text-text">${typeof tt.price === 'number' ? tt.price : tt.price}</td>
                      <td className="px-4 py-3 text-text-muted">{capTotal}</td>
                      <td className="px-4 py-3 text-text-muted">{sold}</td>
                      <td className="px-4 py-3 text-text-muted">{capAvail}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 min-w-[60px] overflow-hidden rounded-full bg-border">
                            <div
                              className="h-full rounded-full bg-accent"
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-text-muted">Sin tipos de entrada</p>
        )}
        {showTTForm ? (
          <form
            onSubmit={(e) => { e.preventDefault(); createTT.mutate(); }}
            className="mt-4 flex flex-wrap gap-4 rounded border border-border bg-bg-muted p-4"
          >
            <Input label="Nombre (ej. Preventa 1, General)" value={ttName} onChange={(e) => setTTName(e.target.value)} required />
            <Input label="Precio" type="number" value={ttPrice || ''} onChange={(e) => setTTPrice(parseInt(e.target.value, 10) || 0)} />
            <Input label="Capacidad" type="number" value={ttCap || ''} onChange={(e) => setTTCap(parseInt(e.target.value, 10) || 0)} />
            <Input label="Venta desde" type="datetime-local" value={ttSaleStart} onChange={(e) => setTTSaleStart(e.target.value)} />
            <Input label="Venta hasta" type="datetime-local" value={ttSaleEnd} onChange={(e) => setTTSaleEnd(e.target.value)} />
            <div className="flex w-full items-end gap-2">
              <Button type="submit" disabled={createTT.isPending}>Crear tanda</Button>
              <Button type="button" variant="secondary" onClick={() => setShowTTForm(false)}>Cancelar</Button>
            </div>
          </form>
        ) : (
          <Button size="sm" className="mt-4" onClick={() => setShowTTForm(true)}>+ Tanda / Tipo de entrada</Button>
        )}
      </section>
    </PageContainer>
  );
}
