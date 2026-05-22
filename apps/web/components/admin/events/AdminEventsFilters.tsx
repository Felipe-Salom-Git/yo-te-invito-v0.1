'use client';

import { Input, Button } from '@/components';
import type { AdminEventsFiltersState } from '@/lib/admin/admin-events-filters';
import type { AdminProducerListItem } from '@/repositories/interfaces';
import type { SubcategoryAdmin } from '@/repositories/interfaces';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos los estados' },
  { value: 'pending', label: 'Pendiente' },
  { value: 'approved', label: 'Aprobado / publicado' },
  { value: 'draft', label: 'Borrador' },
  { value: 'paused', label: 'Pausado' },
  { value: 'cancelled', label: 'Cancelado / rechazado' },
];

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas las categorías' },
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'rental', label: 'Rentals' },
  { value: 'excursion', label: 'Excursiones' },
  { value: 'hotel', label: 'Hoteles (próximamente)' },
];

type AdminEventsFiltersProps = {
  filters: AdminEventsFiltersState;
  onChange: (patch: Partial<AdminEventsFiltersState>) => void;
  onApply: () => void;
  onClear: () => void;
  producers: AdminProducerListItem[];
  subcategories: SubcategoryAdmin[];
};

export function AdminEventsFilters({
  filters,
  onChange,
  onApply,
  onClear,
  producers,
  subcategories,
}: AdminEventsFiltersProps) {
  return (
    <form
      className="rounded-xl border border-border/80 bg-bg-muted/30 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onApply();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input
          label="Buscar"
          value={filters.q}
          onChange={(e) => onChange({ q: e.target.value })}
          placeholder="Título, ciudad, productora…"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Estado</label>
          <select
            value={filters.status}
            onChange={(e) =>
              onChange({ status: e.target.value, view: 'all', pendingOnly: false })
            }
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Categoría</label>
          <select
            value={filters.category}
            onChange={(e) =>
              onChange({ category: e.target.value, subcategoryId: '' })
            }
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Subcategoría</label>
          <select
            value={filters.subcategoryId}
            onChange={(e) => onChange({ subcategoryId: e.target.value })}
            disabled={!filters.category || subcategories.length === 0}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text disabled:opacity-50"
          >
            <option value="">Todas</option>
            {subcategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Ciudad"
          value={filters.city}
          onChange={(e) => onChange({ city: e.target.value })}
          placeholder="Ej. Bariloche"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Productora</label>
          <select
            value={filters.producerProfileId}
            onChange={(e) => onChange({ producerProfileId: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Todas</option>
            {producers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Desde (fecha evento)"
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ''}
          onChange={(e) =>
            onChange({
              from: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
            })
          }
        />
        <Input
          label="Hasta (fecha evento)"
          type="date"
          value={filters.to ? filters.to.slice(0, 10) : ''}
          onChange={(e) =>
            onChange({
              to: e.target.value ? `${e.target.value}T23:59:59.999Z` : '',
            })
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit">Aplicar filtros</Button>
        <Button type="button" variant="outline" onClick={onClear}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
