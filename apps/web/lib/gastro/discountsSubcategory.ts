import { GASTRO_DISCOUNTS_SUBCATEGORY_SLUG } from '@yo-te-invito/shared';
import type { PublicSubcategorySummary } from '@/repositories/interfaces';

export { GASTRO_DISCOUNTS_SUBCATEGORY_SLUG };

export const GASTRO_DISCOUNTS_VIRTUAL_SUBCATEGORY: PublicSubcategorySummary = {
  id: 'virtual-gastro-descuentos',
  category: 'gastro',
  name: 'Descuentos',
  slug: GASTRO_DISCOUNTS_SUBCATEGORY_SLUG,
  description: 'Beneficios gratis con código QR para el local',
  imageUrl: null,
  iconName: 'tag',
  sortOrder: -1,
};

export function isGastroDiscountsSubcategory(slug: string | null | undefined): boolean {
  return slug?.trim() === GASTRO_DISCOUNTS_SUBCATEGORY_SLUG;
}
