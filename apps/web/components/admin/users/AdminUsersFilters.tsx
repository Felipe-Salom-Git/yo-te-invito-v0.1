'use client';

import { Input, Button } from '@/components';
import type { AdminUsersFiltersState } from '@/lib/admin/admin-users-filters';
import { USER_ROLE_OPTIONS } from '@/lib/admin/user-role-labels';

type AdminUsersFiltersProps = {
  filters: AdminUsersFiltersState;
  onChange: (patch: Partial<AdminUsersFiltersState>) => void;
  onApply: () => void;
  onClear: () => void;
};

export function AdminUsersFilters({
  filters,
  onChange,
  onApply,
  onClear,
}: AdminUsersFiltersProps) {
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
          placeholder="Nombre o email"
        />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Rol</label>
          <select
            value={filters.role}
            onChange={(e) => onChange({ role: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Todos los roles</option>
            {USER_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Email verificado</label>
          <select
            value={filters.emailVerified}
            onChange={(e) => onChange({ emailVerified: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Todos</option>
            <option value="yes">Verificado</option>
            <option value="no">Sin verificar</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text">Estado cuenta</label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ status: e.target.value })}
            className="w-full rounded border border-border bg-bg px-3 py-2 text-text"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activo</option>
            <option value="SUSPENDED">Suspendido</option>
          </select>
        </div>
        <Input
          label="Alta desde"
          type="date"
          value={filters.from ? filters.from.slice(0, 10) : ''}
          onChange={(e) =>
            onChange({
              from: e.target.value ? `${e.target.value}T00:00:00.000Z` : '',
            })
          }
        />
        <Input
          label="Alta hasta"
          type="date"
          value={filters.to ? filters.to.slice(0, 10) : ''}
          onChange={(e) =>
            onChange({
              to: e.target.value ? `${e.target.value}T23:59:59.999Z` : '',
            })
          }
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-4 text-sm text-text">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hasProducerProfile}
            onChange={(e) => onChange({ hasProducerProfile: e.target.checked })}
          />
          Con productora
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hasGastroProfile}
            onChange={(e) => onChange({ hasGastroProfile: e.target.checked })}
          />
          Con gastro
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hasHotelProfile}
            onChange={(e) => onChange({ hasHotelProfile: e.target.checked })}
          />
          Con hotel
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={filters.hasReferrerProfile}
            onChange={(e) => onChange({ hasReferrerProfile: e.target.checked })}
          />
          Con referidor
        </label>
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
