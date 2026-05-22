'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useReferrerProposals } from '@/hooks/useReferrerProposals';
import { formatCommissionValue } from '@/lib/producer/referral-display';
import type { ReferrerDashboardSaleLink } from '@/repositories/interfaces';

export type ReferrerActiveLinkRow = {
  linkId: string;
  code: string;
  url: string;
  eventId: string;
  eventTitle: string;
  producerName: string | null;
  commissionLabel: string | null;
  agreementStatus: string | null;
  paidOrders: number;
  ticketsSold: number;
  grossRevenueCents: number;
  source: 'dashboard' | 'agreement';
};

export function useReferrerLinks(enabled = true) {
  const repos = useRepositories();

  const dashQuery = useQuery({
    queryKey: ['referrer', 'dashboard'],
    queryFn: () => repos.profiles.getReferrerDashboard(),
    enabled,
  });

  const proposalsQuery = useReferrerProposals(enabled);

  const links = useMemo(() => {
    const saleLinks: ReferrerDashboardSaleLink[] = dashQuery.data?.metrics.saleLinks ?? [];
    const proposals = proposalsQuery.data?.proposals ?? [];
    const byCode = new Map<string, ReferrerActiveLinkRow>();

    for (const row of saleLinks) {
      byCode.set(row.code, {
        linkId: row.id,
        code: row.code,
        url: row.url,
        eventId: row.eventId,
        eventTitle: row.eventTitle,
        producerName: null,
        commissionLabel: null,
        agreementStatus: null,
        paidOrders: row.paidAttributedOrdersCount,
        ticketsSold: row.ticketsSoldCount,
        grossRevenueCents: row.grossRevenueFromReferralsCents,
        source: 'dashboard',
      });
    }

    for (const p of proposals) {
      const link = p.agreement?.referralLink;
      if (!link || p.status !== 'ACCEPTED') continue;
      const commissionLabel = formatCommissionValue(p.commissionType, p.commissionValue);
      const existing = byCode.get(link.code);
      if (existing) {
        byCode.set(link.code, {
          ...existing,
          linkId: link.id,
          url: link.url || existing.url,
          producerName: p.producerProfile?.displayName ?? existing.producerName,
          commissionLabel,
          agreementStatus: p.agreement?.status ?? null,
        });
      } else {
        byCode.set(link.code, {
          linkId: link.id,
          code: link.code,
          url: link.url,
          eventId: p.eventId,
          eventTitle: p.event?.title ?? p.eventId,
          producerName: p.producerProfile?.displayName ?? null,
          commissionLabel,
          agreementStatus: p.agreement?.status ?? null,
          paidOrders: 0,
          ticketsSold: 0,
          grossRevenueCents: 0,
          source: 'agreement',
        });
      }
    }

    return Array.from(byCode.values()).sort((a, b) => a.eventTitle.localeCompare(b.eventTitle));
  }, [dashQuery.data, proposalsQuery.data]);

  return {
    links,
    isLoading: dashQuery.isLoading || proposalsQuery.isLoading,
    isError: dashQuery.isError || proposalsQuery.isError,
    error: dashQuery.error ?? proposalsQuery.error,
    refetch: () => {
      void dashQuery.refetch();
      void proposalsQuery.refetch();
    },
  };
}
