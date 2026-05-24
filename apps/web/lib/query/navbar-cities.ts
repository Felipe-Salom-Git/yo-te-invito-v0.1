'use client';

/**
 * Cities with public discovery content for the navbar selector.
 *
 * Source: `EventsRepository.search` — `meta.total` per catalog city (`PROVINCE_CITY_CATALOG`,
 * excluding «Otra»), plus optional cities seen in a broad search sample (limit 100).
 *
 * Deuda: endpoint dedicado `GET /public/events/cities` reduciría N+1 probes y listaría
 * todas las ciudades con contenido sin depender del catálogo de preferencias.
 */

import { useQuery } from '@tanstack/react-query';
import { PROVINCE_CITY_CATALOG } from '@/lib/me/preferred-cities';
import { useRepositories } from '@/repositories/context';
import type { Repositories } from '@/repositories/interfaces';
import { useTenant } from '@/hooks/useTenant';
import { navbarCityKeys } from './keys';

const TENANT_FALLBACK = 'tenant-demo';
const BROAD_SEARCH_LIMIT = 100;

const CATALOG_CITIES_TO_PROBE = PROVINCE_CITY_CATALOG.filter((p) => p.id !== 'otra').flatMap(
  (p) => [...p.cities],
);

async function probeCityHasContent(
  repos: Repositories,
  tenantId: string,
  city: string,
  category?: string,
): Promise<boolean> {
  const res = await repos.events.search({
    tenantId,
    city,
    category: category?.trim() || undefined,
    limit: 1,
    page: 1,
  });
  return res.meta.total > 0;
}

export function useNavbarDiscoveryCities(category?: string | null) {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const t = tenantId || TENANT_FALLBACK;
  const categoryKey = category?.trim() || 'all';

  return useQuery({
    queryKey: navbarCityKeys.discovery(t, categoryKey),
    queryFn: async () => {
      const probes = await Promise.all(
        CATALOG_CITIES_TO_PROBE.map(async (city) => ({
          city,
          hasContent: await probeCityHasContent(repos, t, city, categoryKey === 'all' ? undefined : categoryKey),
        })),
      );
      const fromCatalog = probes.filter((p) => p.hasContent).map((p) => p.city);

      const broad = await repos.events.search({
        tenantId: t,
        category: categoryKey === 'all' ? undefined : categoryKey,
        limit: BROAD_SEARCH_LIMIT,
        page: 1,
      });

      const fromSample = new Set<string>(fromCatalog);
      for (const event of broad.data) {
        const c = event.city?.trim();
        if (c) fromSample.add(c);
      }

      return [...fromSample].sort((a, b) => a.localeCompare(b, 'es'));
    },
    enabled: !!t,
    staleTime: 5 * 60_000,
  });
}
