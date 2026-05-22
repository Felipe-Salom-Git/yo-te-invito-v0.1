import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { buildGastroDiscountQrPayload, ErrorCode } from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

const PUBLIC_STATUSES = ['APPROVED', 'ACTIVE'] as const;

function readUrls(json: unknown): string[] {
  if (!json) return [];
  if (Array.isArray(json)) return json.filter((u): u is string => typeof u === 'string');
  if (typeof json === 'string') {
    try {
      const parsed = JSON.parse(json) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((u): u is string => typeof u === 'string')
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapListRow(
  d: {
    id: string;
    displayTitle: string | null;
    summary: string | null;
    detail: string | null;
    displayImageUrls: unknown;
    discountDate: Date | null;
    type: string;
    value: number;
    gastroProfile: {
      id: string;
      displayName: string;
      city: string | null;
      publicEventId: string | null;
    } | null;
  },
) {
  const imgs = readUrls(d.displayImageUrls);
  return {
    id: d.id,
    title: d.displayTitle,
    summary: d.summary ?? null,
    detail: d.detail,
    headerImageUrl: imgs[0] ?? null,
    discountDate: d.discountDate?.toISOString() ?? null,
    type: d.type as 'PERCENT' | 'FIXED',
    value: d.value,
    locationId: d.gastroProfile!.id,
    locationName: d.gastroProfile!.displayName,
    locationCity: d.gastroProfile!.city,
    locationSlug: d.gastroProfile!.publicEventId,
  };
}

@Injectable()
export class PublicGastroDiscountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  private discountsWhere(tenantId: string, subcategorySlug?: string) {
    const now = new Date();
    return {
      tenantId,
      status: { in: [...PUBLIC_STATUSES] },
      gastroProfile: {
        status: 'ACTIVE' as const,
        ...(subcategorySlug ? { subcategory: { slug: subcategorySlug } } : {}),
      },
      OR: [{ discountDate: null }, { discountDate: { gte: now } }],
    };
  }

  async countPublished(tenantId: string) {
    return this.prisma.gastroDiscount.count({
      where: this.discountsWhere(tenantId),
    });
  }

  async list(tenantId: string, opts?: { subcategorySlug?: string; limit?: number }) {
    const rows = await this.prisma.gastroDiscount.findMany({
      where: this.discountsWhere(tenantId, opts?.subcategorySlug),
      orderBy: [{ discountDate: 'asc' }, { createdAt: 'desc' }],
      take: opts?.limit ?? 50,
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            city: true,
            publicEventId: true,
          },
        },
      },
    });
    return {
      data: rows.filter((r) => r.gastroProfile).map((r) => mapListRow(r)),
    };
  }

  async getById(tenantId: string, discountId: string) {
    const row = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, ...this.discountsWhere(tenantId) },
      include: {
        gastroProfile: {
          select: {
            id: true,
            displayName: true,
            city: true,
            publicEventId: true,
          },
        },
      },
    });
    if (!row?.gastroProfile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    const base = mapListRow(row);
    const imgs = readUrls(row.displayImageUrls);
    return {
      ...base,
      imageUrls: imgs,
      eventId: row.eventId,
      claimable:
        !!row.qrToken &&
        PUBLIC_STATUSES.includes(row.status as (typeof PUBLIC_STATUSES)[number]),
    };
  }

  private buildQrPayload(discountId: string, qrToken: string) {
    return buildGastroDiscountQrPayload(discountId, qrToken);
  }

  private claimEmailHtml(opts: {
    title: string;
    locationName: string;
    qrPayload: string;
    viewUrl: string;
  }) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(opts.qrPayload)}`;
    return `<motion style="font-family:sans-serif;max-width:480px;margin:0 auto;">
