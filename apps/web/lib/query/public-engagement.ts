'use client';

import { useEffect, useRef } from 'react';
import { useRepositories } from '@/repositories/context';

/**
 * Records one public event page view per mount (V2: no session dedup).
 * Call only from public detail pages, not producer/admin portals.
 */
export function useRecordPublicEventView(
  eventId: string | undefined,
  tenantId: string,
  enabled = true,
) {
  const repos = useRepositories();
  const recorded = useRef(false);

  useEffect(() => {
    if (!enabled || !eventId || !tenantId || recorded.current) return;
    recorded.current = true;
    void repos.events.recordPublicView(eventId, tenantId).catch(() => {
      recorded.current = false;
    });
  }, [enabled, eventId, tenantId, repos]);
}

/**
 * Records one public producer profile view per mount (V2: no session dedup).
 */
export function useRecordPublicProducerView(
  idOrSlug: string | undefined,
  tenantId: string,
  enabled = true,
) {
  const repos = useRepositories();
  const recorded = useRef(false);

  useEffect(() => {
    if (!enabled || !idOrSlug || !tenantId || recorded.current) return;
    recorded.current = true;
    void repos.producers.recordPublicView(idOrSlug, tenantId).catch(() => {
      recorded.current = false;
    });
  }, [enabled, idOrSlug, tenantId, repos]);
}

/**
 * Records one public GastroProfile ficha view per mount (page views, not unique visitors).
 * Call only from `/gastronomicos/[id]` (or equivalent public detail), after location is loaded.
 */
export function useRecordPublicGastroProfileView(
  gastroProfileId: string | undefined,
  tenantId: string,
  enabled = true,
) {
  const repos = useRepositories();
  const recorded = useRef(false);

  useEffect(() => {
    if (!enabled || !gastroProfileId || !tenantId || recorded.current) return;
    recorded.current = true;
    void repos.publicGastro.recordPublicView(gastroProfileId, tenantId).catch(() => {
      recorded.current = false;
    });
  }, [enabled, gastroProfileId, tenantId, repos]);
}
