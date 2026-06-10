'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ticketTypesKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import { validateTicketTypeEditForm } from '@/lib/producer/ticket-type-batches.validation';
import type { TicketTypeBatchValidationError } from '@/lib/producer/ticket-type-batches.validation';
import { editFormToApiBatches, editFormToCreateInput } from '@/lib/producer/ticket-types-api-map';
import {
  emptyBatchTemplate,
  mapTicketTypeToEditForm,
  type TicketTypeEditForm,
} from '@/lib/producer/ticket-types-editor.model';
import { getTicketTypeSoldCount } from '@/lib/producer/ticket-batch-display';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Button, useToast } from '@/components';
import { ProducerTicketTypeFormFields } from './ProducerTicketTypeFormFields';
import { ProducerTicketTypeCard } from './ProducerTicketTypeCard';
import { ProducerTicketTypesHelp } from './ProducerTicketTypesHelp';
import { ProducerTicketFormErrorSummary } from './ProducerTicketFormErrorSummary';
import { formatOccurrenceShortLabel } from '@/lib/producer/event-occurrences';
import type { EventOccurrenceWithStats } from '@yo-te-invito/shared';

type Props = {
  eventId: string;
};

export function TicketTypesEditor({ eventId }: Props) {
  const { data: session } = useSession();
  const userId =
    (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const errorRef = useRef<HTMLDivElement>(null);

  const [managingId, setManagingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TicketTypeEditForm | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<TicketTypeEditForm | null>(null);
  const [validationError, setValidationError] = useState<TicketTypeBatchValidationError | null>(
    null,
  );
  const [activeOccurrenceId, setActiveOccurrenceId] = useState<string | null>(null);

  const { data: occurrences } = useQuery({
    queryKey: ['eventOccurrences', eventId],
    queryFn: () => repos.events.listEventOccurrences(eventId),
    enabled: !!eventId && !!userId,
  });

  const isMultiDate = (occurrences?.length ?? 0) > 0;

  const { data: ticketTypes, isLoading, isError, error } = useQuery({
    queryKey: ticketTypesKeys.producerByEvent(eventId),
    queryFn: () => repos.ticketTypes.list(eventId),
    enabled: !!eventId && !!userId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(eventId) });
    queryClient.invalidateQueries({ queryKey: ticketTypesKeys.byEvent(eventId) });
  }, [eventId, queryClient]);

  const runValidation = (form: TicketTypeEditForm, hasSold: boolean) => {
    if (hasSold) {
      if (!form.name.trim()) {
        const err: TicketTypeBatchValidationError = {
          message: 'El nombre del tipo es obligatorio.',
          fieldErrors: { name: 'El nombre del tipo es obligatorio.' },
          batchErrors: {},
        };
        setValidationError(err);
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return false;
      }
      setValidationError(null);
      return true;
    }
    const v = validateTicketTypeEditForm(form);
    if (!v.ok) {
      setValidationError(v.error);
      errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return false;
    }
    setValidationError(null);
    return true;
  };

  const createMut = useMutation({
    mutationFn: ({ form, occurrenceId }: { form: TicketTypeEditForm; occurrenceId?: string }) => {
      const v = validateTicketTypeEditForm(form);
      if (!v.ok) throw new Error(v.error.message);
      return repos.ticketTypes.create(eventId, editFormToCreateInput(form, occurrenceId));
    },
    onSuccess: () => {
      addToast('Tipo de entrada creado', 'success');
      invalidate();
      setNewOpen(false);
      setNewForm(null);
      setValidationError(null);
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({
      id,
      form,
      hasSold,
    }: {
      id: string;
      form: TicketTypeEditForm;
      hasSold: boolean;
    }) => {
      if (hasSold) {
        return repos.ticketTypes.update(id, {
          eventId,
          name: form.name.trim(),
          description: form.description.trim() || null,
          maxPerOrder: form.maxPerOrder,
          status: form.status,
        });
      }
      const v = validateTicketTypeEditForm(form);
      if (!v.ok) throw new Error(v.error.message);
      return repos.ticketTypes.update(id, {
        eventId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        capacityTotal: form.capacityTotal,
        maxPerOrder: form.maxPerOrder,
        status: form.status,
        batches: editFormToApiBatches(form),
        price: form.batches[0]?.price ?? 0,
      });
    },
    onSuccess: () => {
      addToast('Cambios guardados', 'success');
      invalidate();
      setManagingId(null);
      setEditForm(null);
      setValidationError(null);
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const openManage = (tt: TicketTypeResponse) => {
    setManagingId(tt.id);
    setEditForm(mapTicketTypeToEditForm(tt));
    setValidationError(null);
    setNewOpen(false);
    setNewForm(null);
  };

  const closeManage = () => {
    setManagingId(null);
    setEditForm(null);
    setValidationError(null);
  };

  const resolvedOccurrenceId = isMultiDate
    ? activeOccurrenceId ?? occurrences?.[0]?.id ?? null
    : null;

  const ticketTypesForSection = isMultiDate
    ? (ticketTypes ?? []).filter((tt) => tt.occurrenceId === resolvedOccurrenceId)
    : ticketTypes ?? [];

  const startNew = () => {
    if (isMultiDate && !resolvedOccurrenceId) {
      addToast('Seleccioná una fecha antes de crear tipos de entrada.', 'error');
      return;
    }
    setNewOpen(true);
    setNewForm({
      name: '',
      description: '',
      capacityTotal: 100,
      maxPerOrder: 10,
      status: 'ACTIVE',
      batches: [emptyBatchTemplate(0)],
    });
    setManagingId(null);
    setEditForm(null);
    setValidationError(null);
  };

  if (!userId) {
    return <p className="text-sm text-text-muted">Iniciá sesión para gestionar tipos de entrada.</p>;
  }

  if (isLoading) {
    return <p className="text-sm text-text-muted">Cargando tipos de entrada…</p>;
  }

  if (isError) {
    return <p className="text-sm text-red-400">{getErrorMessage(error)}</p>;
  }

  const managingTicketType = ticketTypes?.find((t) => t.id === managingId);

  const occurrenceTabs = isMultiDate ? (occurrences ?? []) : [];

  return (
    <section className="mt-8" id="entradas">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-text">Entradas y tandas</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Configurá tipos de entrada y las etapas de venta. El checkout público usa la tanda activa
            y su precio vigente.
          </p>
        </div>
        <Link
          href={`/producer/events/${eventId}/edit`}
          className="text-sm text-accent hover:underline"
        >
          Editar ficha del evento
        </Link>
      </div>

      <div className="mt-6">
        <ProducerTicketTypesHelp />
      </div>

      {isMultiDate ? (
        <div className="mt-6">
          <p className="mb-2 text-sm text-text-muted">
            Cada fecha tiene sus propios tipos de entrada y stock.
          </p>
          <div className="flex flex-wrap gap-2">
            {occurrenceTabs.map((occ: EventOccurrenceWithStats) => (
              <button
                key={occ.id}
                type="button"
                onClick={() => {
                  setActiveOccurrenceId(occ.id);
                  closeManage();
                  setNewOpen(false);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                  resolvedOccurrenceId === occ.id
                    ? 'border-accent bg-accent/15 text-text'
                    : 'border-border text-text-muted hover:border-accent/40'
                }`}
              >
                {formatOccurrenceShortLabel(occ.startAt)}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div ref={errorRef} className="mt-4">
        {(validationError && (managingId || newOpen)) ? (
          <ProducerTicketFormErrorSummary error={validationError} />
        ) : null}
      </div>

      {!ticketTypesForSection.length && !newOpen ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-bg-muted/40 py-10 text-center">
          <p className="text-text-muted">Todavía no hay tipos de entrada para este evento.</p>
          <p className="mt-2 text-sm text-text-muted">
            Creá un tipo (ej. General) y configurá al menos una tanda con precio y fechas.
          </p>
          <Button type="button" className="mt-4" onClick={startNew}>
            Crear primer tipo de entrada
          </Button>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {ticketTypesForSection.map((tt) => {
          const sold = getTicketTypeSoldCount(tt);
          const isManaging = managingId === tt.id;

          return (
            <ProducerTicketTypeCard
              key={tt.id}
              eventId={eventId}
              ticketType={tt}
              isManaging={isManaging}
              onManage={() => (isManaging ? closeManage() : openManage(tt))}
            >
              {isManaging && editForm ? (
                <div className="space-y-4">
                  <ProducerTicketTypeFormFields
                    form={editForm}
                    onChange={setEditForm}
                    hasSold={sold > 0}
                    fieldErrors={validationError?.fieldErrors}
                    batchErrors={validationError?.batchErrors}
                    previewTicketType={managingTicketType ?? tt}
                  />
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Button type="button" variant="outline" onClick={closeManage}>
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      disabled={updateMut.isPending}
                      onClick={() => {
                        if (!runValidation(editForm, sold > 0)) return;
                        updateMut.mutate({ id: tt.id, form: editForm, hasSold: sold > 0 });
                      }}
                    >
                      {updateMut.isPending ? 'Guardando…' : 'Guardar cambios'}
                    </Button>
                  </div>
                </div>
              ) : null}
            </ProducerTicketTypeCard>
          );
        })}
      </div>

      {newOpen && newForm ? (
        <div className="mt-8 rounded-xl border border-accent/30 bg-bg-muted/50 p-4 sm:p-5">
          <h3 className="font-semibold text-text">Nuevo tipo de entrada</h3>
          <div className="mt-4">
            <ProducerTicketTypeFormFields
              form={newForm}
              onChange={setNewForm}
              hasSold={false}
              fieldErrors={validationError?.fieldErrors}
              batchErrors={validationError?.batchErrors}
            />
          </div>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNewOpen(false);
                setNewForm(null);
                setValidationError(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={createMut.isPending}
              onClick={() => {
                if (!runValidation(newForm, false)) return;
                createMut.mutate({
                  form: newForm,
                  occurrenceId: resolvedOccurrenceId ?? undefined,
                });
              }}
            >
              {createMut.isPending ? 'Creando…' : 'Crear tipo de entrada'}
            </Button>
          </div>
        </div>
      ) : ticketTypesForSection.length > 0 ? (
        <Button type="button" className="mt-6" variant="secondary" onClick={startNew}>
          + Agregar tipo de entrada
        </Button>
      ) : null}
    </section>
  );
}
