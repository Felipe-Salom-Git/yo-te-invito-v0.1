'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ProducerEventTicketsQuery } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { Badge, Input } from '@/components';
import { TicketListPdfDownload } from '@/components/producer/events/TicketListPdfDownload';

const STATUS_LABELS: Record<string, string> = {
  VALID: 'Válida',
  USED: 'Usada',
  REVOKED: 'Revocada',
  TRANSFER_PENDING: 'Pendiente transferencia',
  TRANSFERRED: 'Transferida',
};

type Props = {
  eventId: string;
  isMultiDate?: boolean;
};

function formatMoney(cents: number | null | undefined, currency = 'ARS'): string {
  if (cents == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(cents / 100);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function ProducerEventTicketsPanel({ eventId, isMultiDate }: Props) {
  const repos = useRepositories();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [referrer, setReferrer] = useState('');
  const [scanned, setScanned] = useState('');
  const [q, setQ] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const queryParams: ProducerEventTicketsQuery = useMemo(
    () => ({
      page,
      limit: 50,
      ...(status ? { status } : {}),
      ...(referrer ? { referrer: referrer as 'true' | 'false' } : {}),
      ...(scanned ? { scanned: scanned as 'true' | 'false' } : {}),
      ...(q ? { q } : {}),
    }),
    [page, status, referrer, scanned, q],
  );

  const { data, isLoading } = useQuery({
    queryKey: ['producer', 'event-tickets', eventId, queryParams],
    queryFn: () => repos.tickets.listOperationalByEvent(eventId, queryParams),
    enabled: !!eventId,
  });

  const kpis = data?.kpis;

  return (
    <section className="mt-12 border-t border-border pt-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-text">Entradas vendidas</h2>
          <p className="mt-1 text-sm text-text-muted">
            Listado operativo con estado, referido y escaneo.
          </p>
        </div>
        <TicketListPdfDownload eventId={eventId} ticketCount={kpis?.total ?? 0} />
      </div>

      {kpis && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {[
            { label: 'Total emitidas', value: kpis.total },
            { label: 'Usadas', value: kpis.used },
            { label: 'Disponibles', value: kpis.available },
            { label: 'Por referido', value: kpis.viaReferral },
            { label: 'Revocadas/transferidas', value: kpis.transferredOrRevoked },
          ].map((k) => (
            <div key={k.label} className="rounded-lg border border-border bg-bg-muted p-3 text-center">
              <p className="text-2xl font-bold text-text">{k.value}</p>
              <p className="text-xs text-text-muted">{k.label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Buscar"
            placeholder="Código, nombre o email"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setQ(searchInput.trim());
                setPage(1);
              }
            }}
          />
        </div>
        <button
          type="button"
          className="rounded border border-border px-3 py-2 text-sm text-text hover:bg-bg-muted"
          onClick={() => {
            setQ(searchInput.trim());
            setPage(1);
          }}
        >
          Buscar
        </button>
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={referrer}
          onChange={(e) => {
            setReferrer(e.target.value);
            setPage(1);
          }}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="">Referido: todos</option>
          <option value="true">Solo referido</option>
          <option value="false">Sin referido</option>
        </select>
        <select
          value={scanned}
          onChange={(e) => {
            setScanned(e.target.value);
            setPage(1);
          }}
          className="rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="">Escaneo: todos</option>
          <option value="true">Escaneadas</option>
          <option value="false">No escaneadas</option>
        </select>
      </div>

      {isLoading && <p className="mt-6 text-text-muted">Cargando entradas…</p>}

      {!isLoading && data && data.tickets.length === 0 && (
        <p className="mt-6 text-text-muted">
          Todavía no hay entradas emitidas para este evento.
        </p>
      )}

      {data && data.tickets.length > 0 && (
        <>
          <div className="mt-6 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  <th className="py-2 pr-3">Código</th>
                  <th className="py-2 pr-3">Comprador</th>
                  <th className="py-2 pr-3">Tipo</th>
                  {isMultiDate && <th className="py-2 pr-3">Función</th>}
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Referido</th>
                  <th className="py-2 pr-3">Escaneo</th>
                  <th className="py-2 pr-3">Precio</th>
                </tr>
              </thead>
              <tbody>
                {data.tickets.map((t) => (
                  <tr key={t.ticketId} className="border-b border-border/60">
                    <td className="py-2 pr-3 font-mono text-text">{t.shortCode}</td>
                    <td className="py-2 pr-3">
                      <div className="text-text">{t.buyerName}</div>
                      {t.buyerEmail && (
                        <div className="text-xs text-text-muted">{t.buyerEmail}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">{t.ticketTypeName}</td>
                    {isMultiDate && (
                      <td className="py-2 pr-3 text-text-muted">{t.occurrenceLabel ?? '—'}</td>
                    )}
                    <td className="py-2 pr-3">
                      <Badge variant="muted">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {t.referral.viaReferral ? (
                        <>
                          Sí
                          {t.referral.referrerName && ` · ${t.referral.referrerName}`}
                          {t.referral.referralCode && (
                            <span className="block font-mono text-xs">{t.referral.referralCode}</span>
                          )}
                        </>
                      ) : (
                        'No'
                      )}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {t.scan.scanned
                        ? formatDateTime(t.scan.scannedAt)
                        : 'Pendiente'}
                      {t.scan.scannedByLabel && (
                        <span className="block text-xs">por {t.scan.scannedByLabel}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-text-muted">
                      {formatMoney(t.priceCents, t.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="mt-6 space-y-3 md:hidden">
            {data.tickets.map((t) => (
              <li key={t.ticketId} className="rounded-lg border border-border bg-bg-muted p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-medium text-text">{t.shortCode}</span>
                  <Badge variant="muted">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                </div>
                <p className="mt-2 text-text">{t.buyerName}</p>
                {t.buyerEmail && <p className="text-xs text-text-muted">{t.buyerEmail}</p>}
                <p className="mt-1 text-text-muted">Tipo: {t.ticketTypeName}</p>
                {isMultiDate && t.occurrenceLabel && (
                  <p className="text-text-muted">Función: {t.occurrenceLabel}</p>
                )}
                <p className="mt-1 text-text-muted">
                  Referido:{' '}
                  {t.referral.viaReferral
                    ? `${t.referral.referrerName ?? 'Sí'}${t.referral.referralCode ? ` (${t.referral.referralCode})` : ''}`
                    : 'No'}
                </p>
                <p className="text-text-muted">
                  Escaneo: {t.scan.scanned ? formatDateTime(t.scan.scannedAt) : 'Pendiente'}
                </p>
                <p className="text-text-muted">Precio: {formatMoney(t.priceCents, t.currency)}</p>
              </li>
            ))}
          </ul>

          {data.pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-text-muted">
                Página {data.pagination.page} de {data.pagination.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-border px-3 py-1 text-sm disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
