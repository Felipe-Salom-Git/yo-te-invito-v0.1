'use client';

import { usePublicSubcategories } from '@/lib/query/subcategories';

export type ExcursionSubcategoryMultiSelectProps = {
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Excursion-only multi-select. First selected chip is the primary (`Event.subcategoryId`).
 */
export function ExcursionSubcategoryMultiSelect({
  value,
  onChange,
  disabled = false,
  className = '',
}: ExcursionSubcategoryMultiSelectProps) {
  const { data: items = [], isLoading } = usePublicSubcategories('excursion');

  const toggle = (id: string) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    onChange([...value, id]);
  };

  const movePrimary = (id: string) => {
    if (disabled || !value.includes(id)) return;
    onChange([id, ...value.filter((x) => x !== id)]);
  };

  if (isLoading) {
    return <p className={`text-sm text-text-muted ${className}`.trim()}>Cargando subcategorías…</p>;
  }

  if (items.length === 0) {
    return (
      <p className={`text-sm text-text-muted ${className}`.trim()}>
        Todavía no hay subcategorías disponibles para excursiones.
      </p>
    );
  }

  const selectedItems = value
    .map((id) => items.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => s != null);

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div>
        <label className="block text-sm font-medium text-text-muted">Subcategorías</label>
        <p className="mt-1 text-xs text-text-muted">
          Podés elegir varias. La primera seleccionada es la principal (badge en cards).
        </p>
      </div>

      {selectedItems.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Subcategorías seleccionadas">
          {selectedItems.map((item, index) => (
            <li key={item.id}>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm text-text">
                {index === 0 ? (
                  <span className="text-[10px] font-bold uppercase tracking-wide text-accent">
                    Principal
                  </span>
                ) : null}
                <span>{item.name}</span>
                {index > 0 ? (
                  <button
                    type="button"
                    onClick={() => movePrimary(item.id)}
                    disabled={disabled}
                    className="ml-1 text-xs text-accent hover:underline disabled:opacity-50"
                    title="Hacer principal"
                  >
                    ↑
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  disabled={disabled}
                  className="ml-1 text-text-muted hover:text-text disabled:opacity-50"
                  aria-label={`Quitar ${item.name}`}
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Agregar subcategoría">
        {items
          .filter((item) => !value.includes(item.id))
          .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              disabled={disabled}
              className="rounded-full border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:border-accent/50 hover:text-text disabled:opacity-50"
            >
              + {item.name}
            </button>
          ))}
      </div>
    </div>
  );
}

export function excursionSubcategoryIdsToPayload(ids: string[]): {
  subcategoryId: string | null;
  subcategoryIds: string[];
} {
  const unique = ids.filter((id, i, arr) => id && arr.indexOf(id) === i);
  return {
    subcategoryId: unique[0] ?? null,
    subcategoryIds: unique,
  };
}

export function excursionSubcategoryIdsFromEvent(event: {
  subcategoryId?: string | null;
  subcategories?: Array<{ id: string }> | null;
}): string[] {
  if (event.subcategories?.length) {
    return event.subcategories.map((s) => s.id);
  }
  return event.subcategoryId ? [event.subcategoryId] : [];
}
