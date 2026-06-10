'use client';

import { MAX_CONTENT_TAGS_PER_PUBLICATION, formatContentTagHashtag } from '@yo-te-invito/shared';
import { usePublicContentTags } from '@/lib/query/content-tags';
import type { ContentMainCategory } from '@/repositories/interfaces';

export type ContentTagSelectorProps = {
  category: ContentMainCategory;
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

export function ContentTagSelector({
  category,
  value,
  onChange,
  disabled = false,
  className = '',
}: ContentTagSelectorProps) {
  const { data: items = [], isLoading } = usePublicContentTags(category);
  const atMax = value.length >= MAX_CONTENT_TAGS_PER_PUBLICATION;

  const toggle = (id: string) => {
    if (disabled) return;
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
      return;
    }
    if (atMax) return;
    onChange([...value, id]);
  };

  const selectedItems = value
    .map((id) => items.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => t != null);

  if (isLoading) {
    return <p className={`text-sm text-text-muted ${className}`.trim()}>Cargando etiquetas…</p>;
  }

  if (items.length === 0) {
    return (
      <p className={`text-sm text-text-muted ${className}`.trim()}>
        Todavía no hay etiquetas disponibles para esta vertical.
      </p>
    );
  }

  return (
    <div className={`space-y-3 ${className}`.trim()}>
      <div>
        <label className="block text-sm font-medium text-text-muted">Etiquetas</label>
        <p className="mt-1 text-xs text-text-muted">
          Agregá etiquetas para mejorar la búsqueda en Explorar. Ejemplo: nieve, cena, teatro,
          aventura. Máximo {MAX_CONTENT_TAGS_PER_PUBLICATION}.
        </p>
      </div>

      {selectedItems.length > 0 ? (
        <ul className="flex flex-wrap gap-2" aria-label="Etiquetas seleccionadas">
          {selectedItems.map((item) => (
            <li key={item.id}>
              <span className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-sm text-text">
                {formatContentTagHashtag(item.name)}
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

      {atMax ? (
        <p className="text-xs text-amber-400/90">
          Alcanzaste el máximo de {MAX_CONTENT_TAGS_PER_PUBLICATION} etiquetas.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2" role="group" aria-label="Agregar etiqueta">
        {items
          .filter((item) => !value.includes(item.id))
          .map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggle(item.id)}
              disabled={disabled || atMax}
              className="rounded-full border border-border px-3 py-1 text-sm text-text-muted transition-colors hover:border-accent/50 hover:text-text disabled:opacity-50"
            >
              + {formatContentTagHashtag(item.name)}
            </button>
          ))}
      </div>
    </div>
  );
}

export function tagIdsFromEvent(event: {
  tags?: Array<{ id: string }> | null;
}): string[] {
  return event.tags?.map((t) => t.id) ?? [];
}
