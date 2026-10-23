import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfilesAuthorizationService } from '../../common/profiles-authorization.service';
import {
  ErrorCode,
  GASTRO_COURTESY_EDIT_BLOCKED_MESSAGE,
  isGenericDiscountEditBlocked,
} from '@yo-te-invito/shared';

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

  /**
   * Legacy event-scoped discount routes: require ownership of the GastroProfile
   * whose publicEventId is this event (not merely any gastro membership).
   */
  private async assertGastroEvent(
    tenantId: string,
    userId: string,
    userRole: string,
    eventId: string,
  ): Promise<{ eventId: string; gastroProfileId: string | null }> {
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

    const profile = await this.prisma.gastroProfile.findFirst({
      where: { tenantId, publicEventId: eventId },
      select: { id: true },
    });

    if (userRole === 'ADMIN') {
      return { eventId, gastroProfileId: profile?.id ?? null };
    }

    if (!profile) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para gestionar descuentos de este local',
      });
    }

    const canManage = await this.profiles.canManageGastroProfile(
      tenantId,
      userId,
      profile.id,
    );
    if (!canManage) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para gestionar descuentos de este local',
      });
    }

    return { eventId, gastroProfileId: profile.id };
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
    const scope = await this.assertGastroEvent(tenantId, userId, userRole, eventId);
    if (input.type === 'PERCENT' && input.value > 100) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Percent value cannot exceed 100',
      });
    }
    if (!scope.gastroProfileId) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'El evento no tiene un local gastronómico vinculado',
      });
    }
    const created = await this.prisma.gastroDiscount.create({
      data: {
        tenantId,
        eventId,
        gastroProfileId: scope.gastroProfileId,
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
    // G8.2 defense in depth: this legacy handler is shadowed by the portal PATCH route
    // (same path, declared first), but it must never be able to mutate a courtesy.
    if (isGenericDiscountEditBlocked(existing.visibility)) {
      throw new BadRequestException({
        code: ErrorCode.GASTRO_COURTESY_IMMUTABLE,
        message: GASTRO_COURTESY_EDIT_BLOCKED_MESSAGE,
      });
    }
    const scope = await this.assertGastroEvent(tenantId, userId, userRole, existing.eventId);
    if (
      userRole !== 'ADMIN' &&
      existing.gastroProfileId &&
      scope.gastroProfileId &&
      existing.gastroProfileId !== scope.gastroProfileId
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para gestionar este descuento',
      });
    }

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

  private async ownedGastroProfileIds(
    tenantId: string,
    userId: string,
  ): Promise<string[]> {
    const memberships = await this.prisma.userGastroMembership.findMany({
      where: {
        tenantId,
        userId,
        status: 'ACTIVE',
        profile: { status: { in: ['DRAFT', 'PENDING', 'ACTIVE'] } },
      },
      select: { profileId: true },
    });
    return [...new Set(memberships.map((m) => m.profileId))];
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

    if (userRole === 'ADMIN') {
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

    const profileIds = await this.ownedGastroProfileIds(tenantId, userId);
    if (profileIds.length === 0) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'Gastro access required',
      });
    }

    const rows = await this.prisma.gastroDiscountValidation.findMany({
      where: {
        discount: {
          tenantId,
          gastroProfileId: { in: profileIds },
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
    const scope = await this.assertGastroEvent(tenantId, userId, userRole, d.eventId);
    if (
      userRole !== 'ADMIN' &&
      d.gastroProfileId &&
      scope.gastroProfileId &&
      d.gastroProfileId !== scope.gastroProfileId
    ) {
      throw new ForbiddenException({
        code: ErrorCode.FORBIDDEN,
        message: 'No tenés permiso para validar este descuento',
      });
    }
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
