import { Injectable } from '@nestjs/common';
import {
  buildGastroDiscountQrPayload,
  type MeGastroDiscountItem,
  type MeGastroDiscountsResponse,
  isGastroDiscountExpired,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';

const STATUS_ORDER: Record<string, number> = {
  ACTIVE: 0,
  USED: 1,
  EXPIRED: 2,
  CANCELLED: 3,
};

function effectiveStatus(
  status: string,
  expiresAt: Date | null,
  usedAt: Date | null,
  hasValidation: boolean,
): MeGastroDiscountItem['status'] {
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'USED' || usedAt || hasValidation) return 'USED';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (isGastroDiscountExpired(expiresAt)) return 'EXPIRED';
  return 'ACTIVE';
}

@Injectable()
export class MeGastroDiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(tenantId: string, userId: string): Promise<MeGastroDiscountsResponse> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId, deletedAt: null },
      select: { email: true },
    });
    if (!user) return { data: [] };

    const normalizedEmail = user.email.trim().toLowerCase();

    const claims = await this.prisma.gastroDiscountClaim.findMany({
      where: {
        tenantId,
        OR: [{ userId }, { email: normalizedEmail }],
      },
      include: {
        discount: {
          include: {
            gastroProfile: {
              select: {
                id: true,
                displayName: true,
                publicEventId: true,
              },
            },
            courtesyCampaign: {
              select: { title: true, discountLabel: true, validTo: true },
            },
          },
        },
        validations: { select: { validatedAt: true }, take: 1, orderBy: { validatedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: MeGastroDiscountItem[] = claims
      .filter((c) => c.discount.gastroProfile)
      .map((claim) => {
        const d = claim.discount;
        const profile = d.gastroProfile!;
        const campaign = d.courtesyCampaign;
        const usedAt =
          claim.usedAt ?? claim.validations[0]?.validatedAt ?? null;
        const expiresAt = claim.expiresAt ?? d.validTo ?? campaign?.validTo ?? null;
        const status = effectiveStatus(
          claim.status,
          expiresAt,
          usedAt,
          claim.validations.length > 0,
        );

        return {
          claimId: claim.id,
          accessToken: claim.accessToken,
          type: claim.type as MeGastroDiscountItem['type'],
          source: claim.source as MeGastroDiscountItem['source'],
          status,
          email: claim.email,
          qrPayload: buildGastroDiscountQrPayload(d.id, claim.qrToken),
          qrCode: claim.qrToken,
          discountTitle: campaign?.title ?? d.displayTitle,
          discountDescription: d.summary ?? d.detail,
          discountLabel: campaign?.discountLabel ?? null,
          locationId: profile.id,
          locationName: profile.displayName,
          locationSlug: profile.publicEventId,
          validTo: expiresAt?.toISOString() ?? null,
          usedAt: usedAt?.toISOString() ?? null,
          createdAt: claim.createdAt.toISOString(),
          emailSentAt: claim.emailSentAt?.toISOString() ?? null,
        };
      });

    items.sort((a, b) => {
      const sa = STATUS_ORDER[a.status] ?? 9;
      const sb = STATUS_ORDER[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      const ta = a.validTo ? new Date(a.validTo).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.validTo ? new Date(b.validTo).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

    return { data: items };
  }
}
