'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContentMainCategory } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { categoryEditorialBannersKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function useCategoryEditorialBanner(category: ContentMainCategory) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  return useQuery({
    queryKey: categoryEditorialBannersKeys.public(t, category),
    queryFn: () => repos.categoryEditorialBanners.getPublic(t, category),
    enabled: !!t && !!category,
  });
}

export function useAdminCategoryEditorialBanners(category: ContentMainCategory) {
  const repos = useRepositories();

  return useQuery({
    queryKey: categoryEditorialBannersKeys.admin(category),
    queryFn: () => repos.categoryEditorialBanners.listAdmin(category),
    enabled: !!category,
  });
}
