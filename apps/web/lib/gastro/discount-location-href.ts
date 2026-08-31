import { getContentDetailHref } from '@/lib/home/contentRoutes';
import type { PublicGastroDiscountListItem } from '@/repositories/interfaces';

/** Public ficha href for the gastro local tied to a published discount card. */
export function getGastroDiscountLocationHref(
  discount: Pick<PublicGastroDiscountListItem, 'locationId' | 'locationSlug'>,
  tenantId?: string,
): string {
  return getContentDetailHref(
    {
      category: 'gastro',
      gastroProfileId: discount.locationId,
      id: discount.locationSlug ?? discount.locationId,
    },
    tenantId,
  );
}
