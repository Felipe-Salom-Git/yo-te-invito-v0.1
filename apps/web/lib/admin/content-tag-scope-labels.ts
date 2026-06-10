import type { ContentTagScope } from '@/repositories/interfaces';

export const CONTENT_TAG_SCOPE_OPTIONS: { value: ContentTagScope | 'any'; label: string }[] = [
  { value: 'any', label: 'Todas las verticales' },
  { value: 'all', label: 'Global (todas)' },
  { value: 'event', label: 'Eventos' },
  { value: 'gastro', label: 'Gastronomía' },
  { value: 'excursion', label: 'Excursiones' },
  { value: 'rental', label: 'Rentals' },
  { value: 'hotel', label: 'Hoteles' },
];

export function contentTagScopeLabel(scope: ContentTagScope | null | undefined): string {
  if (scope == null || scope === 'all') return 'Global';
  return CONTENT_TAG_SCOPE_OPTIONS.find((o) => o.value === scope)?.label ?? scope;
}
