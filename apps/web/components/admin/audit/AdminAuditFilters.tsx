'use client';

import { Input, Button } from '@/components';
import type { AdminAuditFiltersState } from '@/lib/admin/admin-audit-filters';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_TYPE_OPTIONS } from '@/lib/admin/audit-labels';

type AdminAuditFiltersProps = {
  filters: AdminAuditFiltersState;
  onChange: (patch: Partial<AdminAuditFiltersState>) => void;
  onApply: () => void;
  onClear: () => void;
};

export function AdminAuditFilters({
  filters,
  onChange,
  onApply,
  onClear,
}: AdminAuditFiltersProps) {
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
          placeholder="Acción, entidad, id…"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Acción</label>
          <select
            value={filters.action}
            onChange={(e) => onChange({ action: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Todas las acciones</option>
            {AUDIT_ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Entidad</label>
          <select
            value={filters.entityType}
            onChange={(e) => onChange({ entityType: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            {AUDIT_ENTITY_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Email del actor"
          value={filters.actorEmail}
          onChange={(e) => onChange({ actorEmail: e.target.value })}
          placeholder="usuario@ejemplo.com"
        />
        <Input
          label="ID del actor (opcional)"
          value={filters.actorUserId}
          onChange={(e) => onChange({ actorUserId: e.target.value })}
          placeholder="cuid del usuario"
        />
        <Input
          label="Desde"
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ''}
          onChange={(e) =>
            onChange({
              from: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
            })
          }
        />
        <Input
          label="Hasta"
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
