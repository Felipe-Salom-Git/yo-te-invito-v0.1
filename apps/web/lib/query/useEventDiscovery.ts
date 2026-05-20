'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { CATEGORY_CAROUSEL_LIMIT } from '@/lib/categories/category-carousel.logic';

const TENANT_FALLBACK = 'tenant-demo';
const DATE_VIEW_LIMIT = 100;
const DATE_VIEW_MONTHS_AHEAD = 8;

export const eventDiscoveryKeys = {
  all: ['event-discovery'] as const,
  byDate: (tenantId: string, subcategorySlug: string) =>
    [...eventDiscoveryKeys.all, 'by-date', tenantId, subcategorySlug] as const,
  calendarMonth: (tenantId: string, month: string, subcategorySlug: string) =>
    [...eventDiscoveryKeys.all, 'calendar', tenantId, month, subcategorySlug] as const,
};

function dateToForDiscovery(): string {
  const to = new Date();
  to.setMonth(to.getMonth() + DATE_VIEW_MONTHS_AHEAD);
  to.setHours(23, 59, 59, 999);
  return to.toISOString();
}

export function useEventsByDate(subcategorySlug?: string | null, enabled = true) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const slug = subcategorySlug?.trim() ?? '';

  return useQuery({
    queryKey: eventDiscoveryKeys.byDate(t, slug),
    queryFn: async () => {
      const res = await repos.events.list({
        tenantId: t,
        category: 'event',
        subcategorySlug: slug || undefined,
        sort: 'dateAsc',
        limit: DATE_VIEW_LIMIT,
        page: 1,
        dateTo: dateToForDiscovery(),
      });
      return res.data;
    },
    enabled: !!t && enabled,
  });
}

export function useEventsCalendarMonth(month: string, subcategorySlug?: string | null) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const slug = subcategorySlug?.trim() ?? '';

  return useQuery({
    queryKey: eventDiscoveryKeys.calendarMonth(t, month, slug),
    queryFn: () =>
      repos.events.listCalendarMonth({
        tenantId: t,
        month,
        category: 'event',
        subcategorySlug: slug || undefined,
      }),
    enabled: !!t && !!month,
  });
}

export function currentMonthKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonthKey(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split('-').map(Number);
  const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(
    new Date(y, m - 1, 1),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
}
