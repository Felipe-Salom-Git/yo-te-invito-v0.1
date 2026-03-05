import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateReferralLinkBody,
  CreateReferralLinkResponse,
  ReferralLinkSummary,
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
      })),
    };
  }

  async lookupByCode(code: string): Promise<{ eventId: string; tenantId: string } | null> {
    const link = await this.prisma.referralLink.findUnique({
      where: { code },
      select: { eventId: true, tenantId: true },
    });
    return link ? { eventId: link.eventId, tenantId: link.tenantId } : null;
  }
}
