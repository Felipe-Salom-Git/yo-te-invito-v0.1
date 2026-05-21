'use client';

import { StatusBadge } from '@/components/domain/StatusBadge';
import { buildTicketQrImageUrl } from '@/lib/tickets/qr-image-url';

type Props = {
  qrPayload: string;
  status: string;
};

export function TicketQrCard({ qrPayload, status }: Props) {
  const blocked = status === 'TRANSFER_PENDING' || status === 'TRANSFERRED' || status === 'USED' || status === 'REVOKED';
  const showQr = status === 'VALID' || status === 'TRANSFER_PENDING';

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-bg-muted p-6 text-center">
      {showQr ? (
        <img
          src={buildTicketQrImageUrl(qrPayload, 280)}
          alt="Código QR del ticket"
          width={280}
          height={280}
          className={`mx-auto rounded-lg border border-border ${blocked ? 'opacity-40 grayscale' : ''}`}
        />
      ) : (
        <div className="mx-auto flex h-[280px] w-[280px] items-center justify-center rounded-lg border border-dashed border-border bg-bg text-sm text-text-muted">
          QR no disponible
        </div>
      )}
      <StatusBadge status={status} kind="ticket" className="mt-4" />
      {status === 'TRANSFER_PENDING' && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          Este QR está bloqueado mientras la transferencia está activa. Compartí el enlace de aceptación con
          quien recibirá la entrada.
        </p>
      )}
      {status === 'TRANSFERRED' && (
        <p className="mt-3 text-sm text-text-muted">
          Este ticket fue transferido y ya no es válido para ingresar.
        </p>
      )}
      {status === 'USED' && (
        <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
          Este ticket ya se usó para ingresar al evento.
        </p>
      )}
      {status === 'REVOKED' && (
        <p className="mt-3 text-sm text-red-400">
          Este ticket fue revocado y no puede usarse para ingresar.
        </p>
      )}
      {status === 'VALID' && (
        <p className="mt-3 text-xs text-text-muted">Presentá este código en el acceso al evento.</p>
      )}
    </div>
  );
}
