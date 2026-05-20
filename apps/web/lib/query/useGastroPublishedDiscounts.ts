'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';

const TENANT_FALLBACK = 'tenant-demo';

export const gastroDiscountsKeys = {
  all: ['gastro-discounts'] as const,
  count: (tenantId: string) => [...gastroDiscountsKeys.all, 'count', tenantId] as const,
  list: (tenantId: string, subcategorySlug?: string) =>
    [...gastroDiscountsKeys.all, 'list', tenantId, subcategorySlug ?? ''] as const,
  detail: (tenantId: string, discountId: string) =>
    [...gastroDiscountsKeys.all, 'detail', tenantId, discountId] as const,
  claim: (tenantId: string, claimId: string, token: string) =>
    [...gastroDiscountsKeys.all, 'claim', tenantId, claimId, token] as const,
};

export function useGastroPublishedDiscountsCount(enabled = true) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  return useQuery({
    queryKey: gastroDiscountsKeys.count(t),
    queryFn: () => repos.publicGastro.countPublishedDiscounts(t),
    enabled: enabled && !!t,
  });
}

export function useGastroPublishedDiscounts(subcategorySlug?: string, enabled = true) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  return useQuery({
    queryKey: gastroDiscountsKeys.list(t, subcategorySlug),
    queryFn: () =>
      repos.publicGastro.listPublishedDiscounts({
        tenantId: t,
        subcategorySlug,
        limit: 50,
      }),
    enabled: enabled && !!t,
  });
}

export function useGastroPublishedDiscount(discountId: string) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  return useQuery({
    queryKey: gastroDiscountsKeys.detail(t, discountId),
    queryFn: () => repos.publicGastro.getPublishedDiscount(discountId, t),
    enabled: !!t && !!discountId,
  });
}

export function useGastroDiscountClaim(
  claimId: string,
  accessToken: string | null | undefined,
) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  return useQuery({
    queryKey: gastroDiscountsKeys.claim(t, claimId, accessToken ?? ''),
    queryFn: () =>
      repos.publicGastro.getDiscountClaim(claimId, {
        tenantId: t,
        accessToken: accessToken!,
      }),
    enabled: !!t && !!claimId && !!accessToken?.trim(),
  });
}
