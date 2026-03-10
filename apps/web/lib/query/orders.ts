'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ordersKeys } from './keys';

export { ordersKeys } from './keys';

export function useOrderDetail(orderId: string, tenantId: string, options?: { enabled?: boolean }) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ordersKeys.detail(orderId),
    queryFn: () => repos.orders.get(orderId, tenantId),
    enabled: (options?.enabled ?? true) && !!orderId && !!tenantId,
  });
}

export function useMyOrders(userId: string, tenantId?: string) {
  const repos = useRepositories();
  const t = tenantId ?? 'tenant-demo';
  return useQuery({
    queryKey: ordersKeys.byBuyer(userId),
    queryFn: () => repos.orders.listByBuyer(userId, t),
    enabled: !!userId,
  });
}
