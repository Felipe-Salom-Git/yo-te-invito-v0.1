import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  parseGastroDiscountQrPayload,
  type ValidateGastroDiscountBody,
  type ValidateGastroDiscountResponse,
  type GastroDiscountScanStatus,
  ErrorCode,
  isGastroDiscountExpired,
  isGastroDiscountNotYetActive,
  isGastroDiscountValidToday,
  getGastroWeekdayLabelEs,
  type GastroWeekday,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../common/profiles-authorization.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
import { AuditService } from '../modules/audit/audit.service';
import { Role } from '@yo-te-invito/shared';

function formatValueLabel(type: string, value: number): string {
  if (type === 'PERCENT') return `${value}%`;
  return `$${value}`;
}

function discountTitle(row: {
  displayTitle: string | null;
  code: string;
}): string {
  return row.displayTitle?.trim() || row.code;
}

/** Parent discount statuses that allow claim-based redemption (aligned with public claim flow). */
const REDEEMABLE_PARENT_STATUSES = new Set(['ACTIVE', 'APPROVED']);

function isParentDiscountRedeemable(status: string): boolean {
  return REDEEMABLE_PARENT_STATUSES.has(status);
}

function parentDiscountInactiveMessage(status: string): string {
  if (status === 'CANCELLED' || status === 'REJECTED') {
    return 'El descuento fue cancelado o rechazado.';
  }
  if (status === 'PENDING_REVIEW' || status === 'COMMISSION_NEGOTIATION') {
    return 'El descuento aún no está habilitado para uso.';
  }
  if (status === 'EXPIRED') {
    return 'La fecha de validez de este descuento ya finalizó.';
  }
  return 'El descuento no está activo.';
}

function resolveExpiryDate(row: {
  expiresAt?: Date | null;
  validTo?: Date | null;
  discountDate?: Date | null;
}): Date | null {
  return row.expiresAt ?? row.validTo ?? row.discountDate ?? null;
}

