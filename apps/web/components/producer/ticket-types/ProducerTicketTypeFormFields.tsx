'use client';

import { Button, Input, Select } from '@/components';
import {
  emptyBatchTemplate,
  emptyBatchTemplateAfter,
  renumberBatches,
  type TicketTypeEditForm,
} from '@/lib/producer/ticket-types-editor.model';
import { ProducerTicketBatchRow } from './ProducerTicketBatchRow';

type Props = {
  form: TicketTypeEditForm;
  onChange: (next: TicketTypeEditForm) => void;
  hasSold: boolean;
};

export function ProducerTicketTypeFormFields({ form, onChange, hasSold }: Props) {
  const batchDisabled = hasSold;

  return (
    <div className="space-y-4 rounded-lg border border-border bg-bg-muted p-4">
      {hasSold ? (
        <p className="rounded border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Ya hay ventas para este tipo: no podés reemplazar tandas ni la capacidad total. Podés ajustar nombre,
          descripción, tope por orden y estado.
        </p>
      ) : null}
      <Input
        label="Nombre del tipo (ej. VIP, Popular)"
        value={form.name}
        onChange={(e) => onChange({ ...form, name: e.target.value })}
        required
      />
      <Input
        label="Descripción (opcional)"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Input
          label="Capacidad total del tipo"
          type="number"
          min={1}
          value={form.capacityTotal || ''}
          onChange={(e) =>
            onChange({ ...form, capacityTotal: Math.max(1, parseInt(e.target.value, 10) || 1) })
          }
          disabled={hasSold}
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
          label="Estado"
          value={form.status}
          onChange={(e) => onChange({ ...form, status: e.target.value as 'ACTIVE' | 'PAUSED' })}
          options={[
            { value: 'ACTIVE', label: 'Activo' },
            { value: 'PAUSED', label: 'Pausado' },
          ]}
        />
      </div>

      <div className="border-t border-border pt-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-text">Tandas (etapas de venta)</h4>
          {!batchDisabled ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                const last = form.batches[form.batches.length - 1];
                const row = last
                  ? emptyBatchTemplateAfter(last.endAt, form.batches.length)
                  : emptyBatchTemplate(form.batches.length);
                onChange({
                  ...form,
                  batches: renumberBatches([...form.batches, row]),
                });
              }}
            >
              + Agregar tanda
            </Button>
          ) : null}
        </div>
        {form.batches.length === 0 ? (
          <p className="text-sm text-text-muted">No hay tandas. Agregá la primera para poder vender.</p>
        ) : (
          <div className="space-y-3">
            {renumberBatches(form.batches).map((row, index, arr) => (
              <ProducerTicketBatchRow
                key={row.clientKey}
                row={row}
                index={index}
                total={arr.length}
                disabled={batchDisabled}
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
                    batches: renumberBatches(form.batches.filter((b) => b.clientKey !== row.clientKey)),
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
