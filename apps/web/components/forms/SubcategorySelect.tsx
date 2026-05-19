'use client';

import { usePublicSubcategories } from '@/lib/query/subcategories';
import type { ContentMainCategory } from '@/repositories/interfaces';

export interface SubcategorySelectProps {
  category: string;
  value: string;
  onChange: (subcategoryId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

const MAIN: ContentMainCategory[] = ['event', 'gastro', 'rental', 'excursion'];

function isMainCategory(cat: string): cat is ContentMainCategory {
  return (MAIN as string[]).includes(cat);
}

export function SubcategorySelect({
  category,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
}: SubcategorySelectProps) {
  if (category === 'hotel') {
    return (
      <p className={`text-sm text-text-muted ${className}`.trim()}>
        Subcategorías próximamente
      </p>
    );
  }

  if (!isMainCategory(category)) {
    return null;
  }

  const { data: items = [], isLoading } = usePublicSubcategories(category);

  if (isLoading) {
    return <p className={`text-sm text-text-muted ${className}`.trim()}>Cargando subcategorías…</p>;
  }

  if (items.length === 0) {
    return (
      <p className={`text-sm text-text-muted ${className}`.trim()}>
        Todavía no hay subcategorías disponibles para esta categoría.
      </p>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-text-muted">Subcategoría</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required && items.length > 0}
        disabled={disabled}
        className="mt-1 w-full rounded border border-border bg-bg px-3 py-2 text-text"
      >
        <option value="">— Seleccionar —</option>
        {items.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
