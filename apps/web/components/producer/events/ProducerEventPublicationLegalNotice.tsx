'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  useAcceptEventPublicationTerms,
  useEventPublicationLegalStatus,
} from '@/lib/query/producer-event-legal';

type Props = {
  eventId?: string;
  /** When true, user selected "send to review" — show acceptance UI if terms are published. */
  submittingForReview?: boolean;
  onAcceptanceChange?: (accepted: boolean) => void;
};

/**
 * V3.1 Etapa 11 — legal gate for event publication (Caso A when producer_terms is published).
 */
export function ProducerEventPublicationLegalNotice({
  eventId,
  submittingForReview = false,
  onAcceptanceChange,
}: Props) {
  const { data, isLoading, isError } = useEventPublicationLegalStatus(eventId, Boolean(eventId));
  const acceptMutation = useAcceptEventPublicationTerms(eventId ?? '');
  const [localError, setLocalError] = useState<string | null>(null);

  const accepted = data?.accepted ?? false;
  const published = data?.documentPublished ?? false;
  const publicPath = data?.publicPath ?? '/legal/productores';

  useEffect(() => {
    if (!eventId || isLoading || !data) return;
    onAcceptanceChange?.(data.documentPublished && data.accepted);
  }, [eventId, isLoading, data, onAcceptanceChange]);

  const handleAccept = async () => {
    if (!eventId) return;
    setLocalError(null);
    try {
      await acceptMutation.mutateAsync();
      onAcceptanceChange?.(true);
    } catch (err) {
      setLocalError(getErrorMessage(err));
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-bg p-4 text-sm">
      <p className="font-medium text-text">Términos de publicación</p>
      <p className="mt-1 text-text-muted">
        Al enviar un evento a revisión, declarás que la información es correcta y aceptás las
        condiciones para productoras.{' '}
        <Link
          href={publicPath}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Ver condiciones para productoras
        </Link>
        .
      </p>

      {!eventId ? (
        <p className="mt-2 text-xs text-text-muted">
          Guardá el evento como borrador primero. La aceptación de términos se habilita al editar el
          evento antes de enviarlo a revisión.
        </p>
      ) : isLoading ? (
        <p className="mt-2 text-xs text-text-muted">Verificando estado legal…</p>
      ) : isError ? (
        <p className="mt-2 text-xs text-amber-400/90">
          No se pudo verificar el estado legal. Reintentá o contactá soporte.
        </p>
      ) : !published ? (
        <p className="mt-2 text-xs text-amber-400/90">
          Las condiciones para productoras aún no están publicadas oficialmente. No podrás enviar el
          evento a revisión hasta que el equipo las publique en el sitio.
        </p>
      ) : accepted ? (
        <p className="mt-2 text-xs text-emerald-400/90">
          Términos aceptados para este evento (versión {data?.version ?? '—'}).
        </p>
      ) : (
        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={false}
              readOnly
              aria-hidden
            />
            <span className="text-text-muted">
              Acepto las{' '}
              <Link
                href={publicPath}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                condiciones para productoras
              </Link>{' '}
              para este evento.
            </span>
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={acceptMutation.isPending}
            onClick={() => void handleAccept()}
          >
            {acceptMutation.isPending ? 'Registrando…' : 'Registrar aceptación'}
          </Button>
          {submittingForReview ? (
            <p className="text-xs text-amber-400/90">
              Debés registrar la aceptación antes de enviar a revisión.
            </p>
          ) : null}
        </div>
      )}

      {localError ? <p className="mt-2 text-xs text-red-400">{localError}</p> : null}
    </div>
  );
}
