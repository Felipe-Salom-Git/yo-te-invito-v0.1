'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CategoryGatewayScreen } from '@/components/category-gateway/CategoryGatewayScreen';
import {
  getCategoryGatewayHref,
  type CategoryGatewayId,
} from '@/lib/home/categoryGatewayConfig';

export default function CategoriasPage() {
  const router = useRouter();

  const handleCategorySelect = useCallback(
    (category: CategoryGatewayId) => {
      router.push(getCategoryGatewayHref(category));
    },
    [router],
  );

  return (
    <CategoryGatewayScreen
      variant="page"
      showLogo={false}
      onSelectCategory={handleCategorySelect}
    />
  );
}
