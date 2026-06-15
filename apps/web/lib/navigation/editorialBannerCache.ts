import type { QueryClient } from '@tanstack/react-query';
import type { CategoryEditorialBannerItem, ContentMainCategory } from '@/repositories/interfaces';
import { categoryEditorialBannersKeys } from '@/lib/query/keys';

type AdminListResponse = { data: CategoryEditorialBannerItem[] };

function normalizeAdminList(response: unknown): AdminListResponse | null {
  if (!response || typeof response !== 'object') return null;
  const data = (response as AdminListResponse).data;
  if (!Array.isArray(data)) return null;
  return { data };
}

/** Keep admin banner list in sync — never replace with a single-item partial response. */
export function syncAdminEditorialBannerList(
  qc: QueryClient,
  category: ContentMainCategory,
  response: unknown,
) {
  const next = normalizeAdminList(response);
  if (!next) {
    void qc.invalidateQueries({ queryKey: categoryEditorialBannersKeys.admin(category) });
    return;
  }

  qc.setQueryData(categoryEditorialBannersKeys.admin(category), (prev: AdminListResponse | undefined) => {
    if (next.data.length > 1) return next;
    if (!prev?.data?.length) return next;
    const newItem = next.data[0];
    if (!newItem) return next;
    if (prev.data.some((i) => i.id === newItem.id)) return next;
    return { data: [...prev.data, newItem] };
  });
}
