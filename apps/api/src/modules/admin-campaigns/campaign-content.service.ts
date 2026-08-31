import { Injectable, BadRequestException } from '@nestjs/common';
import {
  ErrorCode,
  canonicalCampaignContentPath,
  formatCouponVisualBenefit,
  isGastroDiscountDateExpired,
  type AdminCampaignContentType,
} from '@yo-te-invito/shared';
import { PrismaService } from '../../prisma/prisma.service';
import { isEventPubliclyVisible } from '../../common/utils/event-public-visibility.util';
import { webAppBaseUrl } from '../../common/referral-checkout-url';

export type CampaignContentSnapshot = {
  contentType: AdminCampaignContentType;
  contentId: string;
  title: string;
  imageUrl: string | null;
  benefit: string | null;
  canonicalUrl: string;
};

function firstImage(imageUrls: unknown): string | null {
  if (!Array.isArray(imageUrls)) return null;
  const first = imageUrls.find((u) => typeof u === 'string' && u.startsWith('https://'));
  return typeof first === 'string' ? first : null;
}

@Injectable()
export class CampaignContentService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveEligible(
    tenantId: string,
    contentType: AdminCampaignContentType,
    contentId: string,
  ): Promise<CampaignContentSnapshot> {
    const canonicalUrl = `${webAppBaseUrl()}${canonicalCampaignContentPath(contentType, contentId)}`;

    if (contentType === 'GASTRO_DISCOUNT') {
      const row = await this.prisma.gastroDiscount.findFirst({
        where: {
          id: contentId,
          tenantId,
          archivedAt: null,
          visibility: 'PUBLIC',
          status: { in: ['ACTIVE', 'APPROVED'] },
          gastroProfile: { status: 'ACTIVE' },
        },
        select: {
          id: true,
          displayTitle: true,
          type: true,
          value: true,
          displayImageUrls: true,
          status: true,
          validityMode: true,
          validTo: true,
          discountDate: true,
        },
      });
      if (
        !row ||
        isGastroDiscountDateExpired({
          status: row.status,
          validityMode: row.validityMode,
          validTo: row.validTo,
          discountDate: row.discountDate,
        })
      ) {
        this.notEligible();
      }
      return {
        contentType,
        contentId: row.id,
        title: row.displayTitle?.trim() || 'Descuento',
        imageUrl: firstImage(row.displayImageUrls),
        benefit: formatCouponVisualBenefit(row.type, row.value),
        canonicalUrl,
      };
    }

    if (contentType === 'ACTIVITY_COUPON') {
      const row = await this.prisma.activityCoupon.findFirst({
        where: {
          id: contentId,
          tenantId,
          archivedAt: null,
          status: { in: ['ACTIVE', 'APPROVED'] },
          event: { category: 'excursion', deletedAt: null },
        },
        select: {
          id: true,
          title: true,
          type: true,
          value: true,
          imageUrls: true,
          status: true,
          validityMode: true,
          validTo: true,
          couponDate: true,
        },
      });
      if (
        !row ||
        isGastroDiscountDateExpired({
          status: row.status,
          validityMode: row.validityMode,
          validTo: row.validTo,
          discountDate: row.couponDate,
        })
      ) {
        this.notEligible();
      }
      return {
        contentType,
        contentId: row.id,
        title: row.title,
        imageUrl: firstImage(row.imageUrls),
        benefit: formatCouponVisualBenefit(row.type, row.value),
        canonicalUrl,
      };
    }

    const event = await this.prisma.event.findFirst({
      where: { id: contentId, tenantId, deletedAt: null, status: 'APPROVED' },
      select: { id: true, title: true, category: true, startAt: true, coverImageUrl: true },
    });
    if (!event) this.notEligible();

    if (contentType === 'EXCURSION') {
      if (event.category !== 'excursion') this.notEligible();
    } else if (event.category === 'excursion') {
      this.notEligible();
    }

    if (!isEventPubliclyVisible(event.startAt, event.category)) this.notEligible();

    return {
      contentType,
      contentId: event.id,
      title: event.title,
      imageUrl: event.coverImageUrl?.startsWith('https://') ? event.coverImageUrl : null,
      benefit: null,
      canonicalUrl,
    };
  }

  async listPicker(
    tenantId: string,
    contentType: AdminCampaignContentType,
    q?: string,
  ): Promise<Array<{ id: string; title: string; benefit: string | null }>> {
    const term = q?.trim();
    const take = 24;

    if (contentType === 'GASTRO_DISCOUNT') {
      const rows = await this.prisma.gastroDiscount.findMany({
        where: {
          tenantId,
          archivedAt: null,
          visibility: 'PUBLIC',
          status: { in: ['ACTIVE', 'APPROVED'] },
          gastroProfile: { status: 'ACTIVE' },
          ...(term ? { displayTitle: { contains: term, mode: 'insensitive' } } : {}),
        },
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          displayTitle: true,
          type: true,
          value: true,
          status: true,
          validityMode: true,
          validTo: true,
          discountDate: true,
        },
      });
      return rows
        .filter(
          (row) =>
            !isGastroDiscountDateExpired({
              status: row.status,
              validityMode: row.validityMode,
              validTo: row.validTo,
              discountDate: row.discountDate,
            }),
        )
        .slice(0, 20)
        .map((row) => ({
          id: row.id,
          title: row.displayTitle?.trim() || 'Descuento',
          benefit: formatCouponVisualBenefit(row.type, row.value),
        }));
    }

    if (contentType === 'ACTIVITY_COUPON') {
      const rows = await this.prisma.activityCoupon.findMany({
        where: {
          tenantId,
          archivedAt: null,
          status: { in: ['ACTIVE', 'APPROVED'] },
          event: { category: 'excursion', deletedAt: null },
          ...(term ? { title: { contains: term, mode: 'insensitive' } } : {}),
        },
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          type: true,
          value: true,
          status: true,
          validityMode: true,
          validTo: true,
          couponDate: true,
        },
      });
      return rows
        .filter(
          (row) =>
            !isGastroDiscountDateExpired({
              status: row.status,
              validityMode: row.validityMode,
              validTo: row.validTo,
              discountDate: row.couponDate,
            }),
        )
        .slice(0, 20)
        .map((row) => ({
          id: row.id,
          title: row.title,
          benefit: formatCouponVisualBenefit(row.type, row.value),
        }));
    }

    const events = await this.prisma.event.findMany({
      where: {
        tenantId,
        deletedAt: null,
        status: 'APPROVED',
        category: contentType === 'EXCURSION' ? 'excursion' : { not: 'excursion' },
        ...(term ? { title: { contains: term, mode: 'insensitive' } } : {}),
      },
      take,
      orderBy: { createdAt: 'desc' },
      select: { id: true, title: true, category: true, startAt: true },
    });
    return events
      .filter((event) => isEventPubliclyVisible(event.startAt, event.category))
      .slice(0, 20)
      .map((event) => ({ id: event.id, title: event.title, benefit: null }));
  }

  private notEligible(): never {
    throw new BadRequestException({
      code: ErrorCode.CAMPAIGN_CONTENT_NOT_ELIGIBLE,
      message: 'Content is not eligible to promote',
    });
  }
}
