import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import type {
  CreateReferralLinkBody,
  CreateReferralLinkResponse,
  ReferralLinkSummary,
  ReferralCommission,
  AssignReferralsBody,
} from '@yo-te-invito/shared';
import { ErrorCode } from '@yo-te-invito/shared';

@Injectable()
export class ReferralsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    eventId: string,
    body: CreateReferralLinkBody,
  ): Promise<CreateReferralLinkResponse> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const existing = await this.prisma.referralLink.findUnique({
      where: { code: body.code },
    });

    if (existing) {
      throw new ConflictException({
        code: ErrorCode.CONFLICT,
        message: 'Referral code already exists',
      });
    }

    const link = await this.prisma.referralLink.create({
      data: {
        tenantId,
        eventId,
        code: body.code,
        referrerId: body.referrerId ?? null,
        label: body.label ?? null,
      },
    });

    const baseUrl = process.env.WEB_APP_URL ?? 'http://localhost:3000';
    const url = `${baseUrl}/r/${link.code}`;

    return {
      id: link.id,
      code: link.code,
      eventId: link.eventId,
      label: link.label,
      url,
    };
  }

  async list(
    tenantId: string,
    eventId: string,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });

    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const links = await this.prisma.referralLink.findMany({
      where: { eventId },
      include: {
        _count: { select: { attributions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        attributedOrdersCount: l._count.attributions,
        createdAt: l.createdAt.toISOString(),
        referrerId: l.referrerId ?? null,
      })),
    };
  }

  async assignReferrersToEvent(
    tenantId: string,
    eventId: string,
    body: AssignReferralsBody,
  ): Promise<{ links: ReferralLinkSummary[] }> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }

    const currentLinks = await this.prisma.referralLink.findMany({
      where: { eventId },
      select: { id: true, referrerId: true },
    });

    const currentReferrerIds = new Set(
      currentLinks.filter((l) => l.referrerId).map((l) => l.referrerId!),
    );
    const targetIds = new Set(body.referrerIds);

    const toAdd = [...targetIds].filter((id) => !currentReferrerIds.has(id));
    const toRemove = currentLinks.filter(
      (l) => l.referrerId && !targetIds.has(l.referrerId),
    );

    const usedCodes = new Set(
      (await this.prisma.referralLink.findMany({ select: { code: true } })).map(
        (l) => l.code,
      ),
    );

    for (const link of toRemove) {
      await this.prisma.referralLink.delete({ where: { id: link.id } });
    }

    for (const referrerId of toAdd) {
      const user = await this.prisma.user.findFirst({
        where: { id: referrerId, tenantId, role: 'REFERRER', deletedAt: null },
      });
      if (!user) continue;

      let code = `ref-${referrerId.slice(-6)}-${eventId.slice(-6)}`;
      let suffix = 0;
      while (usedCodes.has(code)) {
        code = `ref-${crypto.randomBytes(4).toString('hex')}`;
        suffix++;
        if (suffix > 10) break;
      }
      usedCodes.add(code);

      await this.prisma.referralLink.create({
        data: {
          tenantId,
          eventId,
          code,
          referrerId,
          label: `${user.firstName} ${user.lastName}`.trim() || user.email,
        },
      });
    }

    return this.list(tenantId, eventId);
  }

  async listReferrers(tenantId: string): Promise<
    Array<{ id: string; email: string; firstName: string; lastName: string }>
  > {
    const users = await this.prisma.user.findMany({
      where: { tenantId, role: 'REFERRER', deletedAt: null },
      select: { id: true, email: true, firstName: true, lastName: true },
      orderBy: { lastName: 'asc' },
    });
    return users;
  }

  async lookupByCode(code: string): Promise<{ eventId: string; tenantId: string } | null> {
    const link = await this.prisma.referralLink.findUnique({
      where: { code },
      select: { eventId: true, tenantId: true },
    });
    return link ? { eventId: link.eventId, tenantId: link.tenantId } : null;
  }

  async listByReferrer(tenantId: string, referrerId: string): Promise<{ links: (ReferralLinkSummary & { eventId?: string })[] }> {
    const links = await this.prisma.referralLink.findMany({
      where: { tenantId, referrerId },
      include: {
        _count: { select: { attributions: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return {
      links: links.map((l) => ({
        id: l.id,
        code: l.code,
        label: l.label,
        attributedOrdersCount: l._count.attributions,
        createdAt: l.createdAt.toISOString(),
        eventId: l.eventId,
      })),
    };
  }

  async listCommissionsByUser(referrerId: string): Promise<ReferralCommission[]> {
    const items = await this.prisma.referralCommission.findMany({
      where: { referrerId },
      orderBy: { requestedAt: 'desc' },
    });
    return items.map((c) => ({
      id: c.id,
      referrerId: c.referrerId,
      referralLinkId: c.referralLinkId,
      eventId: c.eventId,
      amountCents: c.amountCents,
      status: c.status,
      requestedAt: c.requestedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
      confirmedByUserId: c.confirmedByUserId,
    }));
  }

  async requestCommission(
    tenantId: string,
    referrerId: string,
    referralLinkId: string,
  ): Promise<ReferralCommission> {
    const link = await this.prisma.referralLink.findFirst({
      where: { id: referralLinkId, tenantId, referrerId },
      include: { _count: { select: { attributions: true } } },
    });
    if (!link) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Referral link not found or not yours',
      });
    }
    const amountCents = link._count.attributions * 5000; // demo: 50 per order
    if (amountCents <= 0) {
      throw new ConflictException({
        code: 'BAD_REQUEST',
        message: 'No attributed orders to claim',
      });
    }
    const existing = await this.prisma.referralCommission.findFirst({
      where: { referralLinkId },
    });
    if (existing) {
      if (existing.status === 'REQUESTED' || existing.status === 'PAID') {
        throw new ConflictException({
          code: ErrorCode.CONFLICT,
          message: 'Commission already requested or paid',
        });
      }
      const updated = await this.prisma.referralCommission.update({
        where: { id: existing.id },
        data: { status: 'REQUESTED', requestedAt: new Date(), amountCents },
      });
      return {
        id: updated.id,
        referrerId: updated.referrerId,
        referralLinkId: updated.referralLinkId,
        eventId: updated.eventId,
        amountCents: updated.amountCents,
        status: updated.status,
        requestedAt: updated.requestedAt?.toISOString() ?? null,
        paidAt: updated.paidAt?.toISOString() ?? null,
        confirmedByUserId: updated.confirmedByUserId,
      };
    }
    const created = await this.prisma.referralCommission.create({
      data: {
        tenantId,
        referrerId,
        referralLinkId,
        eventId: link.eventId,
        amountCents,
        status: 'REQUESTED',
        requestedAt: new Date(),
      },
    });
    return {
      id: created.id,
      referrerId: created.referrerId,
      referralLinkId: created.referralLinkId,
      eventId: created.eventId,
      amountCents: created.amountCents,
      status: created.status,
      requestedAt: created.requestedAt?.toISOString() ?? null,
      paidAt: created.paidAt?.toISOString() ?? null,
      confirmedByUserId: created.confirmedByUserId,
    };
  }

  async listCommissionRequestsForEvent(
    tenantId: string,
    eventId: string,
    userId: string,
    userRole: string,
  ): Promise<ReferralCommission[]> {
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
      select: { producerId: true },
    });
    if (!event) throw new NotFoundException({ code: ErrorCode.NOT_FOUND, message: 'Event not found' });
    const isAdmin = userRole === 'ADMIN';
    const isProducer = event.producerId === userId;
    if (!isAdmin && !isProducer) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: 'Not allowed' });
    }
    const items = await this.prisma.referralCommission.findMany({
      where: { eventId, status: 'REQUESTED' },
      orderBy: { requestedAt: 'asc' },
    });
    return items.map((c) => ({
      id: c.id,
      referrerId: c.referrerId,
      referralLinkId: c.referralLinkId,
      eventId: c.eventId,
      amountCents: c.amountCents,
      status: c.status,
      requestedAt: c.requestedAt?.toISOString() ?? null,
      paidAt: c.paidAt?.toISOString() ?? null,
      confirmedByUserId: c.confirmedByUserId,
    }));
  }

  async confirmCommissionPayout(
    tenantId: string,
    commissionId: string,
    adminUserId: string,
  ): Promise<ReferralCommission | null> {
    const commission = await this.prisma.referralCommission.findFirst({
      where: { id: commissionId, tenantId, status: 'REQUESTED' },
    });
    if (!commission) return null;
    const updated = await this.prisma.referralCommission.update({
      where: { id: commissionId },
      data: { status: 'PAID', paidAt: new Date(), confirmedByUserId: adminUserId },
    });
    return {
      id: updated.id,
      referrerId: updated.referrerId,
      referralLinkId: updated.referralLinkId,
      eventId: updated.eventId,
      amountCents: updated.amountCents,
      status: updated.status,
      requestedAt: updated.requestedAt?.toISOString() ?? null,
      paidAt: updated.paidAt?.toISOString() ?? null,
      confirmedByUserId: updated.confirmedByUserId,
    };
  }
}
