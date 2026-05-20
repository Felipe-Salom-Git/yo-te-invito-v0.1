'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContentMainCategory } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { categoryBannersKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function useCategoryBanner(category: ContentMainCategory) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  return useQuery({
    queryKey: categoryBannersKeys.public(t, category),
    queryFn: () => repos.categoryBanners.getPublic(t, category),
    enabled: !!t && !!category,
  });
}

export function useAdminCategoryBanner(category: ContentMainCategory) {
  const repos = useRepositories();

  return useQuery({
    queryKey: categoryBannersKeys.admin(category),
    queryFn: () => repos.categoryBanners.getAdmin(category),
    enabled: !!category,
  });
}
