'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { referrerCommissionKeys } from '@/lib/query/keys';
import type { ReferralCommission } from '@/repositories/interfaces';

export type ReferrerCommissionSummary = {
  ticketsSoldViaLinks: number;
  attributedGrossCents: number;
  generatedCommissionCents: number;
  amountToRequestCents: number;
  pendingRequestsCount: number;
  markedPaidCents: number;
  v2Commissions: ReferralCommission[];
  legacyCommissions: ReferralCommission[];
  byLink: Array<{
    referralLinkId: string;
    eventId: string;
    generatedCents: number;
    requestableCents: number;
    hasOpenRequest: boolean;
  }>;
};

function isV2Commission(c: ReferralCommission): boolean {
  return c.referralAttributionId != null && c.referralAttributionId !== '';
}

export function useReferrerCommissionSummary(referrerUserId: string | null, enabled = true) {
  const repos = useRepositories();

  const dashQuery = useQuery({
    queryKey: ['referrer', 'dashboard'],
    queryFn: () => repos.profiles.getReferrerDashboard(),
    enabled,
  });

  const commissionsQuery = useQuery({
    queryKey: referrerCommissionKeys.list(referrerUserId ?? ''),
    queryFn: () => repos.referrals.listCommissionsByUser(referrerUserId!),
    enabled: enabled && !!referrerUserId,
  });

  const summary = useMemo((): ReferrerCommissionSummary | null => {
    const m = dashQuery.data?.metrics;
    const rows = commissionsQuery.data ?? [];
    if (!m && commissionsQuery.isLoading) return null;

    const v2 = rows.filter(isV2Commission);
    const legacy = rows.filter((c) => !isV2Commission(c));

    const generatedCommissionCents = v2
      .filter((c) => c.status === 'CONFIRMED')
      .reduce((s, c) => s + c.amountCents, 0);

    const pendingRequestsCount = rows.filter((c) => c.status === 'REQUESTED').length;

    const markedPaidCents = rows
      .filter((c) => c.status === 'MARKED_AS_PAID' || c.status === 'PAID')
      .reduce((s, c) => s + c.amountCents, 0);

    const amountToRequestCents = generatedCommissionCents;

    const linkMap = new Map<
      string,
      { referralLinkId: string; eventId: string; generatedCents: number; hasOpenRequest: boolean }
    >();
    for (const c of v2) {
      const cur = linkMap.get(c.referralLinkId) ?? {
        referralLinkId: c.referralLinkId,
        eventId: c.eventId,
        generatedCents: 0,
        hasOpenRequest: false,
      };
      if (c.status === 'CONFIRMED') cur.generatedCents += c.amountCents;
      linkMap.set(c.referralLinkId, cur);
    }
    for (const c of legacy) {
      const cur = linkMap.get(c.referralLinkId) ?? {
        referralLinkId: c.referralLinkId,
        eventId: c.eventId,
        generatedCents: 0,
        hasOpenRequest: false,
      };
      if (c.status === 'REQUESTED' || c.status === 'PAID') cur.hasOpenRequest = true;
      linkMap.set(c.referralLinkId, cur);
    }

    const byLink = Array.from(linkMap.values()).map((l) => ({
      ...l,
      requestableCents: l.generatedCents,
      hasOpenRequest: l.hasOpenRequest,
    }));

    return {
      ticketsSoldViaLinks: m?.ticketsSoldViaPaidReferralsCount ?? 0,
      attributedGrossCents: m?.grossRevenueFromPaidReferralsCents ?? 0,
      generatedCommissionCents,
      amountToRequestCents,
      pendingRequestsCount,
      markedPaidCents,
      v2Commissions: v2,
      legacyCommissions: legacy,
      byLink,
    };
  }, [dashQuery.data, commissionsQuery.data, commissionsQuery.isLoading]);

  return {
    summary,
    isLoading: dashQuery.isLoading || commissionsQuery.isLoading,
    isError: dashQuery.isError || commissionsQuery.isError,
    error: dashQuery.error ?? commissionsQuery.error,
    refetch: () => {
      void dashQuery.refetch();
      void commissionsQuery.refetch();
    },
  };
}

export function useRequestReferrerCommissionPayment(referrerUserId: string | null) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (referralLinkId: string) => {
      if (!referrerUserId) throw new Error('Sesión requerida');
      return repos.referrals.requestCommission(referrerUserId, referralLinkId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: referrerCommissionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
    },
  });
}
