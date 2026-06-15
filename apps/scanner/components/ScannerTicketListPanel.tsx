'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ScannerEventTicketItem } from '@yo-te-invito/shared';
import {
  fetchEventTicketsOperational,
  fetchEventOccurrences,
  type ScannerEventOccurrence,
} from '@/lib/api/scanner';
import { getSnapshotMeta, type SnapshotMeta } from '@/lib/db/offline-scanner';

const STATUS_LABELS: Record<string, string> = {
  VALID: 'Válida',
  USED: 'Usada',
  REVOKED: 'Revocada',
  TRANSFER_PENDING: 'Pendiente transferencia',
  TRANSFERRED: 'Transferida',
};

type FilterKind = 'all' | 'unused' | 'used' | 'invalid' | 'transferred';

type Props = {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string | null;
  isOnline: boolean;
  selectedOccurrenceId?: string;
};

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

function formatOccurrenceLabel(occ: ScannerEventOccurrence): string {
  return new Date(occ.startAt).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

export function ScannerTicketListPanel({
  open,
  onClose,
  eventId,
  eventTitle,
  isOnline,
  selectedOccurrenceId,
}: Props) {
  const [tickets, setTickets] = useState<ScannerEventTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKind>('all');
  const [occurrenceId, setOccurrenceId] = useState(selectedOccurrenceId ?? '');
  const [occurrences, setOccurrences] = useState<ScannerEventOccurrence[]>([]);
  const [isMultiDate, setIsMultiDate] = useState(false);
  const [snapshotMeta, setSnapshotMeta] = useState<SnapshotMeta | null>(null);

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    setError(null);
    try {
      if (isOnline) {
        const params: Parameters<typeof fetchEventTicketsOperational>[1] = {};
        if (occurrenceId) params.occurrenceId = occurrenceId;
        if (q.trim()) params.q = q.trim();
        if (filter === 'used') params.scanned = 'true';
        if (filter === 'unused') params.scanned = 'false';
        if (filter === 'invalid') params.status = 'REVOKED';
        if (filter === 'transferred') params.status = 'TRANSFERRED';
        const res = await fetchEventTicketsOperational(eventId, params);
        setTickets(res.tickets);
      } else {
        setError('Sin conexión — mostrá el listado offline guardado desde el escáner.');
        setTickets([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el listado');
    } finally {
      setLoading(false);
    }
  }, [eventId, isOnline, occurrenceId, q, filter]);

  useEffect(() => {
    if (!open || !eventId) return;
    void getSnapshotMeta(eventId).then(setSnapshotMeta);
    void fetchEventOccurrences(eventId)
      .then((data) => {
        setIsMultiDate(data.isMultiDate);
        setOccurrences(data.isMultiDate ? data.occurrences : []);
      })
      .catch(() => {
        setOccurrences([]);
        setIsMultiDate(false);
      });
    void load();
  }, [open, eventId, load]);

  useEffect(() => {
    setOccurrenceId(selectedOccurrenceId ?? '');
  }, [selectedOccurrenceId]);

  const filteredLocal = useMemo(() => {
    if (isOnline) return tickets;
    return tickets;
  }, [tickets, isOnline]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950" role="dialog" aria-modal="true">
      <header className="flex items-center justify-between border-b border-slate-700 p-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Listado de entradas</h2>
          <p className="text-xs text-slate-400">{eventTitle ?? eventId}</p>
          {snapshotMeta && !isOnline && (
            <p className="mt-1 text-xs text-amber-400">
              Listado offline guardado el{' '}
              {new Date(snapshotMeta.downloadedAt).toLocaleString('es-AR', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-white"
        >
          Cerrar
        </button>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-800 p-3">
        <input
          type="search"
          placeholder="Buscar código, nombre o tipo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-w-[180px] flex-1 rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as FilterKind)}
          className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
        >
          <option value="all">Todas</option>
          <option value="unused">No usadas</option>
          <option value="used">Usadas</option>
          <option value="invalid">Revocadas</option>
          <option value="transferred">Transferidas</option>
        </select>
        {isMultiDate && occurrences.length > 0 && (
          <select
            value={occurrenceId}
            onChange={(e) => setOccurrenceId(e.target.value)}
            className="rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white"
          >
            <option value="">Todas las funciones</option>
            {occurrences.map((o) => (
              <option key={o.id} value={o.id}>
                {formatOccurrenceLabel(o)}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || !isOnline}
          className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {loading ? 'Cargando…' : 'Actualizar'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {error && <p className="text-sm text-red-300">{error}</p>}
        {!loading && !error && filteredLocal.length === 0 && (
          <p className="text-sm text-slate-400">No hay entradas para mostrar.</p>
        )}
        <ul className="space-y-3">
          {filteredLocal.map((t) => (
            <li
              key={t.ticketId}
              className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-semibold text-white">Código: {t.shortCode}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    t.status === 'VALID'
                      ? 'bg-emerald-900 text-emerald-300'
                      : t.status === 'USED'
                        ? 'bg-amber-900 text-amber-300'
                        : 'bg-red-900 text-red-300'
                  }`}
                >
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
              </div>
              <p className="mt-2">Tipo: {t.ticketTypeName}</p>
              {t.holderName && t.holderName !== '—' && <p>Asistente: {t.holderName}</p>}
              {t.occurrenceLabel && <p>Función: {t.occurrenceLabel}</p>}
              <p className="mt-1">
                Escaneada:{' '}
                {t.scannedAt ? (
                  <>
                    {formatDateTime(t.scannedAt)}
                    {t.scannedBy && (
                      <span className="block text-xs text-slate-400">por {t.scannedBy}</span>
                    )}
                  </>
                ) : (
                  'No'
                )}
              </p>
              {t.status === 'USED' && t.scannedAt && (
                <p className="mt-1 text-amber-300">
                  Ya fue escaneada a las{' '}
                  {new Date(t.scannedAt).toLocaleTimeString('es-AR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
