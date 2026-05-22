import type { ContentCategory } from '@/repositories/interfaces';

export type AdminSubcategoryTab = {
  id: ContentCategory;
  label: string;
  /** Active verticals support subcategory CRUD */
  manageable: boolean;
};

/** Admin subcategory tabs — hotel is visible but not manageable (Próximamente). */
export const ADMIN_SUBCATEGORY_TABS: AdminSubcategoryTab[] = [
  { id: 'event', label: 'Eventos', manageable: true },
  { id: 'gastro', label: 'Gastronomía', manageable: true },
  { id: 'rental', label: 'Equipos y Rentals', manageable: true },
  { id: 'excursion', label: 'Excursiones', manageable: true },
  { id: 'hotel', label: 'Hoteles', manageable: false },
];

export function isManageableSubcategoryCategory(category: ContentCategory): boolean {
  return ADMIN_SUBCATEGORY_TABS.find((t) => t.id === category)?.manageable ?? false;
}
