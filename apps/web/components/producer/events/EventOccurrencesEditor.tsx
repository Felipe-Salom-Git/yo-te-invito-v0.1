'use client';

import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, Button, useToast } from '@/components';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';
import {
  draftToCreateBody,
  draftToUpdateBody,
  formatOccurrenceDateTime,
  newOccurrenceDraft,
  occurrenceStatusLabel,
  occurrenceToDraft,
  validateOccurrenceDraft,
  type EventDateMode,
  type OccurrenceDraft,
} from '@/lib/producer/event-occurrences';
import type { EventOccurrenceWithStats } from '@yo-te-invito/shared';

export type EventOccurrencesEditorProps = {
  eventId?: string;
  dateMode: EventDateMode;
  onDateModeChange: (mode: EventDateMode) => void;
  defaultVenue?: { venueName?: string | null; city?: string | null };
  draftOccurrences: OccurrenceDraft[];
  onDraftChange: (drafts: OccurrenceDraft[]) => void;
  errors?: Record<string, string>;
};

function OccurrenceForm({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
  defaultVenueName,
}: {
  draft: OccurrenceDraft;
  onChange: (d: OccurrenceDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  saving?: boolean;
  defaultVenueName?: string | null;
}) {
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = () => {
    const v = validateOccurrenceDraft(draft);
    if (!v.ok) {
      setLocalError(v.message);
      return;
    }
    setLocalError(null);
    onSave();
  };

  return (
    <div className="rounded-lg border border-accent/30 bg-bg p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Input
          label="Inicio"
          type="datetime-local"
          value={draft.startAt}
          onChange={(e) => onChange({ ...draft, startAt: e.target.value })}
          required
        />
        <Input
          label="Fin (opcional)"
          type="datetime-local"
          value={draft.endAt ?? ''}
          onChange={(e) => onChange({ ...draft, endAt: e.target.value })}
        />
      </div>
      <Input
        label="Lugar (opcional)"
        value={draft.venueName ?? ''}
        onChange={(e) => onChange({ ...draft, venueName: e.target.value || null })}
        placeholder={defaultVenueName ?? 'Mismo que el evento'}
      />
      <Input
        label="Capacidad (opcional)"
        type="number"
        min={1}
        value={draft.capacity ?? ''}
        onChange={(e) =>
          onChange({
            ...draft,
            capacity: e.target.value ? parseInt(e.target.value, 10) : null,
          })
        }
      />
      <div>
        <label className="mb-1.5 block text-sm font-medium text-text">Estado</label>
        <select
          value={draft.status ?? 'ACTIVE'}
          onChange={(e) =>
            onChange({
              ...draft,
              status: e.target.value as OccurrenceDraft['status'],
            })
          }
          className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
        >
          <option value="ACTIVE">Activa</option>
          <option value="PAUSED">Pausada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
      </div>
      {localError ? <p className="text-sm text-red-400">{localError}</p> : null}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar fecha'}
        </Button>
      </div>
    </div>
  );
}

export function EventOccurrencesEditor({
  eventId,
  dateMode,
  onDateModeChange,
  defaultVenue,
  draftOccurrences,
  onDraftChange,
  errors,
}: EventOccurrencesEditorProps) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const isEditMode = !!eventId;

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<OccurrenceDraft | null>(null);

  const { data: apiOccurrences, isLoading } = useQuery({
    queryKey: ['eventOccurrences', eventId],
    queryFn: () => repos.events.listEventOccurrences(eventId!),
    enabled: isEditMode,
  });

  const invalidate = useCallback(() => {
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: ['eventOccurrences', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', eventId] });
      queryClient.invalidateQueries({ queryKey: ['event', 'producer', eventId] });
    }
  }, [eventId, queryClient]);

  const createMut = useMutation({
    mutationFn: (draft: OccurrenceDraft) =>
      repos.events.createEventOccurrence(eventId!, draftToCreateBody(draft, defaultVenue)),
    onSuccess: () => {
      addToast('Fecha agregada', 'success');
      invalidate();
      setEditingId(null);
      setEditDraft(null);
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, draft }: { id: string; draft: OccurrenceDraft }) =>
      repos.events.updateEventOccurrence(eventId!, id, draftToUpdateBody(draft)),
    onSuccess: () => {
      addToast('Fecha actualizada', 'success');
      invalidate();
      setEditingId(null);
      setEditDraft(null);
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const deleteMut = useMutation({
    mutationFn: (occurrenceId: string) =>
      repos.events.deleteEventOccurrence(eventId!, occurrenceId),
    onSuccess: () => {
      addToast('Fecha eliminada', 'success');
      invalidate();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const rows: Array<EventOccurrenceWithStats | OccurrenceDraft> = useMemo(() => {
    if (isEditMode) return apiOccurrences ?? [];
    return draftOccurrences;
  }, [isEditMode, apiOccurrences, draftOccurrences]);

  const startAdd = () => {
    const draft = newOccurrenceDraft();
    setEditingId(draft.localId);
    setEditDraft(draft);
  };

  const startEdit = (row: EventOccurrenceWithStats | OccurrenceDraft) => {
    const id = 'id' in row ? row.id : row.localId;
    const draft = 'startAt' in row && 'localId' in row
      ? row
      : occurrenceToDraft(row as EventOccurrenceWithStats);
    setEditingId(id);
    setEditDraft(draft);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };

  const saveDraft = () => {
    if (!editDraft) return;
    const v = validateOccurrenceDraft(editDraft);
    if (!v.ok) {
      addToast(v.message, 'error');
      return;
    }
    if (isEditMode) {
      const isNew = !apiOccurrences?.some((o) => o.id === editingId);
      if (isNew) {
        createMut.mutate(editDraft);
      } else if (editingId) {
        updateMut.mutate({ id: editingId, draft: editDraft });
      }
      return;
    }
    const exists = draftOccurrences.some((d) => d.localId === editDraft.localId);
    if (exists) {
      onDraftChange(
        draftOccurrences.map((d) => (d.localId === editDraft.localId ? editDraft : d)),
      );
    } else {
      onDraftChange([...draftOccurrences, editDraft]);
    }
    cancelEdit();
  };

  const removeRow = (row: EventOccurrenceWithStats | OccurrenceDraft) => {
    if (isEditMode && 'id' in row) {
      if (!window.confirm('¿Eliminar esta fecha? También debés quitar sus tipos de entrada.')) return;
      deleteMut.mutate(row.id);
      return;
    }
    const localId = 'localId' in row ? row.localId : row.id;
    onDraftChange(draftOccurrences.filter((d) => d.localId !== localId));
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <div className="space-y-4">
      <div
        className="inline-flex w-full gap-1 rounded-full border border-border bg-bg p-1 sm:w-auto"
        role="group"
        aria-label="Tipo de fecha"
      >
        <button
          type="button"
          onClick={() => onDateModeChange('simple')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
            dateMode === 'simple'
              ? 'bg-accent text-bg'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Una sola fecha
        </button>
        <button
          type="button"
          onClick={() => onDateModeChange('multi')}
          className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${
            dateMode === 'multi'
              ? 'bg-accent text-bg'
              : 'text-text-muted hover:text-text'
          }`}
        >
          Varias fechas
        </button>
      </div>

      {dateMode === 'multi' ? (
        <>
          <p className="text-sm text-text-muted">
            Este evento tiene varias fechas o funciones.
          </p>
          {errors?.occurrences ? (
            <p className="text-sm text-red-400">{errors.occurrences}</p>
          ) : null}

          {isEditMode && isLoading ? (
            <p className="text-sm text-text-muted">Cargando fechas…</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((row) => {
                const rowId = 'id' in row ? row.id : row.localId;
                const isEditing = editingId === rowId;
                const startAt = 'id' in row ? row.startAt : row.startAt
                  ? new Date(row.startAt).toISOString()
                  : '';
                const endAt = 'id' in row ? row.endAt : row.endAt
                  ? new Date(row.endAt).toISOString()
                  : null;

                if (isEditing && editDraft) {
                  return (
                    <li key={rowId}>
                      <OccurrenceForm
                        draft={editDraft}
                        onChange={setEditDraft}
                        onSave={saveDraft}
                        onCancel={cancelEdit}
                        saving={saving}
                        defaultVenueName={defaultVenue?.venueName}
                      />
                    </li>
                  );
                }

                return (
                  <li
                    key={rowId}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-bg p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">
                        {startAt ? formatOccurrenceDateTime(startAt, endAt) : 'Sin fecha'}
                      </p>
                      {'status' in row && row.status && row.status !== 'ACTIVE' ? (
                        <p className="mt-1 text-xs text-amber-400">
                          {occurrenceStatusLabel(row.status)}
                        </p>
                      ) : null}
                      {'soldCount' in row ? (
                        <p className="mt-1 text-xs text-text-muted">
                          {row.soldCount} vendidas · {row.ticketTypeCount} tipos de entrada
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(row)}>
                        Editar
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => removeRow(row)}
                        disabled={deleteMut.isPending}
                      >
                        Quitar
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {editingId && editDraft && !rows.some((r) => {
            const id = 'id' in r ? r.id : r.localId;
            return id === editingId;
          }) ? (
            <OccurrenceForm
              draft={editDraft}
              onChange={setEditDraft}
              onSave={saveDraft}
              onCancel={cancelEdit}
              saving={saving}
              defaultVenueName={defaultVenue?.venueName}
            />
          ) : !editingId ? (
            <Button type="button" variant="secondary" onClick={startAdd}>
              + Agregar fecha
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
