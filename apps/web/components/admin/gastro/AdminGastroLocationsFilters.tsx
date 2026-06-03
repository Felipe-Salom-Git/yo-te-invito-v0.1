'use client';

import { Button, Input } from '@/components';
import type { AdminGastroFiltersState } from '@/lib/admin/admin-gastro-filters';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'active', label: 'Activo' },
  { value: 'suspended', label: 'Suspendido' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'draft', label: 'Borrador' },
  { value: 'rejected', label: 'Rechazado' },
];

const OWNER_OPTIONS = [
  { value: '', label: 'Dueño: todos' },
  { value: 'yes', label: 'Con dueño' },
  { value: 'no', label: 'Operado por admin' },
];

const PUBLIC_OPTIONS = [
  { value: '', label: 'Ficha pública: todas' },
  { value: 'yes', label: 'Sincronizada' },
  { value: 'no', label: 'Sin publicar' },
];

type Props = {
  filters: AdminGastroFiltersState;
  onChange: (patch: Partial<AdminGastroFiltersState>) => void;
  onApply: () => void;
  onClear: () => void;
};

const selectClass =
  'w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text';

export function AdminGastroLocationsFilters({
  filters,
  onChange,
  onApply,
  onClear,
}: Props) {
  return (
    <div className="rounded-xl border border-border/80 bg-bg-muted/30 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Buscar"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Nombre, email o ciudad del titular"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Estado</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className={selectClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Ciudad (filtro local)"
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="Ej. Bariloche"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Dueño</label>
          <select
            value={filters.hasOwner}
            onChange={(e) =>
              onChange({
                hasOwner: e.target.value as AdminGastroFiltersState['hasOwner'],
              })
            }
            className={selectClass}
          >
            {OWNER_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Ficha pública</label>
          <select
            value={filters.hasPublic}
            onChange={(e) =>
              onChange({
                hasPublic: e.target.value as AdminGastroFiltersState['hasPublic'],
              })
            }
            className={selectClass}
          >
            {PUBLIC_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={filters.pendingDiscounts}
              onChange={(e) => onChange({ pendingDiscounts: e.target.checked })}
              className="rounded border-border"
            />
            Con descuentos pendientes
          </label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onApply}>
          Aplicar filtros
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onClear}>
          Limpiar
        </Button>
      </div>
      {(filters.hasOwner || filters.hasPublic || filters.city.trim()) && (
        <p className="mt-2 text-xs text-text-muted">
          Dueño, ficha pública y ciudad se filtran en esta página (el API admite búsqueda, estado y
          descuentos pendientes).
        </p>
      )}
    </div>
  );
}
