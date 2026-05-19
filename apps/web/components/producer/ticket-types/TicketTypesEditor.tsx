'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ticketTypesKeys } from '@/lib/query/keys';
import { getErrorMessage } from '@/lib/errors';
import {
  ticketTypeEditFormToValidationDrafts,
  validateTicketTypeBatches,
} from '@/lib/producer/ticket-type-batches.validation';
import { editFormToApiBatches, editFormToCreateInput } from '@/lib/producer/ticket-types-api-map';
import {
  emptyBatchTemplate,
  mapTicketTypeToEditForm,
  type TicketTypeEditForm,
} from '@/lib/producer/ticket-types-editor.model';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Button, Badge, useToast } from '@/components';
import { ProducerTicketTypeFormFields } from './ProducerTicketTypeFormFields';
import { ProducerTicketTypeSummaryPanel } from './ProducerTicketTypeSummaryPanel';

function soldCount(tt: TicketTypeResponse): number {
  const capT = tt.capacityTotal ?? tt.capacityAvailable ?? 0;
  const capA = tt.capacityAvailable ?? 0;
  return Math.max(0, capT - capA);
}

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

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<TicketTypeEditForm | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState<TicketTypeEditForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { data: ticketTypes, isLoading, isError, error } = useQuery({
    queryKey: ticketTypesKeys.producerByEvent(eventId),
    queryFn: () => repos.ticketTypes.list(eventId),
    enabled: !!eventId && !!userId,
  });

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ticketTypesKeys.producerByEvent(eventId) });
    queryClient.invalidateQueries({ queryKey: ticketTypesKeys.byEvent(eventId) });
  }, [eventId, queryClient]);

  const createMut = useMutation({
    mutationFn: (form: TicketTypeEditForm) => {
      const v = validateTicketTypeBatches(form.capacityTotal, ticketTypeEditFormToValidationDrafts(form));
      if (!v.ok) throw new Error(v.message);
      return repos.ticketTypes.create(eventId, editFormToCreateInput(form));
    },
    onSuccess: () => {
      addToast('Tipo de entrada creado', 'success');
      invalidate();
      setNewOpen(false);
      setNewForm(null);
      setFormError(null);
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
      const v = validateTicketTypeBatches(form.capacityTotal, ticketTypeEditFormToValidationDrafts(form));
      if (!v.ok) throw new Error(v.message);
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
      setEditingId(null);
      setEditForm(null);
      setFormError(null);
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const startEdit = (tt: TicketTypeResponse) => {
    setEditingId(tt.id);
    setEditForm(mapTicketTypeToEditForm(tt));
    setFormError(null);
  };

  const startNew = () => {
    setNewOpen(true);
    setNewForm({
      name: '',
      description: '',
      capacityTotal: 100,
      maxPerOrder: 10,
      status: 'ACTIVE',
      batches: [emptyBatchTemplate(0)],
    });
    setFormError(null);
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

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-semibold text-text">Tipos de entrada</h2>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Cada <span className="font-medium text-text">tipo</span> (ej. VIP) puede tener varias{' '}
            <span className="font-medium text-text">tandas</span>: ventanas de tiempo y precio encadenadas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/producer/events/${eventId}/edit`} className="text-sm text-accent hover:underline">
            Editar datos del evento
          </Link>
        </div>
      </div>

      {!ticketTypes?.length && !newOpen ? (
        <div className="mt-6 rounded-xl border border-dashed border-border bg-bg-muted/40 py-10 text-center">
          <p className="text-text-muted">Todavía no cargaste tipos de entrada.</p>
          <p className="mt-2 text-sm text-text-muted">Creá un tipo (ej. VIP) y sumá las tandas de venta dentro.</p>
          <Button type="button" className="mt-4" onClick={startNew}>
            Crear primer tipo
          </Button>
        </div>
      ) : null}

      <div className="mt-6 space-y-6">
        {ticketTypes?.map((tt) => {
          const capT = tt.capacityTotal ?? tt.capacityAvailable ?? 0;
          const s = soldCount(tt);
          const pct = capT > 0 ? Math.round((s / capT) * 100) : 0;
          const isEditing = editingId === tt.id;

          return (
            <div key={tt.id} className="rounded-xl border border-border bg-bg-muted/30 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-text">{tt.name}</h3>
                    <Badge variant={tt.status === 'PAUSED' ? 'muted' : 'accent'}>{tt.status ?? 'ACTIVE'}</Badge>
                  </div>
                  {tt.description ? <p className="mt-1 text-sm text-text-muted">{String(tt.description)}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/producer/events/${eventId}/ticket-types/${tt.id}/design`}
                    className="inline-flex items-center justify-center rounded border border-border bg-bg-muted px-3 py-1.5 text-sm font-medium text-text transition-colors hover:bg-border focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg"
                  >
                    Diseñar ticket
                  </Link>
                  {!isEditing ? (
                    <Button type="button" size="sm" onClick={() => startEdit(tt)}>
                      Editar
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-4">
                <ProducerTicketTypeSummaryPanel ticketType={tt} />
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="h-2 flex-1 max-w-md overflow-hidden rounded-full bg-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
                <span className="text-xs text-text-muted">{pct}% vendido</span>
              </div>

              {isEditing && editForm ? (
                <div className="mt-4 space-y-3">
                  <ProducerTicketTypeFormFields form={editForm} onChange={setEditForm} hasSold={s > 0} />
                  {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={updateMut.isPending}
                      onClick={() => {
                        const v = validateTicketTypeBatches(editForm.capacityTotal, ticketTypeEditFormToValidationDrafts(editForm));
                        if (s === 0 && !v.ok) {
                          setFormError(v.message);
                          return;
                        }
                        setFormError(null);
                        updateMut.mutate({ id: tt.id, form: editForm, hasSold: s > 0 });
                      }}
                    >
                      Guardar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setEditingId(null);
                        setEditForm(null);
                        setFormError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {newOpen && newForm ? (
        <div className="mt-8 rounded-xl border border-accent/30 bg-bg-muted/50 p-4">
          <h3 className="font-semibold text-text">Nuevo tipo de entrada</h3>
          <ProducerTicketTypeFormFields form={newForm} onChange={setNewForm} hasSold={false} />
          {formError ? <p className="text-sm text-red-400">{formError}</p> : null}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={createMut.isPending}
              onClick={() => {
                const v = validateTicketTypeBatches(newForm.capacityTotal, ticketTypeEditFormToValidationDrafts(newForm));
                if (!v.ok) {
                  setFormError(v.message);
                  return;
                }
                if (!newForm.name.trim()) {
                  setFormError('El nombre del tipo es obligatorio.');
                  return;
                }
                setFormError(null);
                createMut.mutate(newForm);
              }}
            >
              Guardar tipo
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setNewOpen(false);
                setNewForm(null);
                setFormError(null);
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : ticketTypes && ticketTypes.length > 0 ? (
        <Button type="button" className="mt-6" variant="secondary" onClick={startNew}>
          + Agregar tipo de entrada
        </Button>
      ) : null}
    </section>
  );
}
