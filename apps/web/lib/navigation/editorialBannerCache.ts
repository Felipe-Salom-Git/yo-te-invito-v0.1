import type { QueryClient } from '@tanstack/react-query';
import type { CategoryEditorialBannerItem, ContentMainCategory } from '@/repositories/interfaces';
import { categoryEditorialBannersKeys } from '@/lib/query/keys';

type AdminListResponse = { data: CategoryEditorialBannerItem[] };

function normalizeAdminList(response: unknown): AdminListResponse | null {
  if (Array.isArray(response)) {
    return { data: response as CategoryEditorialBannerItem[] };
  }
  if (!response || typeof response !== 'object') return null;
  const data = (response as AdminListResponse).data;
  if (!Array.isArray(data)) return null;
  return { data };
}

function sortByOrder(items: CategoryEditorialBannerItem[]): CategoryEditorialBannerItem[] {
  return [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
}

/**
 * Keep admin banner list in sync — append/merge, never replace with a partial single-item response.
 */
export function syncAdminEditorialBannerList(
  qc: QueryClient,
  category: ContentMainCategory,
  response: unknown,
) {
  const next = normalizeAdminList(response);
  const key = categoryEditorialBannersKeys.admin(category);

  if (!next) {
    void qc.invalidateQueries({ queryKey: key });
    return;
  }

  qc.setQueryData(key, (prev: AdminListResponse | undefined) => {
    const prevItems = prev?.data ?? [];
    const nextItems = sortByOrder(next.data);

    if (prevItems.length === 0) {
      return { data: nextItems };
    }

    // Full server list — typical create/update/reorder response from listAdmin().
    if (nextItems.length >= prevItems.length) {
      return { data: nextItems };
    }

    const byId = new Map(prevItems.map((item) => [item.id, item]));
    for (const item of nextItems) {
      byId.set(item.id, item);
    }

    // Partial response: merge updates and append any new ids.
    const merged = sortByOrder([...byId.values()]);
    if (merged.length < prevItems.length) {
      return { data: prevItems.map((item) => byId.get(item.id) ?? item) };
    }
    return { data: merged };
  });
}

/** Background refetch to guarantee admin list matches server. */
export function refetchAdminEditorialBannerList(
  qc: QueryClient,
  category: ContentMainCategory,
) {
  void qc.refetchQueries({ queryKey: categoryEditorialBannersKeys.admin(category) });
}