@Injectable()
export class ScannerGastroDiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly scannerAccounts: ScannerAccountsService,
    private readonly audit: AuditService,
  ) {}

  private response(
    status: GastroDiscountScanStatus,
    title: string,
    message: string,
    discount?: ValidateGastroDiscountResponse['discount'],
  ): ValidateGastroDiscountResponse {
    return { status, title, message, ...(discount ? { discount } : {}) };
  }

  private isClaimUsed(claim: {
    status: string;
    usedAt: Date | null;
  }): boolean {
    return claim.status === 'USED' || !!claim.usedAt;
  }

  private isClaimExpired(claim: {
    status: string;
    expiresAt: Date | null;
    usedAt: Date | null;
    discount?: {
      validTo: Date | null;
      discountDate: Date | null;
    } | null;
  }): boolean {
    if (claim.status === 'EXPIRED' || claim.status === 'CANCELLED') return true;
    if (this.isClaimUsed(claim)) return false;
    const expiresAt = resolveExpiryDate({
      expiresAt: claim.expiresAt,
      validTo: claim.discount?.validTo ?? null,
      discountDate: claim.discount?.discountDate ?? null,
    });
    return isGastroDiscountExpired(expiresAt);
  }

  private isDiscountExpired(d: {
    status: string;
    validityMode?: string | null;
    validWeekday?: string | null;
    discountDate: Date | null;
    validFrom: Date | null;
    validTo: Date | null;
  }): boolean {
    if (d.status === 'EXPIRED') return true;
    const check = isGastroDiscountValidToday({
      validityMode: (d.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
      validWeekday: d.validWeekday as GastroWeekday | null,
      validFrom: d.validFrom,
      validTo: d.validTo,
      discountDate: d.discountDate,
      status: d.status === 'EXPIRED' ? 'EXPIRED' : 'ACTIVE',
    });
    return check.reason === 'EXPIRED';
  }

  private isDiscountNotYetActive(d: {
    validityMode?: string | null;
    validWeekday?: string | null;
    validFrom: Date | null;
    validTo: Date | null;
    discountDate: Date | null;
    status: string;
  }): boolean {
    const check = isGastroDiscountValidToday({
      validityMode: (d.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
      validWeekday: d.validWeekday as GastroWeekday | null,
      validFrom: d.validFrom,
      validTo: d.validTo,
      discountDate: d.discountDate,
      status: 'ACTIVE',
    });
    if (check.reason === 'INACTIVE' && d.validFrom) {
      return isGastroDiscountNotYetActive(d.validFrom);
    }
    return false;
  }

  private discountNotValidTodayResponse(
    validWeekday: string | null | undefined,
    discountInfo: ValidateGastroDiscountResponse['discount'],
  ): ValidateGastroDiscountResponse {
    const label = validWeekday
      ? getGastroWeekdayLabelEs(validWeekday as GastroWeekday)
      : 'ese día';
    return this.response(
      'NOT_VALID_TODAY',
      'No válido hoy',
      `Este cupón solo es válido los ${label}.`,
      discountInfo,
    );
  }

  private assertDiscountValidToday(
    discount: {
      validityMode?: string | null;
      validWeekday?: string | null;
      validFrom: Date | null;
      validTo: Date | null;
      discountDate: Date | null;
      status: string;
    },
    discountInfo: ValidateGastroDiscountResponse['discount'],
  ): ValidateGastroDiscountResponse | null {
    const check = isGastroDiscountValidToday({
      validityMode: (discount.validityMode ?? 'DATE_RANGE') as 'DATE_RANGE' | 'WEEKLY_RECURRING',
      validWeekday: discount.validWeekday as GastroWeekday | null,
      validFrom: discount.validFrom,
      validTo: discount.validTo,
      discountDate: discount.discountDate,
      status: discount.status,
    });
    if (check.valid) return null;
    if (check.reason === 'NOT_VALID_TODAY') {
      return this.discountNotValidTodayResponse(discount.validWeekday, discountInfo);
    }
    if (check.reason === 'EXPIRED') {
      return this.response(
        'EXPIRED',
        'Cupón vencido',
        'La fecha de validez de este descuento ya finalizó.',
        discountInfo,
      );
    }
    if (check.reason === 'INACTIVE') {
      if (isGastroDiscountNotYetActive(discount.validFrom)) {
        return this.response(
          'INACTIVE',
          'Descuento inactivo',
          'El descuento aún no está habilitado para uso.',
          discountInfo,
        );
      }
    }
    return null;
  }

  private async assertCanScan(
    tenantId: string,
    userId: string,
    userRole: string,
  ): Promise<void> {
    if (userRole === 'ADMIN' || userRole === 'SCANNER') return;
    if (userRole === 'GASTRO_OWNER') {
      const has = await this.profiles.hasGastroAccess(tenantId, userId);
      if (!has) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Gastro access required',
        });
      }
      return;
    }
    throw new ForbiddenException({
      code: ErrorCode.FORBIDDEN,
      message: 'Scanner or gastro role required',
    });
  }

  async validate(
    tenantId: string,
    userId: string,
    userRole: string,
    body: ValidateGastroDiscountBody,
  ): Promise<ValidateGastroDiscountResponse> {
    await this.assertCanScan(tenantId, userId, userRole);

    const parsed = parseGastroDiscountQrPayload(body.qrPayload);
    if (!parsed) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón asociado a este código.',
      );
    }

    const { discountId, token } = parsed;

    if (userRole === Role.SCANNER) {
      await this.scannerAccounts.assertScannerCanAccessGastroDiscount(
        tenantId,
        userId,
        discountId,
      );
    }

    if (parsed.version === 'legacy' && parsed.tenantId && parsed.tenantId !== tenantId) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón asociado a este código.',
      );
    }

    const discount = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: {
        gastroProfile: { select: { displayName: true } },
        event: { select: { category: true, deletedAt: true } },
      },
    });

    if (!discount || discount.event.deletedAt) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón asociado a este código.',
      );
    }

    const localName = discount.gastroProfile?.displayName ?? undefined;
    const title = discountTitle(discount);
    const valueLabel = formatValueLabel(discount.type, discount.value);
    const discountInfo = {
      id: discount.id,
      title,
      valueLabel,
      localName,
    };

    if ((discount.event.category ?? '').toLowerCase() !== 'gastro') {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón asociado a este código.',
      );
    }

    const claim = await this.prisma.gastroDiscountClaim.findFirst({
      where: { discountId, qrToken: token, tenantId },
      include: {
        discount: { select: { validTo: true, discountDate: true } },
      },
    });

    if (claim) {
      if (this.isClaimUsed(claim)) {
        return this.response(
          'ALREADY_USED',
          'Cupón ya utilizado',
          'Este QR ya fue escaneado anteriormente.',
          discountInfo,
        );
      }

      if (claim.status !== 'ACTIVE') {
        const inactiveMsg =
          claim.status === 'CANCELLED'
            ? 'Este cupón fue cancelado.'
            : claim.status === 'EXPIRED'
              ? 'La fecha de validez de este cupón ya finalizó.'
              : 'Este cupón no está disponible para uso.';
        return this.response('INACTIVE', 'Cupón inactivo', inactiveMsg, discountInfo);
      }

      if (this.isClaimExpired(claim)) {
        return this.response(
          'EXPIRED',
          'Cupón vencido',
          'La fecha de validez de este descuento ya finalizó.',
          discountInfo,
        );
      }

      const validityBlock = this.assertDiscountValidToday(discount, discountInfo);
      if (validityBlock) return validityBlock;

      if (!isParentDiscountRedeemable(discount.status)) {
        return this.response(
          'INACTIVE',
          'Descuento inactivo',
          parentDiscountInactiveMessage(discount.status),
          discountInfo,
        );
      }

      const now = new Date();
      const redeemResult = await this.prisma.$transaction(async (tx) => {
        const fresh = await tx.gastroDiscountClaim.findFirst({
          where: { id: claim.id, tenantId },
        });
        if (!fresh || fresh.status !== 'ACTIVE' || fresh.usedAt) {
          return 'ALREADY_USED' as const;
        }

        const updated = await tx.gastroDiscountClaim.updateMany({
          where: { id: claim.id, status: 'ACTIVE', usedAt: null },
          data: { status: 'USED', usedAt: now },
        });
        if (updated.count === 0) {
          return 'ALREADY_USED' as const;
        }

        try {
          await tx.gastroDiscountValidation.create({
            data: {
              discountId: discount.id,
              claimId: claim.id,
              userId: fresh.userId,
            },
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
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
          discountInfo,
        );
      }

      await this.audit.logAction({
        tenantId,
        actorId: userId,
        actorRole: userRole,
        action: 'GASTRO_DISCOUNT_REDEEMED',
        entityType: 'GastroDiscountClaim',
        entityId: claim.id,
        metadata: { discountId: discount.id },
      });

      return this.response(
        'VALID',
        'Cupón válido',
        'Beneficio aplicado correctamente.',
        discountInfo,
      );
    }

    const validityBlock = this.assertDiscountValidToday(discount, discountInfo);
    if (validityBlock) return validityBlock;

    if (!isParentDiscountRedeemable(discount.status)) {
      const inactiveMsg = parentDiscountInactiveMessage(discount.status);
      return this.response('INACTIVE', 'Descuento inactivo', inactiveMsg, discountInfo);
    }

    const masterToken = discount.qrToken?.trim();
    if (!masterToken || masterToken !== token) {
      return this.response(
        'INVALID',
        'QR inválido',
        'No encontramos un cupón asociado a este código.',
      );
    }

    await this.prisma.gastroDiscountValidation.create({
      data: {
        discountId: discount.id,
        userId: null,
      },
    });

    return this.response(
      'VALID',
      'Cupón válido',
      'Beneficio aplicado correctamente.',
      discountInfo,
    );
  }
}