<h2 style="margin:0 0 8px;">Tu descuento en ${opts.locationName}</h2>
<p style="color:#444;">${opts.title}</p>
<p style="color:#666;font-size:14px;">Presentá este código QR en el local. Es gratuito — no requiere compra previa.</p>
<p style="text-align:center;margin:24px 0;"><img src="${qrUrl}" alt="Código QR" width="280" height="280" style="border:1px solid #eee;border-radius:8px;" /></p>
<p style="font-size:13px;color:#666;">También podés ver tu QR en: <a href="${opts.viewUrl}">abrir en la web</a></p>
<p style="font-size:12px;color:#999;">Yo Te Invito</p>
</motion>`.replace(/motion/g, 'div');
  }

  async claim(
    tenantId: string,
    discountId: string,
    email: string,
    userId?: string | null,
    webBaseUrl?: string,
  ) {
    const normalizedEmail = email.trim().toLowerCase();
    const discount = await this.prisma.gastroDiscount.findFirst({
      where: {
        id: discountId,
        tenantId,
        status: { in: [...PUBLIC_STATUSES] },
      },
      include: {
        gastroProfile: { select: { id: true, displayName: true, status: true } },
      },
    });
    if (!discount?.gastroProfile || discount.gastroProfile.status !== 'ACTIVE') {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    if (!discount.qrToken) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Este descuento aún no está disponible para reclamar',
      });
    }

    const existing = await this.prisma.gastroDiscountClaim.findUnique({
      where: {
        discountId_email: { discountId, email: normalizedEmail },
      },
    });

    const baseUrl = (webBaseUrl ?? process.env.WEB_BASE_URL ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const title = discount.displayTitle?.trim() || 'Descuento';
    const locationName = discount.gastroProfile.displayName;

    const finish = async (claim: { id: string; accessToken: string; qrToken: string }) => {
      const qrPayload = this.buildQrPayload(discount.id, claim.qrToken);
      const viewUrl = `${baseUrl}/descuentos/reclamo/${claim.id}?token=${claim.accessToken}&tenantId=${encodeURIComponent(tenantId)}`;
      const emailSent = await this.sendClaimEmail(
        normalizedEmail,
        title,
        locationName,
        qrPayload,
        viewUrl,
        claim.id,
      );
      return {
        claimId: claim.id,
        accessToken: claim.accessToken,
        email: normalizedEmail,
        emailSent,
        qrPayload,
        discountTitle: discount.displayTitle,
        locationName,
      };
    };

    if (existing) {
      return finish(existing);
    }

    const claim = await this.prisma.gastroDiscountClaim.create({
      data: {
        tenantId,
        discountId,
        email: normalizedEmail,
        userId: userId ?? null,
        qrToken: randomBytes(24).toString('hex'),
        accessToken: randomBytes(32).toString('hex'),
      },
    });

    return finish(claim);
  }

  private async sendClaimEmail(
    to: string,
    title: string,
    locationName: string,
    qrPayload: string,
    viewUrl: string,
    claimId: string,
  ): Promise<boolean> {
    let emailSentAt: Date | null = null;
    let emailSendError: string | null = null;
    let sent = false;

    if (!this.email.isConfigured()) {
      emailSendError = 'Email service not configured';
    } else {
      sent = await this.email.send({
        to,
        subject: `Tu descuento — ${locationName}`,
        html: this.claimEmailHtml({ title, locationName, qrPayload, viewUrl }),
        text: `Tu descuento en ${locationName}: ${title}\n\nQR: ${qrPayload}\n\nVer online: ${viewUrl}`,
      });
      if (sent) emailSentAt = new Date();
      else emailSendError = 'Failed to send email';
    }

    await this.prisma.gastroDiscountClaim.update({
      where: { id: claimId },
      data: { emailSentAt, emailSendError },
    });

    return sent;
  }

  async getClaimView(tenantId: string, claimId: string, accessToken: string) {
    const claim = await this.prisma.gastroDiscountClaim.findFirst({
      where: { id: claimId, tenantId, accessToken },
      include: {
        discount: {
          include: {
            gastroProfile: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    const profile = claim?.discount.gastroProfile;
    if (!claim || !profile) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Claim not found',
      });
    }
    const d = claim.discount;
    return {
      claimId: claim.id,
      email: claim.email,
      qrPayload: this.buildQrPayload(d.id, claim.qrToken),
      discountTitle: d.displayTitle,
      discountSummary: d.summary,
      locationName: profile.displayName,
      locationId: profile.id,
      discountDate: d.discountDate?.toISOString() ?? null,
      emailSentAt: claim.emailSentAt?.toISOString() ?? null,
    };
  }
}
