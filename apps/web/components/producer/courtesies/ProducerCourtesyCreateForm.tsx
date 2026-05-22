'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import type { TicketTypeResponse } from '@/repositories/interfaces';
import { Button, Input, Select } from '@/components';
import {
  buildCourtesyCreateBody,
  COURTESY_MODE_DESCRIPTIONS,
  COURTESY_MODE_LABELS,
  courtesyConfirmMessage,
  validateCourtesyForm,
  type CourtesyFormState,
  type CourtesyMode,
} from '@/lib/producer/courtesy.utils';
import { ProducerCourtesyFormErrorSummary } from './ProducerCourtesyFormErrorSummary';
import { formatTicketPrice } from '@/lib/producer/ticket-batch-display';

type Props = {
  eventId: string;
  ticketTypes: TicketTypeResponse[];
  isSubmitting: boolean;
  onSubmit: (body: ReturnType<typeof buildCourtesyCreateBody>) => void;
  onCancel?: () => void;
};

const DEFAULT_FORM: CourtesyFormState = {
  mode: 'CONSUMES_BATCH',
  ticketTypeId: '',
  quantity: 1,
  note: '',
};

export function ProducerCourtesyCreateForm({
  eventId,
  ticketTypes,
  isSubmitting,
  onSubmit,
  onCancel,
}: Props) {
  const [form, setForm] = useState<CourtesyFormState>(DEFAULT_FORM);
  const [validation, setValidation] = useState<{
    fieldErrors: Record<string, string>;
    message: string | null;
  }>({ fieldErrors: {}, message: null });
  const hasTicketTypes = ticketTypes.length > 0;

  useEffect(() => {
    if (!hasTicketTypes && form.mode === 'CONSUMES_BATCH') {
      setForm((p) => ({ ...p, mode: 'FREE_CAPACITY' }));
      return;
    }
    if (hasTicketTypes && !form.ticketTypeId && form.mode === 'CONSUMES_BATCH') {
      setForm((p) => ({ ...p, ticketTypeId: ticketTypes[0]!.id }));
    }
  }, [hasTicketTypes, form.mode, form.ticketTypeId, ticketTypes]);

  const selectedType = useMemo(
    () => ticketTypes.find((t) => t.id === form.ticketTypeId),
    [ticketTypes, form.ticketTypeId],
  );

  const handleModeChange = (mode: CourtesyMode) => {
    setForm((p) => ({
      ...p,
      mode,
      ticketTypeId:
        mode === 'CONSUMES_BATCH' && !p.ticketTypeId && ticketTypes[0]
          ? ticketTypes[0]!.id
          : p.ticketTypeId,
    }));
  };

  const runClientValidation = () => {
    const v = validateCourtesyForm(form, ticketTypes);
    setValidation(v);
    return !v.message;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!runClientValidation()) return;

    const typeName = selectedType?.name;
    if (
      typeof window !== 'undefined' &&
      !window.confirm(courtesyConfirmMessage(form, typeName))
    ) {
      return;
    }

    onSubmit(buildCourtesyCreateBody(form));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-bg-muted p-4 sm:p-6">
      <div>
        <h2 className="font-semibold text-text">Nueva cortesía</h2>
        <p className="mt-1 text-sm text-text-muted">
          Completá los datos. El backend genera los tickets con QR al confirmar.
        </p>
      </div>

      <ProducerCourtesyFormErrorSummary
        message={validation.message}
        fieldErrors={validation.fieldErrors}
      />

      <Select
        label="Modo de otorgamiento"
        value={form.mode}
        onChange={(e) => handleModeChange(e.target.value as CourtesyMode)}
        options={[
          {
            value: 'CONSUMES_BATCH',
            label: hasTicketTypes
              ? COURTESY_MODE_LABELS.CONSUMES_BATCH
              : `${COURTESY_MODE_LABELS.CONSUMES_BATCH} (sin tipos activos)`,
          },
          { value: 'FREE_CAPACITY', label: COURTESY_MODE_LABELS.FREE_CAPACITY },
        ]}
      />
      <p className="-mt-2 text-xs text-text-muted">{COURTESY_MODE_DESCRIPTIONS[form.mode]}</p>

      {form.mode === 'CONSUMES_BATCH' ? (
        hasTicketTypes ? (
          <>
            <Select
              label="Tipo de entrada"
              value={form.ticketTypeId}
              onChange={(e) => {
                setForm((p) => ({ ...p, ticketTypeId: e.target.value }));
              }}
              error={validation.fieldErrors.ticketTypeId}
              options={[
                { value: '', label: '— Elegí un tipo —' },
                ...ticketTypes.map((t) => ({
                  value: t.id,
                  label: `${t.name} · ${t.capacityAvailable ?? 0} disponibles`,
                })),
              ]}
            />
            {selectedType ? (
              <p className="text-xs text-text-muted">
                Precio de referencia (tanda activa):{' '}
                <span className="text-text">
                  {formatTicketPrice(selectedType.price, selectedType.currency ?? 'ARS')}
                </span>
                . La cortesía no cobra al destinatario.
              </p>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
            No hay tipos de entrada activos.{' '}
            <Link href={`/producer/events/${eventId}#entradas`} className="underline">
              Configurá entradas y tandas
            </Link>{' '}
            antes de otorgar cortesías con stock.
          </div>
        )
      ) : (
        <p className="text-xs text-text-muted">
          No necesitás elegir tipo de entrada. Los tickets de cortesía quedarán sin tipo asociado
          salvo que el flujo de ingreso lo requiera después.
        </p>
      )}

      <Input
        label="Cantidad de entradas"
        type="number"
        min={1}
        max={500}
        value={form.quantity || ''}
        onChange={(e) => {
          setForm((p) => ({
            ...p,
            quantity: Math.max(1, parseInt(e.target.value, 10) || 1),
          }));
        }}
        error={validation.fieldErrors.quantity}
        placeholder="Ej. 5"
      />

      <Input
        label="Nota interna (opcional)"
        value={form.note}
        onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
        placeholder="Ej. Prensa, staff, invitados VIP"
      />

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancelar
          </Button>
        ) : null}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            (form.mode === 'CONSUMES_BATCH' && !hasTicketTypes)
          }
          className="w-full sm:w-auto"
        >
          {isSubmitting ? 'Generando entradas…' : 'Otorgar cortesía'}
        </Button>
      </div>
    </form>
  );
}
