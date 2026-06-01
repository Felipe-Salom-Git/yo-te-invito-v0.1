'use client';

import { Button, Input } from '@/components';
import type { AdminPaymentsFiltersState } from '@/lib/admin/admin-payments-filters';

type Props = {
  filters: AdminPaymentsFiltersState;
  onChange: (patch: Partial<AdminPaymentsFiltersState>) => void;
  onApply: () => void;
  onClear: () => void;
};

export function AdminPaymentsFilters({ filters, onChange, onApply, onClear }: Props) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          label="Buscar"
          name="q"
          placeholder="ID, email, referencia Getnet…"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
        />
        <label className="block text-sm">
          <span className="mb-1 block text-text-muted">Provider</span>
          <select
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
            value={filters.provider}
            onChange={(e) =>
              onChange({
                provider: e.target.value as AdminPaymentsFiltersState['provider'],
              })
            }
          >
            <option value="">Todos</option>
            <option value="GETNET">GETNET</option>
            <option value="DEMO">DEMO</option>
            <option value="MERCADOPAGO">MERCADOPAGO</option>
          </select>
        </label>
        <Input
          label="Estado pago"
          name="status"
          placeholder="PENDING, APPROVED…"
          value={filters.status}
          onChange={(e) => onChange({ status: e.target.value })}
        />
        <label className="flex items-end gap-2 pb-2 text-sm text-text">
          <input
            type="checkbox"
            className="rounded border-border"
            checked={filters.requiresManualReview}
            onChange={(e) => onChange({ requiresManualReview: e.target.checked })}
          />
          Solo requiere revisión manual
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" onClick={onApply}>
          Aplicar filtros
        </Button>
        <Button type="button" variant="outline" onClick={onClear}>
          Limpiar
        </Button>
      </div>
    </div>
  );
}
