import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  ACTIVITY_COUPON_EVENT_CATEGORY,
  ErrorCode,
  Role,
  buildActivityCouponQrPayload,
  formatCouponVisualBenefit,
  isGastroDiscountValidToday,
  isManualShortCodeInput,
  normalizeManualShortCode,
  parseActivityCouponQrPayload,
  type GastroWeekday,
  type ValidateActivityCouponBody,
  type ValidateActivityCouponResponse,
  type ActivityCouponScanStatus,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
import { AuditService } from '../modules/audit/audit.service';

const REDEEMABLE = new Set(['ACTIVE', 'APPROVED']);

@Injectable()
export class ScannerActivityCouponService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scannerAccounts: ScannerAccountsService,
    private readonly audit: AuditService,
  ) {}

  private response(
    status: ActivityCouponScanStatus,
    title: string,
    message: string,
    coupon?: ValidateActivityCouponResponse['coupon'],
  ): ValidateActivityCouponResponse {
    return { status, title, message, ...(coupon ? { coupon } : {}) };
  }

  async validate(
    tenantId: string,
    userId: string,
    userRole: string,
    body: ValidateActivityCouponBody,
  ): Promise<ValidateActivityCouponResponse> {
    if (userRole !== Role.SCANNER && userRole !== Role.ADMIN) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Scanner role required',
      });
    }

    let qrPayloadInput = body.qrPayload.trim();
    if (isManualShortCodeInput(qrPayloadInput)) {
      const code = normalizeManualShortCode(qrPayloadInput);
      const claimByCode = await this.prisma.activityCouponClaim.findUnique({
        where: { shortCode: code },
        select: { couponId: true, qrToken: true, tenantId: true },
      });
      // Namespace: Activity table only. Never gastroDiscountClaim.findUnique / OR-first.
      if (!claimByCode || claimByCode.tenantId !== tenantId) {
        return this.response(
          'INVALID',
          'Código inválido',
          'No encontramos un cupón de Actividades asociado a este código.',
        );
      }
      if (userRole === Role.SCANNER) {
        await this.scannerAccounts.assertScannerCanAccessActivityCoupon(
          tenantId,
          userId,
          claimByCode.couponId,
        );
      }
      qrPayloadInput = buildActivityCouponQrPayload(claimByCode.couponId, claimByCode.qrToken);
    }

    const parsed = parseActivityCouponQrPayload(qrPayloadInput);
    if (!parsed) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón de Actividades asociado a este código.',
      );
    }

    if (userRole === Role.SCANNER) {
      await this.scannerAccounts.assertScannerCanAccessActivityCoupon(
        tenantId,
        userId,
        parsed.couponId,
      );
    }

    const coupon = await this.prisma.activityCoupon.findFirst({
      where: { id: parsed.couponId, tenantId },
      include: {
        event: { select: { title: true, category: true, deletedAt: true } },
      },
    });
    if (!coupon || coupon.event.deletedAt || coupon.archivedAt) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón de Actividades asociado a este código.',
      );
    }
    if ((coupon.event.category ?? '').toLowerCase() !== ACTIVITY_COUPON_EVENT_CATEGORY) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón de Actividades asociado a este código.',
      );
    }

    const info = {
      id: coupon.id,
      title: coupon.title,
      valueLabel: formatCouponVisualBenefit(coupon.type, coupon.value),
      activityName: coupon.event.title,
    };

    const claim = await this.prisma.activityCouponClaim.findFirst({
      where: { couponId: coupon.id, qrToken: parsed.token, tenantId },
    });
    if (!claim) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón de Actividades asociado a este código.',
        info,
      );
    }

    if (claim.status === 'USED' || claim.usedAt) {
      return this.response(
        'ALREADY_USED',
        'Cupón ya utilizado',
        'Este QR ya fue escaneado anteriormente.',
        info,
      );
    }
    if (claim.status !== 'ACTIVE') {
      return this.response(
        'INACTIVE',
        'Cupón inactivo',
        claim.status === 'EXPIRED'
          ? 'La vigencia de este cupón ya finalizó.'
          : 'Este cupón no está disponible para uso.',
        info,
      );
    }

    const today = isGastroDiscountValidToday({
      validityMode: coupon.validityMode,
      validWeekday: coupon.validWeekday as GastroWeekday | null,
      validFrom: coupon.validFrom,
      validTo: coupon.validTo,
      discountDate: coupon.couponDate,
      status: coupon.status,
    });
    if (!today.valid) {
      if (today.reason === 'EXPIRED') {
        return this.response('EXPIRED', 'Cupón vencido', 'La vigencia ya finalizó.', info);
      }
      if (today.reason === 'NOT_VALID_TODAY') {
        return this.response(
          'NOT_VALID_TODAY',
          'No válido hoy',
          'Este cupón no corresponde al día de hoy.',
          info,
        );
      }
      return this.response('INACTIVE', 'Cupón inactivo', 'El cupón no está activo.', info);
    }
    if (!REDEEMABLE.has(coupon.status)) {
      return this.response('INACTIVE', 'Cupón inactivo', 'El cupón no está publicado.', info);
    }

    const now = new Date();
    const redeemResult = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.activityCouponClaim.updateMany({
        where: { id: claim.id, status: 'ACTIVE', usedAt: null },
        data: { status: 'USED', usedAt: now },
      });
      if (updated.count === 0) return 'ALREADY_USED' as const;
      try {
        await tx.activityCouponValidation.create({
          data: {
            couponId: coupon.id,
            claimId: claim.id,
            scannerUserId: userId,
            result: 'VALID',
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return 'ALREADY_USED' as const;
        }
        throw err;
      }
      return 'VALID' as const;
    });

    if (redeemResult === 'ALREADY_USED') {
      return this.response(
        'ALREADY_USED',
        'Cupón ya utilizado',
        'Este QR ya fue escaneado anteriormente.',
        info,
      );
    }

    await this.audit.logAction({
      tenantId,
      actorId: userId,
      actorRole: userRole,
      action: 'ACTIVITY_COUPON_REDEEMED',
      entityType: 'ActivityCouponClaim',
      entityId: claim.id,
      metadata: { couponId: coupon.id },
    });

    return this.response('VALID', 'Cupón válido', 'Beneficio aplicado correctamente.', info);
  }
}
