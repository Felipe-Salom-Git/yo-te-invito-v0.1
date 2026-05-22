'use client';

import { Button, Input, Select } from '@/components';
import {
  emptyBatchTemplate,
  emptyBatchTemplateAfter,
  renumberBatches,
  type TicketTypeEditForm,
} from '@/lib/producer/ticket-types-editor.model';
import { ProducerTicketBatchRow } from './ProducerTicketBatchRow';
import { ProducerTicketTypeSummaryPanel } from './ProducerTicketTypeSummaryPanel';
import type { TicketTypeResponse } from '@/repositories/interfaces';

type Props = {
  form: TicketTypeEditForm;
  onChange: (next: TicketTypeEditForm) => void;
  hasSold: boolean;
  fieldErrors?: Record<string, string>;
  batchErrors?: Record<string, string>;
  previewTicketType?: TicketTypeResponse | null;
};

export function ProducerTicketTypeFormFields({
  form,
  onChange,
  hasSold,
  fieldErrors = {},
  batchErrors = {},
  previewTicketType,
}: Props) {
  const batchDisabled = hasSold;

  const addBatch = () => {
    const last = form.batches[form.batches.length - 1];
    const row = last
      ? emptyBatchTemplateAfter(last.endAt, form.batches.length)
      : emptyBatchTemplate(0);
    onChange({
      ...form,
      batches: renumberBatches([...form.batches, row]),
    });
  };

  return (
    <div className="space-y-4">
      {hasSold ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Ya hay ventas para este tipo: no podés reemplazar tandas ni la capacidad total. Podés ajustar
          nombre, descripción, tope por orden y estado (activo/pausado).
        </p>
      ) : null}

      <Input
        label="Nombre del tipo"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        required
        error={fieldErrors.name}
        placeholder="Ej. VIP, General, Popular"
      />
      <Input
        label="Descripción (opcional)"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Capacidad total (stock del tipo)"
          type="number"
          min={1}
          value={form.capacityTotal || ''}
          onChange={(e) =>
            onChange({ ...form, capacityTotal: Math.max(1, parseInt(e.target.value, 10) || 1) })
          }
          disabled={hasSold}
          error={fieldErrors.capacityTotal}
        />
        <Input
          label="Máx. por orden"
          type="number"
          min={1}
          max={100}
          value={form.maxPerOrder || ''}
          onChange={(e) =>
            onChange({
              ...form,
              maxPerOrder: Math.min(100, Math.max(1, parseInt(e.target.value, 10) || 10)),
            })
          }
        />
        <Select
          label="Estado del tipo"
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as 'ACTIVE' | 'PAUSED' })}
          options={[
            { value: 'ACTIVE', label: 'Activo (visible en checkout si hay tanda vigente)' },
            { value: 'PAUSED', label: 'Pausado (no se vende)' },
          ]}
        />
      </div>

      {previewTicketType ? (
        <ProducerTicketTypeSummaryPanel
          ticketType={previewTicketType}
          draftBatches={batchDisabled ? undefined : form.batches}
        />
      ) : null}

      <div className="rounded-lg border border-border bg-bg-muted p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
          <div>
            <h4 className="text-sm font-semibold text-text">Tandas de venta</h4>
            <p className="mt-0.5 text-xs text-text-muted">
              Orden cronológico. La suma de cupos base debe igualar la capacidad total.
            </p>
          </div>
          {!batchDisabled ? (
            <Button type="button" size="sm" variant="secondary" onClick={addBatch}>
              + Agregar tanda
            </Button>
          ) : null}
        </div>

        {fieldErrors.batches ? (
          <p className="mb-3 text-sm text-red-400">{fieldErrors.batches}</p>
        ) : null}

        {form.batches.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-bg py-8 text-center">
            <p className="text-sm text-text-muted">
              Este tipo de entrada todavía no tiene tandas configuradas.
            </p>
            {!batchDisabled ? (
              <Button type="button" className="mt-4" size="sm" onClick={addBatch}>
                Crear primera tanda
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            {renumberBatches(form.batches).map((row, index, arr) => (
              <ProducerTicketBatchRow
                key={row.clientKey}
                row={row}
                index={index}
                total={arr.length}
                disabled={batchDisabled}
                batchError={batchErrors[row.clientKey]}
                onChange={(patch) => {
                  const next = [...form.batches];
                  const i = next.findIndex((b) => b.clientKey === row.clientKey);
                  if (i >= 0) next[i] = { ...next[i]!, ...patch };
                  onChange({ ...form, batches: renumberBatches(next) });
                }}
                onRemove={() => {
                  if (form.batches.length <= 1) return;
                  onChange({
                    ...form,
                    batches: renumberBatches(
                      form.batches.filter((b) => b.clientKey !== row.clientKey),
                    ),
                  });
                }}
                onMoveUp={() => {
                  if (index === 0) return;
                  const next = [...form.batches];
                  [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                  onChange({ ...form, batches: renumberBatches(next) });
                }}
                onMoveDown={() => {
                  if (index >= form.batches.length - 1) return;
                  const next = [...form.batches];
                  [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                  onChange({ ...form, batches: renumberBatches(next) });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
