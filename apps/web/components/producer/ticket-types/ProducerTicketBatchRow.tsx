'use client';

import { Button, Input } from '@/components';
import type { BatchRowModel } from '@/lib/producer/ticket-types-editor.model';

type Props = {
  row: BatchRowModel;
  index: number;
  total: number;
  disabled?: boolean;
  batchError?: string;
  onChange: (patch: Partial<BatchRowModel>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

export function ProducerTicketBatchRow({
  row,
  index,
  total,
  disabled,
  batchError,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <div
      className={`rounded-lg border bg-bg p-4 space-y-3 ${
        batchError ? 'border-red-500/50' : 'border-border'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Tanda · orden {row.orderIndex + 1}
        </span>
        {!disabled && (
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={onMoveUp}>
              ↑
            </Button>
            <Button type="button" size="sm" variant="secondary" disabled={index >= total - 1} onClick={onMoveDown}>
              ↓
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={onRemove}
            >
              Eliminar
            </Button>
          </div>
        )}
      </div>
      {batchError ? <p className="text-sm text-red-400">{batchError}</p> : null}
      <Input
        label="Nombre de la tanda"
        value={row.name}
        onChange={(e) => onChange({ name: e.target.value })}
        disabled={disabled}
        placeholder="Ej. Tanda 1 — Preventa"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Venta desde"
          type="datetime-local"
          value={row.startAt}
          onChange={(e) => onChange({ startAt: e.target.value })}
          disabled={disabled}
        />
        <Input
          label="Venta hasta"
          type="datetime-local"
          value={row.endAt}
          onChange={(e) => onChange({ endAt: e.target.value })}
          disabled={disabled}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          label="Cantidad base (cupos)"
          type="number"
          min={1}
          value={row.baseQuantity || ''}
          onChange={(e) =>
            onChange({ baseQuantity: Math.max(1, parseInt(e.target.value, 10) || 1) })
          }
          disabled={disabled}
        />
        <Input
          label="Precio"
          type="number"
          min={0}
          step="0.01"
          value={row.price || ''}
          onChange={(e) => onChange({ price: Math.max(0, parseFloat(e.target.value) || 0) })}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
