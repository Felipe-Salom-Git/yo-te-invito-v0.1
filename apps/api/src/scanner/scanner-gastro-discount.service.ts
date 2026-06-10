import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  parseGastroDiscountQrPayload,
  type ValidateGastroDiscountBody,
  type ValidateGastroDiscountResponse,
  type GastroDiscountScanStatus,
  ErrorCode,
} from '@yo-te-invito/shared';
import { PrismaService } from '../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../common/profiles-authorization.service';
import { ScannerAccountsService } from '../modules/scanner-accounts/scanner-accounts.service';
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

@Injectable()
export class ScannerGastroDiscountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
    private readonly scannerAccounts: ScannerAccountsService,
  ) {}

  private response(
    status: GastroDiscountScanStatus,
    title: string,
    message: string,
    discount?: ValidateGastroDiscountResponse['discount'],
  ): ValidateGastroDiscountResponse {
    return { status, title, message, ...(discount ? { discount } : {}) };
  }

  private isExpired(d: {
    status: string;
    discountDate: Date | null;
    validFrom: Date | null;
    validTo: Date | null;
  }): boolean {
    if (d.status === 'EXPIRED') return true;
    const now = new Date();
    if (d.discountDate && d.discountDate < now) return true;
    if (d.validTo && d.validTo < now) return true;
    if (d.validFrom && d.validFrom > now) return true;
    return false;
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
        'El código no corresponde a un descuento gastronómico válido.',
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
        'El descuento no pertenece a este tenant.',
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
        'Descuento no encontrado',
        'No existe un descuento activo con este código.',
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
        'Descuento no válido',
        'Este código no corresponde a un descuento gastronómico.',
      );
    }

    if (this.isExpired(discount)) {
      return this.response(
        'EXPIRED',
        'Descuento vencido',
        'La fecha de vigencia del descuento ya pasó.',
        discountInfo,
      );
    }

    if (discount.status !== 'ACTIVE') {
      const inactiveMsg =
        discount.status === 'CANCELLED' || discount.status === 'REJECTED'
          ? 'El descuento fue cancelado o rechazado.'
          : discount.status === 'PENDING_REVIEW' || discount.status === 'COMMISSION_NEGOTIATION'
            ? 'El descuento aún no está habilitado para uso.'
            : 'El descuento no está activo.';
      return this.response('INACTIVE', 'Descuento inactivo', inactiveMsg, discountInfo);
    }

    const claim = await this.prisma.gastroDiscountClaim.findFirst({
      where: { discountId, qrToken: token, tenantId },
    });

    if (claim) {
      const existing = await this.prisma.gastroDiscountValidation.findUnique({
        where: { claimId: claim.id },
      });
      if (existing) {
        return this.response(
          'ALREADY_USED',
          'Ya utilizado',
          'Este QR de descuento ya fue validado anteriormente.',
          discountInfo,
        );
      }

      try {
        await this.prisma.gastroDiscountValidation.create({
          data: {
            discountId: discount.id,
            claimId: claim.id,
            userId: claim.userId,
          },
        });
      } catch (err) {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          return this.response(
            'ALREADY_USED',
            'Ya utilizado',
            'Este QR de descuento ya fue validado anteriormente.',
            discountInfo,
          );
        }
        throw err;
      }

      return this.response(
        'VALID',
        'Descuento válido',
        `Descuento aplicado: ${valueLabel} en ${localName ?? 'local'}.`,
        discountInfo,
      );
    }

    const masterToken = discount.qrToken?.trim();
    if (!masterToken || masterToken !== token) {
      return this.response(
        'INVALID',
        'Token inválido',
        'El código QR no coincide con ningún descuento emitido.',
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
      'Descuento válido',
      `Referencia de local validada: ${valueLabel}.`,
      discountInfo,
    );
  }
}
