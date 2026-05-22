'use client';

import { useQuery } from '@tanstack/react-query';
import type { ContentCategory, ContentMainCategory } from '@/repositories/interfaces';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { subcategoriesKeys } from './keys';

const TENANT_ID = 'tenant-demo';

export function usePublicSubcategories(category: ContentMainCategory | null) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_ID;

  return useQuery({
    queryKey: subcategoriesKeys.public(t, category ?? 'none'),
    queryFn: () => repos.subcategories.listPublic(t, category!),
    enabled: !!t && !!category,
  });
}

export function useAdminSubcategories(category: ContentCategory) {
  const repos = useRepositories();

  return useQuery({
    queryKey: subcategoriesKeys.admin(category),
    queryFn: () => repos.subcategories.listAdmin(category),
    enabled: !!category,
  });
}
