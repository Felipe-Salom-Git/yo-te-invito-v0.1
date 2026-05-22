'use client';

import { useMemo } from 'react';
import type { CategoryGatewayId } from '@/lib/home/categoryGatewayConfig';
import {
  GASTRO_DISCOUNTS_VIRTUAL_SUBCATEGORY,
  GASTRO_DISCOUNTS_SUBCATEGORY_SLUG,
} from '@/lib/gastro/discountsSubcategory';
import { usePublicSubcategories } from '@/lib/query/subcategories';
import { useGastroPublishedDiscountsCount } from '@/lib/query/useGastroPublishedDiscounts';

export function useCategorySubcategories(category: CategoryGatewayId) {
  const { data: base = [], isLoading: baseLoading } = usePublicSubcategories(category);
  const { data: discountCount, isLoading: countLoading } = useGastroPublishedDiscountsCount(
    category === 'gastro',
  );

  const subcategories = useMemo(() => {
    const withoutHotel = base.filter((s) => s.category !== 'hotel');
    if (category !== 'gastro' || !discountCount?.count) {
      return withoutHotel;
    }
    if (withoutHotel.some((s) => s.slug === GASTRO_DISCOUNTS_SUBCATEGORY_SLUG)) {
      return withoutHotel;
    }
    return [GASTRO_DISCOUNTS_VIRTUAL_SUBCATEGORY, ...withoutHotel];
  }, [category, base, discountCount?.count]);

  return {
    subcategories,
    isLoading: baseLoading || (category === 'gastro' && countLoading),
  };
}
