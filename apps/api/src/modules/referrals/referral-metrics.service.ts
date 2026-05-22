import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { referralCheckoutUrl } from '../../common/referral-checkout-url';
import {
  ErrorCode,
  type ProducerEventReferralMetricsResponse,
  type ProducerReferralMetricsResponse,
  type ReferralPaymentRequestStatus,
  type ReferrerAgreementMetricsResponse,
  type ReferrerReferralMetricsByAgreement,
  type ReferrerReferralMetricsResponse,
} from '@yo-te-invito/shared';
import {
  aggregatePaidAttributions,
  emptyPerf,
  sumCommissionCents,
  sumPerf,
  type CommissionRow,
  type ReferralPerfBucket,
} from './referral-metrics.util';

const OPEN_PAYMENT_STATUSES = ['REQUESTED', 'IN_REVIEW'] as const;
const GENERATED_STATUSES = ['CONFIRMED'] as const;
const MARKED_PAID_STATUSES = ['MARKED_AS_PAID', 'PAID'] as const;

@Injectable()
export class ReferralMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProducerMetrics(
    tenantId: string,
    producerProfileId: string,
  ): Promise<ProducerReferralMetricsResponse> {
    const eventRows = await this.prisma.event.findMany({
      where: { tenantId, producerProfileId, deletedAt: null },
      select: { id: true, title: true, status: true },
    });
    const eventIds = eventRows.map((e) => e.id);

    const [
      activeReferrersCount,
      pendingProposalsCount,
      activeLinksCount,
      perfCtx,
      commissions,
      paymentStats,
      referrerProfiles,
      agreements,
    ] = await Promise.all([
      this.prisma.producerReferrerRelationship.count({
        where: { producerProfileId, status: 'ACTIVE', producerProfile: { tenantId } },
      }),
      this.prisma.referralCommercialProposal.count({
        where: { tenantId, producerProfileId, status: 'PENDING' },
      }),
      this.countActiveLinksForProducer(tenantId, producerProfileId, eventIds),
      this.loadAttributionPerfForProducer(tenantId, producerProfileId, eventIds),
      this.loadV2Commissions({ tenantId, producerProfileId }),
      this.loadPaymentRequestStats({ tenantId, producerProfileId }),
      this.prisma.referrerProfile.findMany({
        where: {
          producerRelationships: { some: { producerProfileId, status: 'ACTIVE' } },
          tenantId,
        },
        select: { id: true, displayName: true, publicHandle: true },
      }),
      this.prisma.referralCommercialAgreement.findMany({
        where: { tenantId, producerProfileId, status: 'ACTIVE' },
        select: { referrerProfileId: true, eventId: true },
      }),
    ]);

    const blockedIds = await this.openPaymentCommissionIds(tenantId, { producerProfileId });
    const global = this.buildProducerGlobal(
      {
        activeReferrersCount,
        pendingProposalsCount,
        activeLinksCount,
        perf: perfCtx.total,
        commissions,
        blockedIds,
        paymentStats,
      },
    );

    const byReferrer = this.buildProducerByReferrer(
      referrerProfiles,
      agreements,
      perfCtx,
      commissions,
      blockedIds,
      paymentStats.byReferrerPending,
    );

    const byEvent = eventRows.map((ev) => {
      const perf = perfCtx.byEventId.get(ev.id) ?? emptyPerf();
      const eventCommissions = commissions.filter((c) => c.eventId === ev.id);
      const linkCount = perfCtx.eventLinkCounts.get(ev.id) ?? 0;
      const referrerIds = new Set(
        agreements.filter((a) => a.eventId === ev.id).map((a) => a.referrerProfileId),
      );
      return {
        eventId: ev.id,
        eventTitle: ev.title,
        eventStatus: ev.status,
        activeLinksCount: linkCount,
        participatingReferrersCount: referrerIds.size,
        ticketsSoldCount: perf.ticketsSoldCount,
        attributedGrossCents: perf.attributedGrossCents,
        commissionGeneratedCents: sumCommissionCents(eventCommissions, (c) =>
          GENERATED_STATUSES.includes(c.status as 'CONFIRMED'),
        ),
      };
    });

    return { global, byReferrer, byEvent };
  }

  async getProducerEventMetrics(
    tenantId: string,
    producerProfileId: string,
    eventId: string,
  ): Promise<ProducerEventReferralMetricsResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, producerProfileId, deletedAt: null },
      select: { id: true, title: true },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.EVENT_NOT_FOUND,
        message: 'Evento no encontrado',
      });
    }

    const [
      pendingProposalsCount,
      activeLinksCount,
      perfCtx,
      commissions,
      paymentStats,
      agreements,
      assignments,
    ] = await Promise.all([
      this.prisma.referralCommercialProposal.count({
        where: { tenantId, producerProfileId, eventId, status: 'PENDING' },
      }),
      this.prisma.referralLink.count({
        where: {
          tenantId,
          eventId,
          OR: [
            { commercialAgreement: { producerProfileId, status: 'ACTIVE' } },
            {
              eventAssignment: { eventId, status: 'ACTIVE', referrerProfile: { tenantId } },
            },
          ],
        },
      }),
      this.loadAttributionPerfForProducer(tenantId, producerProfileId, [eventId]),
      this.loadV2Commissions({ tenantId, producerProfileId, eventId }),
      this.loadPaymentRequestStats({ tenantId, producerProfileId, eventId }),
      this.prisma.referralCommercialAgreement.findMany({
        where: { tenantId, producerProfileId, eventId, status: 'ACTIVE' },
        select: { referrerProfileId: true },
      }),
      this.prisma.eventReferrerAssignment.findMany({
        where: { eventId, status: 'ACTIVE' },
        include: {
          referrerProfile: {
            select: { id: true, displayName: true, publicHandle: true },
          },
        },
      }),
    ]);

    const referrerIds = new Set([
      ...agreements.map((a) => a.referrerProfileId),
      ...assignments.map((a) => a.referrerProfileId),
    ]);

    const blockedIds = await this.openPaymentCommissionIds(tenantId, { producerProfileId });
    const global = this.buildProducerGlobal({
      activeReferrersCount: referrerIds.size,
      pendingProposalsCount,
      activeLinksCount,
      perf: perfCtx.total,
      commissions,
      blockedIds,
      paymentStats,
    });

    const referrerProfiles = assignments.map((a) => a.referrerProfile);
    const uniqueReferrers = new Map(referrerProfiles.map((r) => [r.id, r]));

    const byReferrer = this.buildProducerByReferrer(
      [...uniqueReferrers.values()],
      agreements.map((a) => ({ referrerProfileId: a.referrerProfileId, eventId })),
      perfCtx,
      commissions,
      blockedIds,
      paymentStats.byReferrerPending,
    );

    return {
      eventId: event.id,
      eventTitle: event.title,
      global,
      byReferrer,
    };
  }

  async getReferrerMetrics(
    tenantId: string,
    referrerProfileId: string,
  ): Promise<ReferrerReferralMetricsResponse> {
    const byAgreement = await this.buildReferrerByAgreements(tenantId, referrerProfileId);
    const blockedIds = await this.openPaymentCommissionIds(tenantId, { referrerProfileId });
    const commissions = await this.loadV2Commissions({ tenantId, referrerProfileId });
    const perfCtx = await this.loadAttributionPerfForReferrer(tenantId, referrerProfileId);

    const [
      pendingProposalsCount,
      activeAgreementsCount,
      activeLinksCount,
      paymentStats,
    ] = await Promise.all([
      this.prisma.referralCommercialProposal.count({
        where: { tenantId, referrerProfileId, status: 'PENDING' },
      }),
      this.prisma.referralCommercialAgreement.count({
        where: { tenantId, referrerProfileId, status: 'ACTIVE' },
      }),
      this.prisma.referralLink.count({
        where: {
          tenantId,
          referrerProfileId,
          commercialAgreement: { status: 'ACTIVE' },
        },
      }),
      this.loadPaymentRequestStats({ tenantId, referrerProfileId }),
    ]);

    const global = {
      pendingProposalsCount,
      activeAgreementsCount,
      activeLinksCount,
      ticketsSoldCount: perfCtx.total.ticketsSoldCount,
      attributedGrossCents: perfCtx.total.attributedGrossCents,
      commissionGeneratedCents: sumCommissionCents(commissions, (c) =>
        GENERATED_STATUSES.includes(c.status as 'CONFIRMED'),
      ),
      commissionPendingToRequestCents: sumCommissionCents(
        commissions,
        (c) =>
          GENERATED_STATUSES.includes(c.status as 'CONFIRMED') && !blockedIds.has(c.id),
      ),
      paymentRequestsInReviewCount: paymentStats.inReviewCount,
      paymentRequestsPendingCount: paymentStats.pendingCount,
      markedPaidByProducerCents: sumCommissionCents(commissions, (c) =>
        MARKED_PAID_STATUSES.includes(c.status as 'MARKED_AS_PAID'),
      ),
    };

    return { global, byAgreement };
  }

  async getReferrerAgreementMetrics(
    tenantId: string,
    referrerProfileId: string,
    agreementId: string,
  ): Promise<ReferrerAgreementMetricsResponse> {
    const rows = await this.buildReferrerByAgreements(tenantId, referrerProfileId, agreementId);
    const agreement = rows[0];
    if (!agreement) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Acuerdo no encontrado',
      });
    }
    return { agreement };
  }

  private async buildReferrerByAgreements(
    tenantId: string,
    referrerProfileId: string,
    agreementId?: string,
  ): Promise<ReferrerReferralMetricsByAgreement[]> {
    const agreements = await this.prisma.referralCommercialAgreement.findMany({
      where: {
        tenantId,
        referrerProfileId,
        ...(agreementId ? { id: agreementId } : {}),
      },
      include: {
        producerProfile: { select: { id: true, displayName: true } },
        event: { select: { id: true, title: true } },
        referralLink: { select: { id: true, code: true } },
      },
      orderBy: { acceptedAt: 'desc' },
    });

    if (agreements.length === 0) return [];

    const linkIds = agreements.map((a) => a.referralLinkId);
    const perfCtx = await this.loadAttributionPerfForLinks(tenantId, linkIds, referrerProfileId);
    const commissions = await this.loadV2Commissions({ tenantId, referrerProfileId });
    const blockedIds = await this.openPaymentCommissionIds(tenantId, { referrerProfileId });

    const paymentStatusByAgreement = await this.paymentStatusByAgreement(
      tenantId,
      referrerProfileId,
      agreements.map((a) => a.id),
    );

    return agreements.map((a) => {
      const perf = perfCtx.byLinkId.get(a.referralLinkId) ?? emptyPerf();
      const agreementCommissions = commissions.filter((c) => c.agreementId === a.id);
      const generated = sumCommissionCents(agreementCommissions, (c) =>
        GENERATED_STATUSES.includes(c.status as 'CONFIRMED'),
      );
      const pendingToRequest = sumCommissionCents(
        agreementCommissions,
        (c) =>
          GENERATED_STATUSES.includes(c.status as 'CONFIRMED') && !blockedIds.has(c.id),
      );
      return {
        agreementId: a.id,
        producerProfileId: a.producerProfileId,
        producerDisplayName: a.producerProfile.displayName,
        eventId: a.eventId,
        eventTitle: a.event.title,
        referralLinkId: a.referralLinkId,
        referralCode: a.referralLink.code,
        referralUrl: referralCheckoutUrl(a.eventId, tenantId, a.referralLink.code),
        commissionType: a.commissionType,
        commissionValue: Number(a.commissionValue),
        agreementStatus: a.status,
        ticketsSoldCount: perf.ticketsSoldCount,
        attributedGrossCents: perf.attributedGrossCents,
        commissionGeneratedCents: generated,
        commissionPendingToRequestCents: pendingToRequest,
        paymentRequestStatus: (paymentStatusByAgreement.get(a.id) ??
          null) as ReferralPaymentRequestStatus | null,
      };
    });
  }

  private buildProducerGlobal(args: {
    activeReferrersCount: number;
    pendingProposalsCount: number;
    activeLinksCount: number;
    perf: ReferralPerfBucket;
    commissions: CommissionRow[];
    blockedIds: Set<string>;
    paymentStats: Awaited<ReturnType<ReferralMetricsService['loadPaymentRequestStats']>>;
  }) {
    const { commissions, blockedIds, paymentStats, perf } = args;
    return {
      activeReferrersCount: args.activeReferrersCount,
      pendingProposalsCount: args.pendingProposalsCount,
      activeLinksCount: args.activeLinksCount,
      ticketsSoldCount: perf.ticketsSoldCount,
      attributedGrossCents: perf.attributedGrossCents,
      commissionGeneratedCents: sumCommissionCents(commissions, (c) =>
        GENERATED_STATUSES.includes(c.status as 'CONFIRMED'),
      ),
      commissionPendingToRequestCents: sumCommissionCents(
        commissions,
        (c) =>
          GENERATED_STATUSES.includes(c.status as 'CONFIRMED') && !blockedIds.has(c.id),
      ),
      paymentRequestsPendingCount: paymentStats.pendingCount + paymentStats.inReviewCount,
      paymentRequestsMarkedPaidCount: paymentStats.markedPaidCount,
      paymentRequestsMarkedPaidCents: paymentStats.markedPaidCents,
    };
  }

  private buildProducerByReferrer(
    referrerProfiles: Array<{ id: string; displayName: string; publicHandle: string | null }>,
    agreements: Array<{ referrerProfileId: string; eventId: string }>,
    perfCtx: Awaited<ReturnType<ReferralMetricsService['loadAttributionPerfForProducer']>>,
    commissions: CommissionRow[],
    blockedIds: Set<string>,
    pendingByReferrer: Map<string, number>,
  ) {
    const eventsByReferrer = new Map<string, Set<string>>();
    for (const a of agreements) {
      const set = eventsByReferrer.get(a.referrerProfileId) ?? new Set();
      set.add(a.eventId);
      eventsByReferrer.set(a.referrerProfileId, set);
    }

    return referrerProfiles.map((ref) => {
      const perf = perfCtx.byReferrerProfileId.get(ref.id) ?? emptyPerf();
      const refCommissions = commissions.filter((c) => c.referrerProfileId === ref.id);
      return {
        referrerProfileId: ref.id,
        displayName: ref.displayName,
        publicHandle: ref.publicHandle,
        eventsPromotedCount: eventsByReferrer.get(ref.id)?.size ?? 0,
        ticketsSoldCount: perf.ticketsSoldCount,
        attributedGrossCents: perf.attributedGrossCents,
        commissionGeneratedCents: sumCommissionCents(refCommissions, (c) =>
          GENERATED_STATUSES.includes(c.status as 'CONFIRMED'),
        ),
        commissionPendingToRequestCents: sumCommissionCents(
          refCommissions,
          (c) =>
            GENERATED_STATUSES.includes(c.status as 'CONFIRMED') && !blockedIds.has(c.id),
        ),
        pendingPaymentRequestsCount: pendingByReferrer.get(ref.id) ?? 0,
        lastActivityAt: null,
      };
    });
  }

  private async countActiveLinksForProducer(
    tenantId: string,
    producerProfileId: string,
    eventIds: string[],
  ): Promise<number> {
    if (eventIds.length === 0) return 0;
    return this.prisma.referralLink.count({
      where: {
        tenantId,
        eventId: { in: eventIds },
        commercialAgreement: { producerProfileId, status: 'ACTIVE' },
      },
    });
  }

  private async loadAttributionPerfForProducer(
    tenantId: string,
    producerProfileId: string,
    eventIds: string[],
  ) {
    if (eventIds.length === 0) {
      return {
        total: emptyPerf(),
        byLinkId: new Map<string, ReferralPerfBucket>(),
        byEventId: new Map<string, ReferralPerfBucket>(),
        byReferrerProfileId: new Map<string, ReferralPerfBucket>(),
        eventLinkCounts: new Map<string, number>(),
      };
    }

    const links = await this.prisma.referralLink.findMany({
      where: { tenantId, eventId: { in: eventIds } },
      select: { id: true, eventId: true, referrerProfileId: true },
    });
    const linkIds = links.map((l) => l.id);
    const eventLinkCounts = new Map<string, number>();
    for (const l of links) {
      if (l.referrerProfileId && l.eventId) {
        eventLinkCounts.set(l.eventId, (eventLinkCounts.get(l.eventId) ?? 0) + 1);
      }
    }

    const perf = await this.loadAttributionPerfForLinks(
      tenantId,
      linkIds,
      undefined,
      links.reduce(
        (m, l) => {
          if (l.referrerProfileId) m.set(l.id, l.referrerProfileId);
          return m;
        },
        new Map<string, string>(),
      ),
    );

    return { ...perf, eventLinkCounts };
  }

  private async loadAttributionPerfForReferrer(tenantId: string, referrerProfileId: string) {
    const links = await this.prisma.referralLink.findMany({
      where: { tenantId, referrerProfileId },
      select: { id: true, eventId: true, referrerProfileId: true },
    });
    const linkIds = links.map((l) => l.id);
    return this.loadAttributionPerfForLinks(tenantId, linkIds, referrerProfileId);
  }

  private async loadAttributionPerfForLinks(
    tenantId: string,
    linkIds: string[],
    referrerProfileId?: string,
    linkToReferrerPrefill?: Map<string, string>,
  ) {
    if (linkIds.length === 0) {
      return {
        total: emptyPerf(),
        byLinkId: new Map<string, ReferralPerfBucket>(),
        byEventId: new Map<string, ReferralPerfBucket>(),
        byReferrerProfileId: new Map<string, ReferralPerfBucket>(),
      };
    }

    const attributions = await this.prisma.referralAttribution.findMany({
      where: { tenantId, referralLinkId: { in: linkIds } },
      select: { orderId: true, referralLinkId: true, eventId: true },
    });

    const orderIds = [...new Set(attributions.map((a) => a.orderId))];
    const orders =
      orderIds.length > 0
        ? await this.prisma.order.findMany({
            where: { id: { in: orderIds } },
            select: {
              id: true,
              status: true,
              totalAmount: true,
              orderItems: { select: { quantity: true } },
            },
          })
        : [];
    const orderMap = new Map(orders.map((o) => [o.id, o]));

    const linkToReferrer = linkToReferrerPrefill ?? new Map<string, string>();
    if (!linkToReferrerPrefill) {
      const linkRows = await this.prisma.referralLink.findMany({
        where: { id: { in: linkIds } },
        select: { id: true, referrerProfileId: true },
      });
      for (const l of linkRows) {
        if (l.referrerProfileId) linkToReferrer.set(l.id, l.referrerProfileId);
      }
    }
    if (referrerProfileId) {
      for (const lid of linkIds) linkToReferrer.set(lid, referrerProfileId);
    }

    return aggregatePaidAttributions(attributions, orderMap, linkToReferrer);
  }

  private async loadV2Commissions(where: {
    tenantId: string;
    producerProfileId?: string;
    referrerProfileId?: string;
    eventId?: string;
  }): Promise<CommissionRow[]> {
    const rows = await this.prisma.referralCommission.findMany({
      where: {
        tenantId: where.tenantId,
        referralAttributionId: { not: null },
        status: { not: 'CANCELLED' },
        ...(where.producerProfileId ? { producerProfileId: where.producerProfileId } : {}),
        ...(where.referrerProfileId ? { referrerProfileId: where.referrerProfileId } : {}),
        ...(where.eventId ? { eventId: where.eventId } : {}),
      },
      select: {
        id: true,
        amountCents: true,
        status: true,
        agreementId: true,
        referrerProfileId: true,
        producerProfileId: true,
        eventId: true,
        referralLinkId: true,
      },
    });
    return rows;
  }

  private async openPaymentCommissionIds(
    tenantId: string,
    scope: { producerProfileId?: string; referrerProfileId?: string },
  ): Promise<Set<string>> {
    const items = await this.prisma.referralPaymentRequestItem.findMany({
      where: {
        paymentRequest: {
          tenantId,
          status: { in: [...OPEN_PAYMENT_STATUSES] },
          ...(scope.producerProfileId ? { producerProfileId: scope.producerProfileId } : {}),
          ...(scope.referrerProfileId ? { referrerProfileId: scope.referrerProfileId } : {}),
        },
      },
      select: { commissionId: true },
    });
    return new Set(items.map((i) => i.commissionId));
  }

  private async loadPaymentRequestStats(scope: {
    tenantId: string;
    producerProfileId?: string;
    referrerProfileId?: string;
    eventId?: string;
  }) {
    const baseWhere = {
      tenantId: scope.tenantId,
      ...(scope.producerProfileId ? { producerProfileId: scope.producerProfileId } : {}),
      ...(scope.referrerProfileId ? { referrerProfileId: scope.referrerProfileId } : {}),
    };

    const requests = await this.prisma.referralPaymentRequest.findMany({
      where: baseWhere,
      select: {
        id: true,
        status: true,
        amountRequestedCents: true,
        referrerProfileId: true,
        items: {
          select: {
            commission: { select: { eventId: true } },
          },
        },
      },
    });

    const filtered = scope.eventId
      ? requests.filter((r) =>
          r.items.some((it) => it.commission.eventId === scope.eventId),
        )
      : requests;

    let pendingCount = 0;
    let inReviewCount = 0;
    let markedPaidCount = 0;
    let markedPaidCents = 0;
    const byReferrerPending = new Map<string, number>();

    for (const r of filtered) {
      if (r.status === 'REQUESTED') {
        pendingCount++;
        byReferrerPending.set(
          r.referrerProfileId,
          (byReferrerPending.get(r.referrerProfileId) ?? 0) + 1,
        );
      } else if (r.status === 'IN_REVIEW') {
        inReviewCount++;
        byReferrerPending.set(
          r.referrerProfileId,
          (byReferrerPending.get(r.referrerProfileId) ?? 0) + 1,
        );
      } else if (r.status === 'PAID') {
        markedPaidCount++;
        markedPaidCents += r.amountRequestedCents;
      }
    }

    return {
      pendingCount,
      inReviewCount,
      markedPaidCount,
      markedPaidCents,
      byReferrerPending,
    };
  }

  private async paymentStatusByAgreement(
    tenantId: string,
    referrerProfileId: string,
    agreementIds: string[],
  ): Promise<Map<string, ReferralPaymentRequestStatus | null>> {
    const result = new Map<string, ReferralPaymentRequestStatus | null>();
    if (agreementIds.length === 0) return result;

    const commissions = await this.prisma.referralCommission.findMany({
      where: { tenantId, referrerProfileId, agreementId: { in: agreementIds } },
      select: { id: true, agreementId: true },
    });
    const commissionToAgreement = new Map(
      commissions.map((c) => [c.id, c.agreementId!]),
    );
    const commissionIds = commissions.map((c) => c.id);
    if (commissionIds.length === 0) {
      for (const id of agreementIds) result.set(id, null);
      return result;
    }

    const items = await this.prisma.referralPaymentRequestItem.findMany({
      where: { commissionId: { in: commissionIds } },
      include: {
        paymentRequest: { select: { status: true, requestedAt: true } },
      },
      orderBy: { paymentRequest: { requestedAt: 'desc' } },
    });

    for (const agreementId of agreementIds) {
      result.set(agreementId, null);
    }

    for (const item of items) {
      const agreementId = commissionToAgreement.get(item.commissionId);
      if (!agreementId) continue;
      const st = item.paymentRequest.status;
      const current = result.get(agreementId);
      if (OPEN_PAYMENT_STATUSES.includes(st as 'REQUESTED')) {
        result.set(agreementId, st);
      } else if (current == null || !OPEN_PAYMENT_STATUSES.includes(current as 'REQUESTED')) {
        result.set(agreementId, st);
      }
    }

    return result;
  }

}
