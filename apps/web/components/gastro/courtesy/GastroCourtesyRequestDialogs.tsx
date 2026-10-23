'use client';

import Link from 'next/link';
import type {
  GastroCourtesyRecipientsPreviewResponse,
  GastroCourtesySendResponse,
} from '@yo-te-invito/shared';
import { withCourtesyProfileQuery } from '@/lib/gastro/courtesy-scope';

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** G8.9.5 — Audience as it will be frozen at request time (reuses the recipients preview). */
export function GastroCourtesyAudienceSummary({
  preview,
}: {
  preview: GastroCourtesyRecipientsPreviewResponse;
}) {
  return (
    <div className="rounded-lg border border-border bg-bg-muted/30 px-4 py-3 text-sm text-text-muted">
      <p className="font-medium text-text">
        {plural(preview.totalUnique, 'destinatario', 'destinatarios')}
      </p>
      <ul className="mt-1 list-inside list-disc text-xs">
        {preview.manualCount > 0 ? (
          <li>{plural(preview.manualCount, 'email individual', 'emails individuales')}</li>
        ) : null}
        {preview.followersCount > 0 ? (
          <li>{plural(preview.followersCount, 'seguidor del local', 'seguidores del local')}</li>
        ) : null}
        {preview.duplicateCount > 0 ? (
          <li>{plural(preview.duplicateCount, 'duplicado omitido', 'duplicados omitidos')}</li>
        ) : null}
      </ul>
      <p className="mt-2 text-xs">
        Los destinatarios quedan fijados al enviar la solicitud: no se recalculan después.
      </p>
    </div>
  );
}

export function GastroCourtesyConfirmDialog({
  totalUnique,
  localName,
  pending,
  onCancel,
  onConfirm,
}: {
  totalUnique: number;
  localName?: string;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="courtesy-confirm-title"
        className="w-full max-w-md rounded-xl border border-border bg-bg p-6 shadow-xl"
      >
        <h3 id="courtesy-confirm-title" className="text-lg font-semibold text-text">
          Confirmar solicitud
        </h3>
        <p className="mt-2 text-sm text-text-muted">
          Vas a solicitar una cortesía{localName ? ` para ${localName}` : ''} con{' '}
          {plural(totalUnique, 'destinatario', 'destinatarios')}.
        </p>
        <p className="mt-2 text-sm text-text-muted">
          La solicitud queda pendiente de aprobación: nadie recibe nada hasta que administración la
          apruebe.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border px-4 py-2 text-sm text-text"
          >
            Volver
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-60"
          >
            {pending ? 'Enviando solicitud…' : 'Enviar solicitud'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** G8.9.4 — Result after submit: the request is under review, nothing was delivered yet. */
export function GastroCourtesyRequestResult({
  result,
  profileId,
}: {
  result: GastroCourtesySendResponse;
  profileId: string;
}) {
  const detailHref = withCourtesyProfileQuery(`/gastro/descuentos/${result.discountId}`, profileId);
  const listHref = withCourtesyProfileQuery('/gastro/descuentos?tipo=cortesias', profileId);
  if (result.pendingApproval) {
    return (
      <div className="mb-6 rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm text-text">
        <p className="font-medium">Solicitud enviada para revisión</p>
        <p className="mt-1 text-text-muted">
          Incluye {plural(result.createdCount, 'destinatario', 'destinatarios')}. Administración la
          revisará; los destinatarios recibirán su QR por email recién cuando sea aprobada.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <Link href={detailHref} className="text-accent hover:underline">
            Ver solicitud
          </Link>
          <Link href={listHref} className="text-accent hover:underline">
            Ver cortesías del local
          </Link>
        </div>
      </div>
    );
  }
  const warn = !result.emailConfigured || result.failedCount > 0 || result.sentCount === 0;
  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 text-sm text-text ${
        warn ? 'border-amber-500/40 bg-amber-500/10' : 'border-accent/40 bg-accent/10'
      }`}
    >
      {!result.emailConfigured ? (
        <p className="font-medium text-amber-200">
          El servicio de email no está configurado. La cortesía se creó, pero no se pudo entregar.
        </p>
      ) : result.sentCount > 0 ? (
        <p>
          Cortesía entregada ({result.sentCount} de {result.createdCount} emails).
        </p>
      ) : (
        <p className="font-medium text-amber-200">
          Se creó la cortesía, pero no se pudo entregar ningún email.
        </p>
      )}
      {result.failedCount > 0 ? (
        <ul className="mt-2 list-inside list-disc text-xs text-text-muted">
          {result.failures.slice(0, 5).map((f) => (
            <li key={f.email}>
              {f.email}: {f.reason}
            </li>
          ))}
          {result.failures.length > 5 ? <li>…y {result.failures.length - 5} más</li> : null}
        </ul>
      ) : null}
      <Link href={detailHref} className="mt-2 inline-block text-accent hover:underline">
        Ver cortesía
      </Link>
    </div>
  );
}
