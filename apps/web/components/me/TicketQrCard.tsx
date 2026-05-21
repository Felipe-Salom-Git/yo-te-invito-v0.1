'use client';

import { StatusBadge } from '@/components/domain/StatusBadge';

const QR_API = 'https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=';

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
          src={`${QR_API}${encodeURIComponent(qrPayload)}`}
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
      {status === 'VALID' && (
        <p className="mt-3 text-xs text-text-muted">Presentá este código en el acceso al evento.</p>
      )}
    </div>
  );
}
