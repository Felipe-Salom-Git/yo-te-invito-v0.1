'use client';

import { Input } from '@/components';
import {
  RELATED_LINKS_MAX,
  relatedLinkItemSchema,
  type RelatedLinkItem,
  type RelatedLinkType,
} from '@yo-te-invito/shared';

const TYPE_OPTIONS: Array<{ value: RelatedLinkType | ''; label: string }> = [
  { value: '', label: 'Sin tipo' },
  { value: 'web', label: 'Sitio web' },
  { value: 'reserva', label: 'Reserva' },
  { value: 'info', label: 'Más información' },
  { value: 'redes', label: 'Redes' },
];

export type RelatedLinksFormFieldsProps = {
  value: RelatedLinkItem[];
  onChange: (value: RelatedLinkItem[]) => void;
  disabled?: boolean;
};

export function validateRelatedLinksDraft(items: RelatedLinkItem[]): string | null {
  if (items.length > RELATED_LINKS_MAX) {
    return `Máximo ${RELATED_LINKS_MAX} links`;
  }
  for (const item of items) {
    const title = item.title?.trim();
    const url = item.url?.trim();
    if (!title && !url) continue;
    const parsed = relatedLinkItemSchema.safeParse({
      ...item,
      title: title ?? '',
      url: url ?? '',
    });
    if (!parsed.success) {
      return parsed.error.issues[0]?.message ?? 'Link inválido';
    }
  }
  return null;
}

export function normalizeRelatedLinksForSave(items: RelatedLinkItem[]): RelatedLinkItem[] {
  return items
    .map((item, index) => ({
      title: item.title.trim(),
      url: item.url.trim(),
      ...(item.type ? { type: item.type } : {}),
      sortOrder: index,
    }))
    .filter((item) => item.title && item.url);
}

export function RelatedLinksFormFields({
  value,
  onChange,
  disabled = false,
}: RelatedLinksFormFieldsProps) {
  const setItem = (index: number, patch: Partial<RelatedLinkItem>) => {
    const next = value.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(next);
  };

  const addItem = () => {
    if (value.length >= RELATED_LINKS_MAX) return;
    onChange([...value, { title: '', url: '', sortOrder: value.length }]);
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-text">Links relacionados</p>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled || value.length >= RELATED_LINKS_MAX}
          className="text-sm text-accent hover:underline disabled:opacity-50"
        >
          Agregar link
        </button>
      </div>
      <p className="text-xs text-text-muted">
        Enlaces seguros con título y URL https. Máximo {RELATED_LINKS_MAX}. No se permite HTML en
        descripciones.
      </p>
      {value.length === 0 ? (
        <p className="text-sm text-text-muted">Sin links relacionados.</p>
      ) : (
        <ul className="space-y-3">
          {value.map((item, index) => (
            <li
              key={`related-link-${index}`}
              className="rounded-lg border border-border bg-bg-muted/40 p-3"
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Título"
                  value={item.title}
                  onChange={(e) => setItem(index, { title: e.target.value })}
                  disabled={disabled}
                  placeholder="Ej. Más info en el sitio del operador"
                />
                <Input
                  label="URL"
                  value={item.url}
                  onChange={(e) => setItem(index, { url: e.target.value })}
                  disabled={disabled}
                  placeholder="https://…"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-[160px]">
                  <label className="mb-1.5 block text-sm font-medium text-text">Tipo (opcional)</label>
                  <select
                    value={item.type ?? ''}
                    onChange={(e) =>
                      setItem(index, {
                        type: (e.target.value || undefined) as RelatedLinkType | undefined,
                      })
                    }
                    disabled={disabled}
                    className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
                  >
                    {TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value || 'none'} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  disabled={disabled}
                  className="text-sm text-red-400 hover:underline disabled:opacity-50"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
