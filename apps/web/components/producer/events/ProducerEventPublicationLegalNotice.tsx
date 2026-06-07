'use client';

import Link from 'next/link';
import { useMyLegalRequirements } from '@/lib/query/me-legal';

/**
 * V3.1 Slice 12 — Caso B: aviso informativo (sin bloqueo).
 * Bloqueo duro EVENT_PUBLICATION pendiente hasta publicar `producer_terms` en /admin/legales.
 */
export function ProducerEventPublicationLegalNotice() {
  const { data, isLoading } = useMyLegalRequirements({
    context: 'PORTAL_ACCESS',
    profileType: 'PRODUCER',
  });

  const hasPublishedTerms = !isLoading && data && data.pending.length > 0;

  return (
    <div className="rounded-lg border border-border/80 bg-bg p-4 text-sm">
      <p className="font-medium text-text">Términos de publicación</p>
      <p className="mt-1 text-text-muted">
        Al enviar un evento a revisión, declarás que la información es correcta y aceptás las
        condiciones para productoras.{' '}
        <Link
          href="/legal/productores"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent hover:underline"
        >
          Ver condiciones para productoras
        </Link>
        .
      </p>
      {hasPublishedTerms ? (
        <p className="mt-2 text-xs text-amber-400/90">
          Hay documentos legales del portal pendientes de aceptación. El bloqueo obligatorio al
          publicar se activará cuando el equipo habilite la validación por evento (Slice 12 Caso
          A).
        </p>
      ) : (
        <p className="mt-2 text-xs text-text-muted">
          La aceptación obligatoria al enviar a revisión se habilitará cuando las condiciones estén
          publicadas oficialmente.
        </p>
      )}
    </div>
  );
}
