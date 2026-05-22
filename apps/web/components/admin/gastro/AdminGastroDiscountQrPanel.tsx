'use client';

import { isValidGastroDiscountQrPayload } from '@/lib/gastro/discount-qr';
import { qrImageUrl } from '@/lib/qr-image';

type AdminGastroDiscountQrPanelProps = {
  qrPayload: string | null | undefined;
  status: string;
};

/** Vista previa del QR maestro del ticket (referencia local / pruebas). */
export function AdminGastroDiscountQrPanel({ qrPayload, status }: AdminGastroDiscountQrPanelProps) {
  if (!['APPROVED', 'ACTIVE'].includes(status) || !qrPayload?.trim()) {
    return null;
  }
  if (!isValidGastroDiscountQrPayload(qrPayload)) {
    return (
      <p className="mt-4 text-sm text-red-300">Payload QR inválido — revisar token en base de datos.</p>
    );
  }

  return (
    <section className="mt-8 rounded-xl border border-border bg-bg-muted/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
        QR del ticket (referencia)
      </h3>
      <p className="mt-2 text-sm text-text-muted">
        Los comensales reciben un QR distinto al reclamar por email. Este código identifica el
        descuento maestro tras la aprobación.
      </p>
      <div className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={qrImageUrl(qrPayload, 200)}
          alt="QR descuento"
          width={200}
          height={200}
          className="rounded-lg border border-border bg-white p-2"
        />
        <code className="max-w-full break-all rounded bg-bg px-2 py-1 text-xs text-text-muted">
          {qrPayload}
        </code>
      </div>
    </section>
  );
}
