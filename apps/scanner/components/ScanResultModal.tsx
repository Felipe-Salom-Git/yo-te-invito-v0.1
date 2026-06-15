'use client';

import type { ScanResponse } from '@yo-te-invito/shared';
import type { OfflineScanResult } from '@/lib/scan/offline-scan';

export type ScanResultModalData = (ScanResponse | OfflineScanResult) & {
  connectionError?: boolean;
  offline?: boolean;
  pendingSync?: boolean;
  staleSnapshot?: boolean;
};

type Props = {
  open: boolean;
  result: ScanResultModalData | null;
  onClose: () => void;
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

function resolvePresentation(result: ScanResultModalData): {
  tone: 'ok' | 'warn' | 'error';
  icon: string;
  title: string;
  subtitle: string;
} {
  if (result.connectionError) {
    return {
      tone: 'error',
      icon: '❌',
      title: 'Error de conexión',
      subtitle: 'No se pudo validar en línea. Revisá la red o usá el listado offline.',
    };
  }

  if (result.offline && result.result === 'OK') {
    return {
      tone: 'ok',
      icon: '✅',
      title: 'Entrada válida',
      subtitle: result.pendingSync
        ? 'Acceso permitido (offline — pendiente de sincronizar)'
        : 'Acceso permitido (validación offline)',
    };
  }

  switch (result.result) {
    case 'OK':
      return {
        tone: 'ok',
        icon: '✅',
        title: 'Entrada válida',
        subtitle: 'Acceso permitido',
      };
    case 'ALREADY_USED':
      return {
        tone: 'warn',
        icon: '⚠️',
        title: 'Entrada ya escaneada',
        subtitle: result.firstScannedAt
          ? `Fue validada el ${formatDateTime(result.firstScannedAt)}`
          : 'Esta entrada ya fue utilizada',
      };
    case 'WRONG_OCCURRENCE':
      return {
        tone: 'error',
        icon: '❌',
        title: 'Fecha incorrecta',
        subtitle: result.message ?? 'Esta entrada es para otra función',
      };
    case 'REVOKED':
      return {
        tone: 'error',
        icon: '❌',
        title: 'Entrada revocada',
        subtitle: 'No permitir acceso',
      };
    default:
      if (result.ticketStatus === 'TRANSFER_PENDING') {
        return {
          tone: 'error',
          icon: '❌',
          title: 'Transferencia pendiente',
          subtitle: 'No permitir acceso hasta completar la transferencia',
        };
      }
      if (result.ticketStatus === 'TRANSFERRED') {
        return {
          tone: 'error',
          icon: '❌',
          title: 'Entrada transferida',
          subtitle: 'No permitir acceso con este código',
        };
      }
      return {
        tone: 'error',
        icon: '❌',
        title: 'Entrada inválida',
        subtitle: result.message ?? 'No permitir acceso',
      };
  }
}

const toneClasses = {
  ok: 'border-emerald-500 bg-emerald-950',
  warn: 'border-amber-500 bg-amber-950',
  error: 'border-red-500 bg-red-950',
};

const titleClasses = {
  ok: 'text-emerald-300',
  warn: 'text-amber-300',
  error: 'text-red-300',
};

export function ScanResultModal({ open, result, onClose }: Props) {
  if (!open || !result) return null;

  const pres = resolvePresentation(result);
  const details: string[] = [];
  if (result.eventTitle) details.push(`Evento: ${result.eventTitle}`);
  if (result.ticketTypeName) details.push(`Tipo: ${result.ticketTypeName}`);
  if (result.holderName) details.push(`Asistente: ${result.holderName}`);
  if (result.occurrenceLabel) details.push(`Función: ${result.occurrenceLabel}`);
  if (result.scannedAt && result.result === 'OK') {
    details.push(`Escaneada: ${formatDateTime(result.scannedAt)}`);
  }
  if (result.offline && result.staleSnapshot) {
    details.push('Listado offline desactualizado — sincronizá cuando haya red');
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" aria-hidden="true" />
      <div
        className={`relative w-full max-w-md rounded-2xl border-2 p-6 shadow-2xl ${toneClasses[pres.tone]}`}
      >
        <p className={`text-4xl ${titleClasses[pres.tone]}`}>{pres.icon}</p>
        <h2 className="mt-3 text-2xl font-bold text-white">{pres.title}</h2>
        <p className="mt-2 text-lg text-slate-200">{pres.subtitle}</p>
        {details.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm text-slate-300">
            {details.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-white/10 px-4 py-3 text-base font-semibold text-white hover:bg-white/20"
        >
          Escanear otra entrada
        </button>
      </div>
    </div>
  );
}
