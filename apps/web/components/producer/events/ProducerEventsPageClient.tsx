'use client';

import { useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  Button,
  PageLoader,
  EventCardSkeleton,
  EmptyState,
  Breadcrumbs,
  QueryError,
} from '@/components';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useProducerId } from '@/hooks/useProducerId';
import { useProducerDashboardMetrics } from '@/lib/query/producer-dashboard';
import { getErrorMessage } from '@/lib/errors';
import { ProducerPublicPageLink } from '@/components/producer/profile/ProducerPublicPageLink';
import {
  countEventsByProducerTab,
  emptyStateForProducerTab,
  filterProducerEvents,
  sortProducerEvents,
  type ProducerEventFilterTab,
  type ProducerEventSort,
} from '@/lib/producer/producer-event-filters';
import { ProducerEventsToolbar } from './ProducerEventsToolbar';
import { ProducerEventManageCard } from './ProducerEventManageCard';

export function ProducerEventsPageClient() {
  const { data: session, status } = useSession();
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const PRODUCER_ID = useProducerId();
  const t = tenantId ?? 'tenant-demo';

  const [activeTab, setActiveTab] = useState<ProducerEventFilterTab>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<ProducerEventSort>('startAsc');

  const eventsQuery = useQuery({
    queryKey: ['events', 'producer', PRODUCER_ID, t],
    queryFn: () => repos.events.list({ tenantId: t, producerId: PRODUCER_ID, limit: 50 }),
    enabled: !!t && status === 'authenticated',
  });

  const dashboardQuery = useProducerDashboardMetrics(status === 'authenticated');

  const { data: myProfile } = useQuery({
    queryKey: ['producer', 'my-profile'],
    queryFn: () => repos.producers.getMyProfile(),
    enabled: status === 'authenticated',
  });

  const allEvents = eventsQuery.data?.data ?? [];

  const engagementByEventId = useMemo(() => {
    const map = new Map<
      string,
      { viewCount: number; favoriteCount: number; expectedCount: number }
    >();
    for (const row of dashboardQuery.data?.eventEngagement ?? []) {
      map.set(row.id, {
        viewCount: row.viewCount,
        favoriteCount: row.favoriteCount,
        expectedCount: row.expectedCount,
      });
    }
    return map;
  }, [dashboardQuery.data?.eventEngagement]);

  const tabCounts = useMemo(() => countEventsByProducerTab(allEvents), [allEvents]);

  const filteredEvents = useMemo(() => {
    const filtered = filterProducerEvents(allEvents, activeTab, search);
    return sortProducerEvents(filtered, sort, activeTab);
  }, [allEvents, activeTab, search, sort]);

  if (status === 'loading') {
    return (
      <PageContainer>
        <PageLoader message="Cargando eventos…" />
      </PageContainer>
    );
  }

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Debés iniciar sesión.</p>
        <Link href="/login" className="mt-4 inline-block text-accent hover:underline">
          Iniciar sesión
        </Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: 'Panel', href: '/producer' }, { label: 'Mis eventos' }]} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <SectionTitle>Mis eventos</SectionTitle>
          <p className="mt-1 max-w-2xl text-sm text-text-muted">
            Gestioná publicaciones, entradas, cortesías y referidos por estado.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {myProfile ? (
            <ProducerPublicPageLink
              producer={myProfile}
              label="Ver página de productora"
            />
          ) : null}
          <Link href="/producer/events/new">
            <Button>Crear evento</Button>
          </Link>
        </div>
      </div>

      {eventsQuery.isError ? (
        <QueryError
          className="mt-6"
          message={getErrorMessage(eventsQuery.error)}
          onRetry={() => void eventsQuery.refetch()}
        />
      ) : null}

      {!eventsQuery.isError && (
        <>
          <ProducerEventsToolbar
            activeTab={activeTab}
            onTabChange={setActiveTab}
            counts={tabCounts}
            search={search}
            onSearchChange={setSearch}
            sort={sort}
            onSortChange={setSort}
          />

          <div className="mt-6 min-w-0 space-y-4">
            {!eventsQuery.data ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <EventCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredEvents.length === 0 ? (
              <EmptyState
                {...emptyStateForProducerTab(activeTab, allEvents.length > 0)}
              />
            ) : (
              filteredEvents.map((ev) => (
                <ProducerEventManageCard
                  key={ev.id}
                  event={ev}
                  engagement={engagementByEventId.get(ev.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
