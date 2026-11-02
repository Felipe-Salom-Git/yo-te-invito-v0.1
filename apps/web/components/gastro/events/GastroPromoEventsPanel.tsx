'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { GastroPromoEventResponse } from '@yo-te-invito/shared';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { useGastroPromoEventMutations, useGastroPromoEvents } from '@/lib/query/gastro-promo-events';
import {
  EMPTY_GASTRO_PROMO_EVENT_FORM,
  GASTRO_PROMO_EVENT_STATUS_HINT,
  GASTRO_PROMO_EVENT_STATUS_LABEL,
  canSubmitGastroPromoEvent,
  formatGastroPromoEventWhen,
  gastroPromoEventPublicHref,
  gastroPromoEventToForm,
} from '@/lib/gastro/gastroPromoEvents';
import { GastroPromoEventForm } from './GastroPromoEventForm';

type Props = {
  local: {
    id: string;
    displayName: string;
    address: string | null;
    city?: string | null;
    province?: string | null;
    status: string;
  };
};

/** G12.2 — «Eventos» tab of /gastro/contenido: promotional events of the active local. */
export function GastroPromoEventsPanel({ local }: Props) {
  const { addToast } = useToast();
  const { data, isLoading, isError, error, refetch } = useGastroPromoEvents(local.id);
  const { createMutation, updateMutation, submitMutation, archiveMutation } = useGastroPromoEventMutations(local.id);
  const [showCreate, setShowCreate] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const events = data?.data ?? [];
  const localActive = local.status === 'ACTIVE';
  const onError = (err: unknown) => addToast(getErrorMessage(err), 'error');

  const renderItem = (ev: GastroPromoEventResponse) => {
    if (editingId === ev.id) {
      return (
        <GastroPromoEventForm
          key={ev.id}
          mode="edit"
          local={local}
          initial={gastroPromoEventToForm(ev)}
          pending={updateMutation.isPending}
          onCancel={() => setEditingId(null)}
          onSubmit={(payload) =>
            updateMutation.mutate(
              { id: ev.id, patch: payload },
              {
                onError,
                onSuccess: () => {
                  addToast('Evento actualizado', 'success');
                  setEditingId(null);
                },
              },
            )
          }
        />
      );
    }
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        {ev.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ev.coverImageUrl} alt="" className="h-24 w-full rounded object-cover sm:w-36" />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-text">{ev.title}</p>
            <span className="rounded bg-border px-2 py-0.5 text-xs text-text-muted">
              {GASTRO_PROMO_EVENT_STATUS_LABEL[ev.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-text-muted">{formatGastroPromoEventWhen(ev.startAt).label}</p>
          <p className="mt-1 text-xs text-text-muted">{GASTRO_PROMO_EVENT_STATUS_HINT[ev.status]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditingId(ev.id)}>
              Editar
            </Button>
            {canSubmitGastroPromoEvent(ev.status) ? (
              <Button
                size="sm"
                disabled={submitMutation.isPending || !localActive}
                onClick={() =>
                  submitMutation.mutate(ev.id, {
                    onError,
                    onSuccess: () => addToast('Evento enviado a revisión', 'success'),
                  })
                }
              >
                Enviar a revisión
              </Button>
            ) : null}
            {ev.status === 'APPROVED' ? (
              <Link
                href={gastroPromoEventPublicHref(ev.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="self-center text-sm text-accent hover:underline"
              >
                Ver evento →
              </Link>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={archiveMutation.isPending}
              onClick={() => {
                if (!window.confirm('¿Archivar este evento? Deja de mostrarse en Eventos y en la ficha.')) return;
                archiveMutation.mutate(ev.id, {
                  onError,
                  onSuccess: () => addToast('Evento archivado', 'success'),
                });
              }}
            >
              Archivar
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <p className="text-sm text-text-muted">
        Eventos publicitarios del local: se revisan por administración y, al aprobarse, aparecen en Eventos y en la
        ficha de <span className="text-text">{local.displayName}</span>. Sin venta de entradas.
      </p>
      {!localActive ? (
        <p className="mt-2 text-sm text-amber-200">
          El local todavía no está activo: podés preparar borradores, pero no enviarlos a revisión.
        </p>
      ) : null}

      <div className="mt-4">
        {showCreate ? (
          <GastroPromoEventForm
            mode="create"
            local={local}
            initial={EMPTY_GASTRO_PROMO_EVENT_FORM}
            pending={createMutation.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={(payload, { submitForReview }) =>
              createMutation.mutate(
                { ...payload, profileId: local.id, submitForReview: submitForReview && localActive },
                {
                  onError,
                  onSuccess: (ev) => {
                    addToast(
                      ev.status === 'PENDING' ? 'Evento enviado a revisión' : 'Evento guardado como borrador',
                      'success',
                    );
                    setShowCreate(false);
                  },
                },
              )
            }
          />
        ) : (
          <Button onClick={() => setShowCreate(true)}>Crear evento</Button>
        )}
      </div>

      {isError ? (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <p className="text-sm text-red-200">No se pudo cargar: {getErrorMessage(error)}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
            Reintentar
          </Button>
        </div>
      ) : isLoading ? (
        <p className="mt-6 text-text-muted">Cargando eventos…</p>
      ) : events.length > 0 ? (
        <ul className="mt-6 space-y-4">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-lg border border-border bg-bg-muted p-4">
              {renderItem(ev)}
            </li>
          ))}
        </ul>
      ) : !showCreate ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-bg-muted/40 px-6 py-10 text-center">
          <p className="font-medium text-text">Este local todavía no tiene eventos.</p>
          <p className="mt-1 text-sm text-text-muted">
            Música en vivo, catas, noches temáticas: publicalos y aparecen en el catálogo de Eventos.
          </p>
        </div>
      ) : null}
    </div>
  );
}
