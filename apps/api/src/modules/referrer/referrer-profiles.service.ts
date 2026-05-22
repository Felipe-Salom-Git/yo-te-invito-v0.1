import { Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { ReferrerProfilePatchInput } from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';
import { ReferrerIdentityService } from './referrer-identity.service';
import { referralCheckoutUrl } from '../../common/referral-checkout-url';

function newAssociationToken(): string {
  return `rt_${crypto.randomBytes(16).toString('hex')}`;
}

function sumOrderTicketQuantities(order: { orderItems: { quantity: number }[] }): number {
  return order.orderItems.reduce((s, it) => s + it.quantity, 0);
}

function orderTotalToCents(totalAmount: { toString(): string }): number {
  const n = Number(totalAmount);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

@Injectable()
export class ReferrerProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly identity: ReferrerIdentityService,
  ) {}

  async getOwnedProfileOrThrow(tenantId: string, userId: string) {
    const membership = await this.prisma.userReferrerMembership.findFirst({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: 'ACTIVE' },
      },
      include: { profile: true },
    });
    if (!membership) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'No referrer profile',
      });
    }
    return membership.profile;
  }

  async getMyProfile(tenantId: string, userId: string) {
    return this.getOwnedProfileOrThrow(tenantId, userId);
  }

  async updateMyProfile(
    tenantId: string,
    userId: string,
    patch: ReferrerProfilePatchInput,
  ) {
    const profile = await this.getOwnedProfileOrThrow(tenantId, userId);
    const data: Record<string, unknown> = {};

    if (patch.displayName !== undefined) data.displayName = patch.displayName;
    if (patch.publicHandle !== undefined) {
      if (patch.publicHandle === null) {
        data.publicHandle = null;
      } else {
        const raw = patch.publicHandle.replace(/^@/, '').toLowerCase();
        data.publicHandle = await this.identity.ensureUniquePublicHandle(
          tenantId,
          raw,
          profile.id,
        );
      }
    }
    if (patch.bio !== undefined) data.bio = patch.bio;
    if (patch.longBio !== undefined) data.longBio = patch.longBio;
    if (patch.avatarUrl !== undefined) data.avatarUrl = patch.avatarUrl;
    if (patch.coverImageUrl !== undefined) data.coverImageUrl = patch.coverImageUrl;
    if (patch.city !== undefined) data.city = patch.city;
    if (patch.region !== undefined) data.region = patch.region;
    if (patch.publicVisibility !== undefined) {
      data.publicVisibility = patch.publicVisibility;
    }

    if (patch.slug !== undefined) {
      if (patch.slug === null) {
        data.slug = null;
      } else {
        data.slug = await this.identity.ensureUniqueSlug(tenantId, patch.slug, profile.id);
      }
    }

    return this.prisma.referrerProfile.update({
      where: { id: profile.id },
      data: data as object,
    });
  }

  async getDashboardSummary(tenantId: string, userId: string) {
    const profile = await this.getOwnedProfileOrThrow(tenantId, userId);

    const [
      saleLinkRows,
      assignmentRows,
      activeRelCount,
      pendingRelCount,
      paidCommissions,
      pendingCommissionAgg,
    ] = await Promise.all([
      this.prisma.referralLink.findMany({
        where: {
          tenantId,
          OR: [{ referrerProfileId: profile.id }, { referrerId: userId }],
        },
        include: {
          event: { select: { id: true, title: true, status: true } },
          _count: { select: { attributions: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.eventReferrerAssignment.findMany({
        where: { referrerProfileId: profile.id, status: 'ACTIVE' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startAt: true,
              city: true,
              venueName: true,
              status: true,
            },
          },
          referralLink: { select: { id: true, code: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.producerReferrerRelationship.count({
        where: { referrerProfileId: profile.id, status: 'ACTIVE' },
      }),
      this.prisma.producerReferrerRelationship.count({
        where: { referrerProfileId: profile.id, status: 'PENDING' },
      }),
      this.prisma.referralCommission.aggregate({
        where: {
          referrerId: userId,
          status: { in: ['PAID', 'MARKED_AS_PAID'] },
        },
        _sum: { amountCents: true },
      }),
      this.prisma.referralCommission.aggregate({
        where: {
          referrerId: userId,
          status: { in: ['CONFIRMED', 'PENDING', 'REQUESTED'] },
        },
        _sum: { amountCents: true },
      }),
    ]);

    const linkIds = saleLinkRows.map((l) => l.id);
    let attributedOrdersTotalCount = 0;
    let paidAttributedOrdersCount = 0;
    let ticketsSoldViaPaidReferrals = 0;
    let grossRevenueFromPaidReferralsCents = 0;
    const perfByEventId = new Map<string, { paidOrders: number; tickets: number; cents: number }>();
    const perfByLinkId = new Map<string, { paidOrders: number; tickets: number; cents: number }>();

    if (linkIds.length > 0) {
      attributedOrdersTotalCount = await this.prisma.referralAttribution.count({
        where: { referralLinkId: { in: linkIds } },
      });

      const attributions = await this.prisma.referralAttribution.findMany({
        where: { referralLinkId: { in: linkIds } },
        select: { orderId: true, eventId: true, referralLinkId: true },
      });

      const orderIds = [...new Set(attributions.map((a) => a.orderId))];
      if (orderIds.length > 0) {
        const orders = await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            orderItems: { select: { quantity: true } },
          },
        });
        const orderMap = new Map(orders.map((o) => [o.id, o]));

        for (const attr of attributions) {
          const order = orderMap.get(attr.orderId);
          if (!order || order.status !== 'PAID') continue;
          paidAttributedOrdersCount++;
          const qty = sumOrderTicketQuantities(order);
          ticketsSoldViaPaidReferrals += qty;
          const cents = orderTotalToCents(order.totalAmount);
          grossRevenueFromPaidReferralsCents += cents;

          const ev = perfByEventId.get(attr.eventId) ?? { paidOrders: 0, tickets: 0, cents: 0 };
          ev.paidOrders++;
          ev.tickets += qty;
          ev.cents += cents;
          perfByEventId.set(attr.eventId, ev);

          const lk = perfByLinkId.get(attr.referralLinkId) ?? { paidOrders: 0, tickets: 0, cents: 0 };
          lk.paidOrders++;
          lk.tickets += qty;
          lk.cents += cents;
          perfByLinkId.set(attr.referralLinkId, lk);
        }
      }
    }

    const saleLinks = saleLinkRows.map((row) => {
      const p = perfByLinkId.get(row.id) ?? { paidOrders: 0, tickets: 0, cents: 0 };
      return {
        id: row.id,
        code: row.code,
        url: referralCheckoutUrl(row.eventId, tenantId, row.code),
        eventId: row.eventId,
        eventTitle: row.event.title,
        eventStatus: row.event.status,
        attributedOrdersTotalCount: row._count.attributions,
        paidAttributedOrdersCount: p.paidOrders,
        ticketsSoldCount: p.tickets,
        grossRevenueFromReferralsCents: p.cents,
      };
    });

    const assignedEvents = assignmentRows.map((a) => {
      const perf = perfByEventId.get(a.event.id) ?? { paidOrders: 0, tickets: 0, cents: 0 };
      return {
        eventId: a.event.id,
        title: a.event.title,
        startAt: a.event.startAt.toISOString(),
        city: a.event.city,
        venueName: a.event.venueName,
        eventStatus: a.event.status,
        assignmentStatus: a.status,
        referralCode: a.referralLink?.code ?? null,
        referralLinkId: a.referralLink?.id ?? null,
        courtesyQuota: a.courtesyQuota,
        courtesyUsedCount: a.courtesyUsedCount,
        paidAttributedOrdersCount: perf.paidOrders,
        ticketsSoldCount: perf.tickets,
        grossRevenueFromReferralsCents: perf.cents,
      };
    });

    return {
      profile: {
        id: profile.id,
        displayName: profile.displayName,
        slug: profile.slug,
        publicHandle: profile.publicHandle,
        publicProfilePath: profile.slug ? `/referrers/${profile.slug}` : null,
        status: profile.status,
        publicVisibility: profile.publicVisibility,
        bio: profile.bio,
        avatarUrl: profile.avatarUrl,
        coverImageUrl: profile.coverImageUrl,
        city: profile.city,
        region: profile.region,
        associationLinkToken: profile.associationLinkToken,
        salesScore: profile.salesScore,
        completedSales: profile.completedSales,
      },
      metrics: {
        salesScore: profile.salesScore,
        completedSales: profile.completedSales,
        /** Todas las atribuciones (cualquier estado de pago del pedido) */
        attributedOrdersCount: attributedOrdersTotalCount,
        /** Solo pedidos PAID atribuidos a tus links */
        paidAttributedOrdersCount,
        ticketsSoldViaPaidReferralsCount: ticketsSoldViaPaidReferrals,
        grossRevenueFromPaidReferralsCents,
        commissionsPaidCents: paidCommissions._sum.amountCents ?? 0,
        commissionsOutstandingCents: pendingCommissionAgg._sum.amountCents ?? 0,
        /** Igual a activas + pendientes; preferí los contadores explícitos en UI nueva */
        associatedProducersCount: activeRelCount + pendingRelCount,
        activeProducerRelationshipsCount: activeRelCount,
        pendingProducerRelationshipsCount: pendingRelCount,
        assignedEventsCount: assignmentRows.length,
        activeEventReferralLinksCount: saleLinkRows.length,
        /** Sin pipeline de ingresos netos aún; usar grossRevenueFromPaidReferralsCents para bruto referido */
        totalRevenueGenerated: null as null,
        assignedEvents,
        saleLinks,
      },
    };
  }

  async listPublicReferrers(tenantId: string, page: number, limit: number) {
    const where = {
      tenantId,
      status: 'ACTIVE' as const,
      publicVisibility: true,
    };

    const [total, rows] = await Promise.all([
      this.prisma.referrerProfile.count({ where }),
      this.prisma.referrerProfile.findMany({
        where,
        orderBy: [{ salesScore: 'desc' }, { completedSales: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          displayName: true,
          slug: true,
          bio: true,
          avatarUrl: true,
          city: true,
          region: true,
          salesScore: true,
          completedSales: true,
        },
      }),
    ]);

    return {
      referrers: rows,
      total,
      page,
      limit,
    };
  }

  async getPublicBySlug(tenantId: string, slug: string) {
    const profile = await this.prisma.referrerProfile.findFirst({
      where: {
        tenantId,
        slug,
        status: 'ACTIVE',
        publicVisibility: true,
      },
      select: {
        id: true,
        displayName: true,
        slug: true,
        bio: true,
        longBio: true,
        avatarUrl: true,
        coverImageUrl: true,
        city: true,
        region: true,
        salesScore: true,
        completedSales: true,
      },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referrer not found',
      });
    }
    return profile;
  }

  async resolveAssociationTarget(tenantId: string, token: string) {
    const profile = await this.prisma.referrerProfile.findFirst({
      where: {
        tenantId,
        associationLinkToken: token,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        slug: true,
        salesScore: true,
        completedSales: true,
        city: true,
        region: true,
      },
    });
    if (!profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Invalid association link',
      });
    }
    return { referrerProfile: profile };
  }

  newToken(): string {
    return newAssociationToken();
  }
}
