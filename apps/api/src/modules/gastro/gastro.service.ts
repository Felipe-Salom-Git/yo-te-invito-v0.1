import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import { ErrorCode } from '@yo-te-invito/shared';

type DiscountInput = {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  validFrom?: string;
  validTo?: string;
};

@Injectable()
export class GastroService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: ProfilesAuthorizationService,
  ) {}

  private async assertGastroEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ) {
    if (userRole !== 'ADMIN') {
      const has = await this.profiles.hasGastroAccess(tenantId, userId);
      if (!has) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Gastro access required',
        });
      }
    }
    const event = await this.prisma.event.findFirst({
      where: { id: eventId, tenantId, deletedAt: null },
    });
    if (!event) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Event not found',
      });
    }
    const cat = (event.category ?? '').toLowerCase();
    if (cat !== 'gastro') {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro discounts apply only to gastro-category events',
      });
    }
    return event;
  }

  private mapDiscount(d: {
    id: string;
    eventId: string;
    code: string;
    type: string;
    value: number;
    validFrom: Date | null;
    validTo: Date | null;
    status: string;
    createdAt: Date;
  }) {
    return {
      id: d.id,
      eventId: d.eventId,
      code: d.code,
      type: d.type as 'PERCENT' | 'FIXED',
      value: d.value,
      validFrom: d.validFrom?.toISOString() ?? null,
      validTo: d.validTo?.toISOString() ?? null,
      status: d.status,
      createdAt: d.createdAt.toISOString(),
    };
  }

  async listContent(_eventId: string) {
    return [];
  }

  async createContent(_eventId: string, _input: unknown) {
    return { id: 'stub', eventId: _eventId };
  }

  async updateContent(_id: string, _patch: unknown) {
    return { id: _id };
  }

  async listDiscounts(tenantId: string, userId: string, userRole: string, eventId: string) {
    await this.assertGastroEvent(tenantId, userId, userRole, eventId);
    const rows = await this.prisma.gastroDiscount.findMany({
      where: { tenantId, eventId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.mapDiscount(r));
  }

  async createDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
    input: DiscountInput,
  ) {
    await this.assertGastroEvent(tenantId, userId, userRole, eventId);
    if (input.type === 'PERCENT' && input.value > 100) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Percent value cannot exceed 100',
      });
    }
    const membership = await this.prisma.userGastroMembership.findFirst({
      where: { tenantId, userId, status: 'ACTIVE', profile: { status: 'ACTIVE' } },
    });
    const created = await this.prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId,
        gastroProfileId: membership?.profileId ?? null,
        code: input.code.trim(),
        type: input.type,
        value: input.value,
        validFrom: input.validFrom ? new Date(input.validFrom) : null,
        validTo: input.validTo ? new Date(input.validTo) : null,
        status: 'PENDING_REVIEW',
      },
    });
    return this.mapDiscount(created);
  }

  async updateDiscount(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    patch: Partial<{
      status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PENDING_REVIEW';
      validFrom: string | null;
      validTo: string | null;
      value: number;
    }>,
  ) {
    const existing = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
      include: { event: true },
    });
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    await this.assertGastroEvent(tenantId, userId, userRole, existing.eventId);

    const updated = await this.prisma.gastroDiscount.update({
      where: { id: discountId },
      data: {
        ...(patch.status ? { status: patch.status } : {}),
        ...(patch.value !== undefined ? { value: patch.value } : {}),
        ...(patch.validFrom !== undefined
          ? { validFrom: patch.validFrom ? new Date(patch.validFrom) : null }
          : {}),
        ...(patch.validTo !== undefined
          ? { validTo: patch.validTo ? new Date(patch.validTo) : null }
          : {}),
      },
    });
    return this.mapDiscount(updated);
  }

  async listValidations(tenantId: string, userId: string, userRole: string, discountId?: string) {
    if (discountId) {
      const d = await this.prisma.gastroDiscount.findFirst({
        where: { id: discountId, tenantId },
      });
      if (!d) return [];
      await this.assertGastroEvent(tenantId, userId, userRole, d.eventId);
      const rows = await this.prisma.gastroDiscountValidation.findMany({
        where: { discountId },
        orderBy: { validatedAt: 'desc' },
        take: 500,
      });
      return rows.map((v) => ({
        id: v.id,
        discountId: v.discountId,
        validatedAt: v.validatedAt.toISOString(),
        userId: v.userId,
        orderId: v.orderId,
      }));
    }

    if (userRole !== 'ADMIN') {
      const has = await this.profiles.hasGastroAccess(tenantId, userId);
      if (!has) {
        throw new ForbiddenException({
          code: ErrorCode.FORBIDDEN,
          message: 'Gastro access required',
        });
      }
    }

    const rows = await this.prisma.gastroDiscountValidation.findMany({
      where: {
        discount: {
          tenantId,
          event: { deletedAt: null },
        },
      },
      include: {
        discount: { include: { event: true } },
      },
      orderBy: { validatedAt: 'desc' },
      take: 500,
    });
    return rows
      .filter((v) => (v.discount.event.category ?? '').toLowerCase() === 'gastro')
      .map((v) => ({
        id: v.id,
        discountId: v.discountId,
        validatedAt: v.validatedAt.toISOString(),
        userId: v.userId,
        orderId: v.orderId,
      }));
  }

  async recordValidation(
    tenantId: string,
    userId: string,
    userRole: string,
    discountId: string,
    validatedUserId?: string,
    orderId?: string,
  ) {
    const d = await this.prisma.gastroDiscount.findFirst({
      where: { id: discountId, tenantId },
    });
    if (!d) {
      throw new NotFoundException({
        code: ErrorCode.NOT_FOUND,
        message: 'Discount not found',
      });
    }
    await this.assertGastroEvent(tenantId, userId, userRole, d.eventId);
    if (d.status !== 'ACTIVE') {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Discount is not active',
      });
    }
    const v = await this.prisma.gastroDiscountValidation.create({
      data: {
        discountId,
        userId: validatedUserId ?? null,
        orderId: orderId ?? null,
      },
    });
    return {
      id: v.id,
      discountId: v.discountId,
      validatedAt: v.validatedAt.toISOString(),
      userId: v.userId,
      orderId: v.orderId,
    };
  }
}
